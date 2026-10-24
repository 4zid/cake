/* Cuánto Cobro · servidor de licencias.
   - La app (/) solo se entrega a dispositivos activados con un código válido; al resto se le muestra
     la landing de venta (landing.html) con el precio actual.
   - /activar: página para cargar el código que llega por mail con la compra.
   - /admin: página para crear, revocar y liberar códigos (protegida con ADMIN_TOKEN).
   - /comprar: cobra con Mercado Pago (Checkout Pro). Con el pago aprobado se crea el código solo
     y se muestra en /gracias; los reembolsos y contracargos lo revocan.
   - Garantía: dentro de los días configurados, la compradora pide la devolución desde Ajustes y se
     reembolsa sola en Mercado Pago (el código queda revocado).
   - Medición: los pasos de la venta se guardan en D1 (binding DB) y se ven en /admin → Estadísticas.
   - Mails: con MAILERLITE_API_KEY y MAILERLITE_GROUP_ID, cada compradora entra al grupo de MailerLite con su
     código y su link, y MailerLite le manda la secuencia (entrega, primeros pasos, opinión, próxima app).
   Los códigos viven en el KV "LICENSES" con la clave "code:COBRO-XXXX-XXXX-XXXX"
   (los primeros códigos, de cuando la app se llamaba Dulce Cuenta, empiezan con DULCE y siguen valiendo). */

const COOKIE = 'dc_lic';
const COOKIE_DAYS = 400;
const DEFAULT_DEVICES = 3;
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PREFIX = 'COBRO';
const PREFIXES = ['COBRO', 'DULCE'];
const PROTECTED = new Set(['/', '/index', '/index.html']);
const LANDING = new Set(['/landing', '/landing.html']);

export default {
  async fetch(request, env, ctx) {
    /* Una sola dirección oficial: www y workers.dev redirigen al dominio. Los avisos de Mercado Pago (/api/) no se redirigen. */
    const url = new URL(request.url);
    const home = env.CANONICAL_HOST;
    if (home && url.hostname !== home && !url.pathname.startsWith('/api/') && (url.hostname === 'www.' + home || url.hostname.endsWith('.workers.dev'))) {
      return new Response(null, { status: 301, headers: { Location: `https://${home}${url.pathname}${url.search}` } });
    }
    const res = await route(request, env, ctx);
    /* El ambiente de pruebas no aparece en buscadores. */
    return env.STAGING ? withHeaders(res, { 'X-Robots-Tag': 'noindex, nofollow' }) : res;
  }
};

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === '/robots.txt' && env.STAGING) return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  try {
    if (path === '/comprar' || path === '/comprar/') return await comprar(request, env, url, ctx);
    if (path === '/api/mp/webhook') return await mpWebhook(request, env, url, ctx);
    if (path.startsWith('/api/')) return await api(request, env, url, ctx);
    /* /activar y /admin los sirve el gestor de archivos (activar.html y admin.html). */
    if (PROTECTED.has(path)) {
      const lic = await readLicense(request, env);
      if (!lic) return await landing(request, env, url);
      track(env, ctx, request, 'uso', { sid: lic.rec.code });
      const res = await env.ASSETS.fetch(new Request(new URL('/', url), request));
      return decorate(withHeaders(res, { 'Cache-Control': 'private, no-cache' }), env, false);
    }
    if (LANDING.has(path)) return await landing(request, env, url);
    const res = await env.ASSETS.fetch(request);
    return path.startsWith('/admin') ? res : decorate(res, env, /^\/(activar|gracias)/.test(path));
  } catch (e) {
    return json({ error: 'server', message: 'Algo falló del lado del servidor. Prueba de nuevo en un rato.' }, 500);
  }
}

/* ======================= API ======================= */
async function api(request, env, url, ctx) {
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/activar' && method === 'POST') {
    const body = await readJSON(request);
    const code = normalizeCode(body.code);
    const device = String(body.device || '').slice(0, 64);
    if (!code) return json({ error: 'formato', message: 'El código tiene el formato COBRO-XXXX-XXXX-XXXX.' }, 400);
    if (!/^[\w-]{8,64}$/.test(device)) return json({ error: 'dispositivo', message: 'No pudimos identificar este dispositivo. Recarga la página.' }, 400);
    const rec = await getCode(env, code);
    if (!rec) return json({ error: 'invalido', message: 'Ese código no existe. Revisa que esté igual que en el mail.' }, 404);
    if (rec.revoked) return json({ error: 'revocado', message: 'Este código fue desactivado. Responde el mail de tu compra para ayudarte.' }, 403);
    rec.devices = Array.isArray(rec.devices) ? rec.devices : [];
    const known = rec.devices.find((d) => d.id === device);
    if (!known) {
      if (rec.devices.length >= (rec.maxDevices || DEFAULT_DEVICES)) {
        return json({ error: 'limite', message: `Este código ya se usa en ${rec.devices.length} dispositivos, el máximo permitido. Desactiva uno desde Ajustes o responde el mail de tu compra.` }, 403);
      }
      rec.devices.push({ id: device, at: Date.now(), ua: (request.headers.get('User-Agent') || '').slice(0, 120) });
      await putCode(env, rec);
      track(env, ctx, request, 'activacion', { sid: code, src: rec.source || 'manual', extra: String(rec.devices.length) });
    }
    const token = await sign(env, { c: code, d: device, i: Date.now() });
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(token, url) });
  }

  if (path === '/api/venta' && method === 'GET') {
    const cfg = await getConfig(env);
    return json({ open: salesOpen(env, cfg), price: cfg.price || 0, listPrice: cfg.listPrice || 0, off: cfg.off || 0, title: cfg.title });
  }

  if (path === '/api/compra' && method === 'GET') return compraStatus(env, url, request, ctx);

  /* Eventos de la landing (visita, demo, precio, preguntas, clic en comprar). Sin cookies ni datos personales. */
  if (path === '/api/ev' && method === 'POST') {
    const body = await readJSON(request);
    const name = String(body.n || '');
    if (CLIENT_EVENTS.has(name) && /^[\w-]{6,40}$/.test(String(body.s || ''))) track(env, ctx, request, name, { sid: body.s, src: body.src, extra: body.x });
    return new Response(null, { status: 204 });
  }

  if (path === '/api/licencia' && method === 'GET') {
    const lic = await readLicense(request, env);
    if (!lic) return json({ error: 'sin-licencia' }, 401);
    const cfg = await savedConfig(env);
    return json({ code: lic.rec.code, email: lic.rec.email || '', devices: lic.rec.devices.length, maxDevices: lic.rec.maxDevices || DEFAULT_DEVICES, guarantee: guaranteeInfo(env, cfg, lic.rec) });
  }

  /* Garantía: la compradora pide la devolución desde Ajustes y se reembolsa sola. */
  if (path === '/api/devolucion' && method === 'POST') {
    const lic = await readLicense(request, env);
    if (!lic) return json({ error: 'sin-licencia', message: 'Esta app no está activada en este dispositivo.' }, 401);
    const g = guaranteeInfo(env, await savedConfig(env), lic.rec);
    if (!g.refundable) return json({ error: 'fuera-de-plazo', message: g.days ? `La garantía era de ${g.days} días desde la compra y ya venció.` : 'Esta compra no tiene devolución automática.' }, 403);
    try {
      await refundLicense(env, lic.rec, 'compradora');
    } catch (e) {
      lic.rec.refundRequestedAt = Date.now();
      await putCode(env, lic.rec);
      return json({ error: 'manual', message: 'No pudimos hacer la devolución automática. Tu pedido quedó registrado y te devolvemos el dinero a mano en los próximos días.' }, 502);
    }
    track(env, ctx, request, 'reembolso', { sid: lic.rec.code, src: 'compradora', val: lic.rec.amount });
    return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${url.protocol === 'https:' ? '; Secure' : ''}` });
  }

  if (path === '/api/salir' && method === 'POST') {
    const lic = await readLicense(request, env);
    if (lic) {
      lic.rec.devices = lic.rec.devices.filter((d) => d.id !== lic.device);
      await putCode(env, lic.rec);
    }
    return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${url.protocol === 'https:' ? '; Secure' : ''}` });
  }

  if (path.startsWith('/api/admin/')) return admin(request, env, url, ctx);
  return json({ error: 'no-encontrado' }, 404);
}

async function admin(request, env, url, ctx) {
  if (!env.ADMIN_TOKEN) return json({ error: 'sin-configurar', message: 'Falta configurar ADMIN_TOKEN en Cloudflare (Settings → Variables and Secrets).' }, 503);
  const auth = request.headers.get('Authorization') || '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!(await safeEqual(given, env.ADMIN_TOKEN))) return json({ error: 'no-autorizado', message: 'Clave de administración incorrecta.' }, 401);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/admin/config' && method === 'GET') return json(await adminConfig(env, url));
  if (path === '/api/admin/config' && method === 'PUT') {
    const body = await readJSON(request);
    const cfg = await savedConfig(env);
    const num = (v, d) => Math.round(Number(String(v ?? d).replace(',', '.')) * 100) / 100;
    const nums = { price: num(body.price, cfg.price), listPrice: num(body.listPrice, cfg.listPrice), usd: num(body.usd, cfg.usd), usdList: num(body.usdList, cfg.usdList) };
    if (Object.values(nums).some((n) => !(n >= 0) || n > 100000000)) return json({ error: 'precio', message: 'Algún precio no es válido.' }, 400);
    const next = {
      ...cfg,
      ...nums,
      mode: body.mode === 'usd' || body.mode === 'ars' ? body.mode : cfg.mode,
      dolar: DOLARES.includes(body.dolar) ? body.dolar : cfg.dolar,
      title: String(body.title ?? cfg.title).trim().slice(0, 120) || DEFAULT_CONFIG.title,
      maxDevices: Math.min(Math.max(parseInt(body.maxDevices ?? cfg.maxDevices, 10) || DEFAULT_DEVICES, 1), 20),
      guaranteeDays: Math.min(Math.max(parseInt(body.guaranteeDays ?? cfg.guaranteeDays, 10) || 0, 0), 30)
    };
    await env.LICENSES.put('config', JSON.stringify(next));
    return json(await adminConfig(env, url));
  }

  if (path === '/api/admin/stats' && method === 'GET') return json(await stats(env, parseInt(url.searchParams.get('dias'), 10) || 30));

  if (path === '/api/admin/codes' && method === 'GET') {
    const out = [];
    let cursor;
    do {
      const page = await env.LICENSES.list({ prefix: 'code:', cursor, limit: 1000 });
      for (const k of page.keys) out.push({ code: k.name.slice(5), ...(k.metadata || {}) });
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
    out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return json({ codes: out });
  }

  if (path === '/api/admin/codes' && method === 'POST') {
    const body = await readJSON(request);
    const count = Math.min(Math.max(parseInt(body.count, 10) || 1, 1), 50);
    const maxDevices = Math.min(Math.max(parseInt(body.maxDevices, 10) || DEFAULT_DEVICES, 1), 20);
    const email = String(body.email || '').trim().slice(0, 120);
    const note = String(body.note || '').trim().slice(0, 200);
    const created = [];
    for (let i = 0; i < count; i++) {
      let code;
      do { code = newCode(); } while (await env.LICENSES.get('code:' + code));
      const rec = { code, email, note, maxDevices, devices: [], revoked: false, createdAt: Date.now() };
      if (email && mlOn(env) && body.mailerlite !== false && (await mlAddBuyer(env, rec, url.origin, '').then(() => true, () => false))) rec.mailerliteAt = Date.now();
      await putCode(env, rec);
      created.push(summary(rec));
    }
    return json({ created });
  }

  const m = /^\/api\/admin\/codes\/([A-Z0-9-]+)$/.exec(path);
  if (m) {
    const code = normalizeCode(m[1]);
    const rec = code && (await getCode(env, code));
    if (!rec) return json({ error: 'invalido', message: 'Ese código no existe.' }, 404);
    if (method === 'GET') return json({ code: rec });
    if (method === 'POST') {
      const body = await readJSON(request);
      if (body.action === 'reembolsar') {
        try { await refundLicense(env, rec, 'admin'); } catch (e) { return json({ error: 'mp', message: e.userMessage || 'Mercado Pago no aceptó la devolución. Revisa que tengas saldo disponible o hazla desde tu cuenta.' }, 502); }
        track(env, ctx, request, 'reembolso', { sid: rec.code, src: 'admin', val: rec.amount });
        return json({ code: summary(rec) });
      }
      if (body.action === 'revocar') rec.revoked = true;
      else if (body.action === 'reactivar') rec.revoked = false;
      else if (body.action === 'liberar') rec.devices = [];
      else if (body.action === 'editar') {
        if (typeof body.email === 'string') rec.email = body.email.trim().slice(0, 120);
        if (typeof body.note === 'string') rec.note = body.note.trim().slice(0, 200);
        if (body.maxDevices) rec.maxDevices = Math.min(Math.max(parseInt(body.maxDevices, 10) || DEFAULT_DEVICES, 1), 20);
      } else return json({ error: 'accion', message: 'Acción desconocida.' }, 400);
      await putCode(env, rec);
      return json({ code: summary(rec) });
    }
    if (method === 'DELETE') {
      await env.LICENSES.delete('code:' + code);
      return json({ ok: true });
    }
  }
  return json({ error: 'no-encontrado' }, 404);
}

/* ======================= Licencias ======================= */
function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => ALPHABET[b % 32]).join('');
  return `${PREFIX}-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
function normalizeCode(raw) {
  let s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let prefix = PREFIX;
  for (const p of PREFIXES) if (s.length === p.length + 12 && s.startsWith(p)) { prefix = p; s = s.slice(p.length); break; }
  if (s.length !== 12 || [...s].some((c) => !ALPHABET.includes(c))) return null;
  return `${prefix}-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}
const summary = (rec) => ({ code: rec.code, email: rec.email || '', note: rec.note || '', maxDevices: rec.maxDevices || DEFAULT_DEVICES, devices: (rec.devices || []).length, revoked: !!rec.revoked, createdAt: rec.createdAt || 0, source: rec.source || 'manual', paymentId: rec.paymentId || '', amount: rec.amount || 0, emailSentAt: rec.emailSentAt || 0, mailerliteAt: rec.mailerliteAt || 0, revokedReason: rec.revokedReason || '', refundedAt: rec.refundedAt || 0, refundRequestedAt: rec.refundRequestedAt || 0 });
async function getCode(env, code) {
  const rec = await env.LICENSES.get('code:' + code, { type: 'json' });
  /* Un código viejo escrito sin su prefijo DULCE llega como COBRO: se busca también con el prefijo anterior. */
  if (rec || !code.startsWith(PREFIX + '-')) return rec;
  return env.LICENSES.get('code:DULCE' + code.slice(PREFIX.length), { type: 'json' });
}
async function putCode(env, rec) {
  const meta = summary(rec);
  delete meta.code;
  await env.LICENSES.put('code:' + rec.code, JSON.stringify(rec), { metadata: meta });
}
/* Devuelve la licencia de la cookie si sigue siendo válida (código activo y este dispositivo registrado). */
async function readLicense(request, env) {
  const raw = getCookie(request, COOKIE);
  if (!raw) return null;
  const payload = await verify(env, raw);
  if (!payload || !payload.c || !payload.d) return null;
  const rec = await getCode(env, payload.c);
  if (!rec || rec.revoked) return null;
  rec.devices = Array.isArray(rec.devices) ? rec.devices : [];
  if (!rec.devices.some((d) => d.id === payload.d)) return null;
  return { rec, device: payload.d };
}

/* ======================= Firma de la cookie (HMAC-SHA256) ======================= */
let keyPromise = null;
async function hmacKey(env) {
  if (!keyPromise) {
    keyPromise = (async () => {
      let secret = env.LICENSE_SECRET;
      if (!secret) {
        /* Sin variable configurada: se genera una vez y se guarda en el KV. */
        secret = await env.LICENSES.get('__secret');
        if (!secret) {
          secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
          await env.LICENSES.put('__secret', secret);
        }
      }
      return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    })().catch((e) => { keyPromise = null; throw e; });
  }
  return keyPromise;
}
async function sign(env, payload) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), new TextEncoder().encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}
async function verify(env, token) {
  const [body, sig] = String(token).split('.');
  if (!body || !sig) return null;
  let ok = false;
  try { ok = await crypto.subtle.verify('HMAC', await hmacKey(env), unb64url(sig), new TextEncoder().encode(body)); } catch (e) { return null; }
  if (!ok) return null;
  try { return JSON.parse(new TextDecoder().decode(unb64url(body))); } catch (e) { return null; }
}
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = a.length === 0 ? 1 : 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/* ======================= Venta con Mercado Pago ======================= */
/* Precio: en pesos fijos (price/listPrice) o en dólares (usd/usdList) convertidos al dólar del día.
   listPrice/usdList es el precio original que se muestra tachado durante el lanzamiento. */
const DEFAULT_CONFIG = { mode: 'ars', price: 0, listPrice: 0, usd: 0, usdList: 0, dolar: 'oficial', title: 'Cuánto Cobro · acceso a la app', currency: 'ARS', maxDevices: DEFAULT_DEVICES, guaranteeDays: 7 };
const DOLARES = ['oficial', 'blue', 'bolsa', 'tarjeta'];
const FX_HOURS = 6;
const PRODUCT = 'dulce-cuenta';
/* MP_API_BASE solo se usa para probar en local con un Mercado Pago simulado. */
const mpApi = (env) => env.MP_API_BASE || 'https://api.mercadopago.com';
async function savedConfig(env) {
  const saved = await env.LICENSES.get('config', { type: 'json' });
  return { ...DEFAULT_CONFIG, ...(saved || {}) };
}
/* La configuración con el precio que se cobra hoy, en pesos. */
async function getConfig(env) {
  const cfg = await savedConfig(env);
  return { ...cfg, ...(await pricing(env, cfg)) };
}
async function pricing(env, cfg) {
  if (cfg.mode !== 'usd') {
    const list = cfg.listPrice > cfg.price ? cfg.listPrice : 0;
    return { price: cfg.price, listPrice: list, off: list ? Math.round((1 - cfg.price / list) * 100) : 0, rate: 0, rateAt: 0 };
  }
  const fx = await dollarRate(env, cfg.dolar);
  if (!fx || !(cfg.usd > 0)) return { price: 0, listPrice: 0, off: 0, rate: fx?.rate || 0, rateAt: fx?.at || 0 };
  const list = cfg.usdList > cfg.usd ? pesos(cfg.usdList * fx.rate) : 0;
  return { price: pesos(cfg.usd * fx.rate), listPrice: list, off: list ? Math.round((1 - cfg.usd / cfg.usdList) * 100) : 0, rate: fx.rate, rateAt: fx.at };
}
/* Redondea a un precio de vidriera: 23.250 → 22.900, 31.000 → 30.900. */
const pesos = (x) => (x < 2000 ? Math.ceil(x / 10) * 10 : Math.round(x / 1000) * 1000 - 100);
/* Cotización de venta de dolarapi.com, guardada en KV unas horas. Si la consulta falla se usa la última conocida. */
async function dollarRate(env, casa) {
  const key = `fx:${DOLARES.includes(casa) ? casa : 'oficial'}`;
  const cached = await env.LICENSES.get(key, { type: 'json' });
  if (cached && Date.now() - cached.at < FX_HOURS * 3600e3) return cached;
  try {
    const res = await fetch(`${env.FX_API_BASE || 'https://dolarapi.com'}/v1/dolares/${key.slice(3)}`, { signal: AbortSignal.timeout(4000) });
    const d = await res.json();
    const rate = Number(d.venta);
    if (!res.ok || !(rate > 0)) throw new Error('cotización inválida');
    const fx = { rate, at: Date.now() };
    await env.LICENSES.put(key, JSON.stringify(fx));
    return fx;
  } catch {
    return cached || null;
  }
}
const salesOpen = (env, cfg) => !!env.MP_ACCESS_TOKEN && cfg.price > 0;
async function adminConfig(env, url) {
  const cfg = await savedConfig(env);
  const now = await pricing(env, cfg);
  const token = env.MP_ACCESS_TOKEN || '';
  return {
    ...cfg,
    now,
    open: salesOpen(env, now),
    buyUrl: `${url.origin}/comprar`,
    webhookUrl: `${url.origin}/api/mp/webhook`,
    mercadopago: token ? (token.startsWith('TEST-') ? 'prueba' : 'real') : 'sin-configurar',
    webhookSecret: !!env.MP_WEBHOOK_SECRET,
    email: !!(env.RESEND_API_KEY && env.MAIL_FROM),
    mailerlite: mlOn(env)
  };
}
async function mp(env, method, path, body, extraHeaders = {}) {
  const res = await fetch(mpApi(env) + path, {
    method,
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(`Mercado Pago respondió ${res.status}`); e.status = res.status; e.data = data; throw e; }
  return data;
}
/* /comprar: crea la preferencia de pago y lleva a la compradora a Mercado Pago. */
async function comprar(request, env, url, ctx) {
  const cfg = await getConfig(env);
  /* La landing agrega su número de visita y de dónde vino, para unir el pago con la visita en las estadísticas. */
  const q = url.searchParams;
  const sid = /^[\w-]{6,40}$/.test(q.get('s') || '') ? q.get('s') : '';
  const src = clean(q.get('src'), 60);
  const dev = deviceOf(request.headers.get('User-Agent') || '');
  const country = (request.cf && request.cf.country) || '';
  if (!salesOpen(env, cfg)) return redirect(new URL('/gracias?estado=cerrado', url));
  const ref = `dc-${b64url(crypto.getRandomValues(new Uint8Array(12)))}`;
  try {
    const pref = await mp(env, 'POST', '/checkout/preferences', {
      items: [{ id: PRODUCT, title: cfg.title, description: 'Calculadora de precios para tortas', category_id: 'services', quantity: 1, currency_id: cfg.currency, unit_price: cfg.price }],
      back_urls: { success: `${url.origin}/gracias`, pending: `${url.origin}/gracias`, failure: `${url.origin}/gracias` },
      auto_return: 'approved',
      notification_url: `${url.origin}/api/mp/webhook`,
      external_reference: ref,
      statement_descriptor: 'CUANTO COBRO',
      metadata: { product: PRODUCT, sid, src, dev, country }
    }, { 'X-Idempotency-Key': ref });
    track(env, ctx, request, 'checkout', { sid, src });
    return redirect(new URL(pref.init_point));
  } catch (e) {
    return redirect(new URL('/gracias?estado=error', url));
  }
}
/* /api/compra: la página /gracias pregunta cómo salió el pago y, si se aprobó, recibe el código. */
async function compraStatus(env, url, request, ctx) {
  const id = (url.searchParams.get('payment_id') || url.searchParams.get('collection_id') || '').replace(/\D/g, '');
  const ref = url.searchParams.get('ref') || url.searchParams.get('external_reference') || '';
  if (!id || !ref) return json({ status: 'desconocido' }, 400);
  if (!env.MP_ACCESS_TOKEN) return json({ status: 'error' }, 503);
  let pay;
  try { pay = await mp(env, 'GET', `/v1/payments/${id}`); } catch (e) { return json({ status: e.status === 404 ? 'desconocido' : 'error' }, e.status === 404 ? 404 : 502); }
  /* La referencia es secreta y única por compra: sin ella no se entrega el código. */
  if (pay.external_reference !== ref || !isOurs(pay)) return json({ status: 'desconocido' }, 404);
  if (pay.status === 'approved') {
    const rec = await ensureLicense(env, pay, url.origin);
    const cfg = await savedConfig(env);
    return json({ status: 'aprobado', code: rec.code, email: rec.email || '', emailSent: !!(rec.emailSentAt || rec.mailerliteAt), maxDevices: rec.maxDevices, amount: rec.amount || 0, paymentId: rec.paymentId, guaranteeDays: env.MP_ACCESS_TOKEN ? cfg.guaranteeDays : 0 });
  }
  if (pay.status === 'pending' || pay.status === 'in_process' || pay.status === 'authorized') return json({ status: 'pendiente' });
  const md = pay.metadata || {};
  track(env, ctx, request, 'rechazo', { sid: md.sid, src: md.src, dev: md.dev, extra: pay.status_detail || pay.status });
  return json({ status: 'rechazado' });
}
const isOurs = (pay) => (pay.metadata && pay.metadata.product === PRODUCT) || String(pay.external_reference || '').startsWith('dc-');
/* Aviso de Mercado Pago. Se valida la firma, se responde enseguida y el pago se procesa después. */
async function mpWebhook(request, env, url, ctx) {
  if (request.method !== 'POST') return json({ ok: true });
  const body = await readJSON(request);
  const type = body.type || body.topic || url.searchParams.get('type') || url.searchParams.get('topic');
  const dataId = String(url.searchParams.get('data.id') || (body.data && body.data.id) || '');
  if (env.MP_WEBHOOK_SECRET && !(await validSignature(request, env.MP_WEBHOOK_SECRET, dataId))) return json({ error: 'firma' }, 401);
  if (type === 'payment' && /^\d+$/.test(dataId) && env.MP_ACCESS_TOKEN) {
    const work = processPayment(env, dataId, url.origin).catch(() => {});
    if (ctx && ctx.waitUntil) ctx.waitUntil(work); else await work;
  }
  return json({ ok: true });
}
async function validSignature(request, secret, dataId) {
  const header = request.headers.get('x-signature') || '';
  const requestId = request.headers.get('x-request-id') || '';
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=').map((s) => s.trim())));
  if (!parts.ts || !parts.v1 || !dataId) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${requestId};ts:${parts.ts};`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  return safeEqual(hex, parts.v1.toLowerCase());
}
/* Siempre se consulta el pago a Mercado Pago: el aviso solo trae el número. */
async function processPayment(env, id, origin) {
  const pay = await mp(env, 'GET', `/v1/payments/${id}`);
  if (!isOurs(pay)) return;
  if (pay.status === 'approved') { await ensureLicense(env, pay, origin); return; }
  if (['refunded', 'charged_back', 'cancelled'].includes(pay.status)) {
    const code = await codeForPayment(env, pay.id);
    const rec = await getCode(env, code);
    if (rec && !rec.revoked) {
      rec.revoked = true;
      rec.revokedReason = pay.status === 'charged_back' ? 'contracargo' : 'reembolso';
      if (!rec.refundedAt) {
        rec.refundedAt = Date.now();
        rec.refundBy = 'mercadopago';
        await track(env, null, null, pay.status === 'charged_back' ? 'contracargo' : 'reembolso', { sid: rec.code, src: 'mercadopago', val: rec.amount });
      }
      await putCode(env, rec);
      await mlRemoveBuyer(env, rec).catch(() => {});
    }
  }
}
/* El código sale del número de pago y la clave secreta: el aviso y /gracias llegan al mismo código. */
async function codeForPayment(env, paymentId) {
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(env), new TextEncoder().encode(`mp:${paymentId}`)));
  const chars = Array.from(sig.slice(0, 12), (b) => ALPHABET[b % 32]).join('');
  return `${PREFIX}-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
async function ensureLicense(env, pay, origin) {
  const code = await codeForPayment(env, pay.id);
  let rec = await getCode(env, code);
  if (!rec) {
    const cfg = await getConfig(env);
    rec = {
      code, email: String((pay.payer && pay.payer.email) || '').slice(0, 120), note: `Mercado Pago #${pay.id}`,
      maxDevices: cfg.maxDevices || DEFAULT_DEVICES, devices: [], revoked: false, createdAt: Date.now(),
      source: 'mercadopago', paymentId: String(pay.id), amount: pay.transaction_amount || 0
    };
    await putCode(env, rec);
    const md = pay.metadata || {};
    await track(env, null, null, 'pago', { sid: md.sid, src: md.src, dev: md.dev || '?', country: md.country, val: rec.amount });
  }
  if (!rec.mailerliteAt && rec.email && mlOn(env)) {
    const p = pay.payer || {};
    const name = p.first_name || (pay.additional_info && pay.additional_info.payer && pay.additional_info.payer.first_name) || '';
    const ok = await mlAddBuyer(env, rec, origin, name).then(() => true, () => false);
    if (ok) { rec.mailerliteAt = Date.now(); await putCode(env, rec); }
  } else if (!rec.emailSentAt && rec.email && !mlOn(env) && env.RESEND_API_KEY && env.MAIL_FROM) {
    const sent = await sendCodeMail(env, rec, origin).catch(() => false);
    if (sent) { rec.emailSentAt = Date.now(); await putCode(env, rec); }
  }
  return rec;
}
async function sendCodeMail(env, rec, origin) {
  const link = `${origin}/activar?codigo=${encodeURIComponent(rec.code)}`;
  const text = `¡Hola! Gracias por comprar Cuánto Cobro.\n\nTu código de acceso es:\n${rec.code}\n\nPara empezar, entra a este enlace desde tu teléfono o computadora:\n${link}\n\nPuedes usarlo en hasta ${rec.maxDevices} dispositivos. Tus datos se guardan en tu navegador; desde Ajustes puedes descargar un respaldo cuando quieras.\n\n¡Que vendas muchas tortas!`;
  const html = `<div style="font-family:Arial,sans-serif;color:#3A2228;max-width:520px;margin:0 auto;padding:24px"><p style="font-size:22px;font-weight:800;color:#A82756;margin:0 0 16px">Cuánto Cobro</p><p>¡Hola! Gracias por tu compra.</p><p>Tu código de acceso es:</p><p style="font-size:24px;font-weight:800;letter-spacing:2px;background:#FFE6EE;padding:14px 18px;border-radius:14px;display:inline-block">${rec.code}</p><p><a href="${link}" style="display:inline-block;background:#C42F65;color:#fff;font-weight:800;padding:14px 22px;border-radius:14px;text-decoration:none">Activar Cuánto Cobro</a></p><p style="color:#7A5860;font-size:14px">Puedes usarlo en hasta ${rec.maxDevices} dispositivos. Tus datos se guardan en tu navegador; desde Ajustes puedes descargar un respaldo cuando quieras.</p></div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `code-${rec.code}` },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [rec.email], subject: 'Tu acceso a Cuánto Cobro', text, html })
  });
  return res.ok;
}

/* ======================= MailerLite: secuencia de 4 mails ======================= */
/* La compradora entra al grupo de compradores con sus datos en campos propios, que los mails usan como
   {$codigo}, {$link_activar} y {$garantia_dias}. Si devuelve la compra, sale del grupo y queda marcada. */
const mlOn = (env) => !!(env.MAILERLITE_API_KEY && env.MAILERLITE_GROUP_ID);
const ML_FIELDS = ['codigo', 'link_activar', 'garantia_dias', 'estado'];
async function ml(env, method, path, body) {
  const res = await fetch(`${env.MAILERLITE_API_BASE || 'https://connect.mailerlite.com'}/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.MAILERLITE_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(`MailerLite respondió ${res.status}`); e.status = res.status; e.data = data; throw e; }
  return data;
}
/* Los campos propios se crean una vez si faltan. */
let mlFieldsReady = null;
function mlEnsureFields(env) {
  if (!mlFieldsReady) {
    mlFieldsReady = (async () => {
      const have = new Set(((await ml(env, 'GET', '/fields?limit=100')).data || []).map((f) => f.key));
      for (const key of ML_FIELDS) if (!have.has(key)) await ml(env, 'POST', '/fields', { name: key, type: 'text' });
    })().catch((e) => { mlFieldsReady = null; throw e; });
  }
  return mlFieldsReady;
}
async function mlAddBuyer(env, rec, origin, name) {
  await mlEnsureFields(env);
  const cfg = await savedConfig(env);
  await ml(env, 'POST', '/subscribers', {
    email: rec.email,
    fields: { name: name || '', codigo: rec.code, link_activar: `${origin}/activar?codigo=${encodeURIComponent(rec.code)}`, garantia_dias: String(cfg.guaranteeDays || 0), estado: 'activo' },
    groups: [String(env.MAILERLITE_GROUP_ID)]
  });
}
async function mlRemoveBuyer(env, rec) {
  if (!mlOn(env) || !rec.email || !rec.mailerliteAt) return;
  const sub = (await ml(env, 'GET', `/subscribers/${encodeURIComponent(rec.email)}`)).data;
  if (!sub) return;
  await ml(env, 'PUT', `/subscribers/${sub.id}`, { fields: { estado: rec.revokedReason || 'devuelto' } });
  await ml(env, 'DELETE', `/subscribers/${sub.id}/groups/${env.MAILERLITE_GROUP_ID}`);
}

/* ======================= Garantía ======================= */
function guaranteeInfo(env, cfg, rec) {
  const days = cfg.guaranteeDays || 0;
  const until = rec.source === 'mercadopago' && days ? (rec.createdAt || 0) + days * 86400e3 : 0;
  return { days, until, requested: !!rec.refundRequestedAt, refundable: !!(until && Date.now() < until && !rec.revoked && rec.paymentId && env.MP_ACCESS_TOKEN) };
}
/* Devuelve el pago completo en Mercado Pago y revoca el código. Se puede repetir sin cobrar dos veces. */
async function refundLicense(env, rec, by) {
  if (rec.source !== 'mercadopago' || !rec.paymentId) {
    const e = new Error('sin pago'); e.userMessage = 'Este código no tiene un pago de Mercado Pago para devolver.'; throw e;
  }
  if (!rec.refundedAt) {
    await mp(env, 'POST', `/v1/payments/${rec.paymentId}/refunds`, {}, { 'X-Idempotency-Key': `refund-${rec.paymentId}` });
    rec.refundedAt = Date.now();
    rec.refundBy = by;
  }
  rec.revoked = true;
  rec.revokedReason = 'reembolso';
  await putCode(env, rec);
  await mlRemoveBuyer(env, rec).catch(() => {});
}

/* ======================= Medición (D1) ======================= */
const CLIENT_EVENTS = new Set(['visita', 'demo', 'precio', 'faq', 'clic']);
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|curl|wget/i;
const clean = (v, n) => String(v ?? '').replace(/[^\w .:/@-]/g, '').trim().slice(0, n).toLowerCase();
const deviceOf = (ua) => (/iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'celular' : 'compu');
/* Día en hora de Argentina (UTC−3). */
const dayAR = (ts) => new Date(ts - 3 * 3600e3).toISOString().slice(0, 10);
let schema = null;
function ensureSchema(env) {
  if (!schema) {
    schema = env.DB.batch([
      env.DB.prepare('CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, day TEXT NOT NULL, name TEXT NOT NULL, sid TEXT, src TEXT, dev TEXT, country TEXT, val REAL, extra TEXT)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS events_day ON events (day, name)')
    ]).catch((e) => { schema = null; throw e; });
  }
  return schema;
}
/* Guarda un evento. Nunca frena ni rompe la respuesta: si falla, se pierde ese evento y listo. */
function track(env, ctx, request, name, d = {}) {
  if (!env.DB) return Promise.resolve();
  const ua = (request && request.headers.get('User-Agent')) || '';
  if (request && BOTS.test(ua)) return Promise.resolve();
  const ts = Date.now();
  const row = [ts, dayAR(ts), name, clean(d.sid, 40), clean(d.src, 60), d.dev || deviceOf(ua), d.country || (request && request.cf && request.cf.country) || '', Number(d.val) || 0, clean(d.extra, 200)];
  const work = ensureSchema(env)
    .then(() => env.DB.prepare('INSERT INTO events (ts, day, name, sid, src, dev, country, val, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(...row).run())
    .catch(() => {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(work);
  return work;
}
async function stats(env, dias) {
  if (!env.DB) return { enabled: false };
  await ensureSchema(env);
  const n = Math.min(Math.max(dias, 1), 365);
  const since = dayAR(Date.now() - (n - 1) * 86400e3);
  const week = dayAR(Date.now() - 6 * 86400e3);
  const SALES = "name IN ('visita', 'clic', 'checkout', 'pago')";
  const q = (sql, ...args) => env.DB.prepare(sql).bind(...args);
  const [steps, daily, sources, devices, places, countries, active] = await env.DB.batch([
    q('SELECT name, COUNT(DISTINCT sid) AS u, COUNT(*) AS n, SUM(val) AS v FROM events WHERE day >= ? GROUP BY name', since),
    q(`SELECT day, name, COUNT(DISTINCT sid) AS u, COUNT(*) AS n, SUM(val) AS v FROM events WHERE day >= ? AND ${SALES} GROUP BY day, name`, since),
    q(`SELECT COALESCE(NULLIF(src, ''), 'directo') AS k, name, COUNT(DISTINCT sid) AS u, COUNT(*) AS n, SUM(val) AS v FROM events WHERE day >= ? AND ${SALES} GROUP BY k, name`, since),
    q(`SELECT dev AS k, name, COUNT(DISTINCT sid) AS u, COUNT(*) AS n, SUM(val) AS v FROM events WHERE day >= ? AND ${SALES} GROUP BY k, name`, since),
    q("SELECT COALESCE(NULLIF(extra, ''), '?') AS k, COUNT(*) AS n FROM events WHERE day >= ? AND name = 'clic' GROUP BY k ORDER BY n DESC", since),
    q("SELECT COALESCE(NULLIF(country, ''), '?') AS k, COUNT(DISTINCT sid) AS u FROM events WHERE day >= ? AND name = 'visita' GROUP BY k ORDER BY u DESC LIMIT 8", since),
    q("SELECT COUNT(DISTINCT sid) AS u FROM events WHERE day >= ? AND name = 'uso'", week)
  ]);
  return { enabled: true, dias: n, since, steps: steps.results, daily: daily.results, sources: sources.results, devices: devices.results, places: places.results, countries: countries.results, activeWeek: active.results[0]?.u || 0 };
}

/* ======================= Etiquetas de medición en las páginas ======================= */
/* Cloudflare Web Analytics en todas las páginas (salvo /admin); Meta Pixel y Google Analytics, si están configurados,
   solo en las páginas de venta. window.dcAds(evento) avisa a esas herramientas: demo, checkout y purchase. */
function decorate(res, env, ads) {
  if (!(res.headers.get('Content-Type') || '').includes('text/html')) return res;
  const beacon = /^[a-f0-9]{32}$/.test(env.CF_BEACON || '') ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${env.CF_BEACON}"}'></script>` : '';
  const tags = ads ? adsTags(env) : '';
  if (!beacon && !tags) return res;
  return new HTMLRewriter()
    .on('head', { element(e) { if (tags) e.append(tags, { html: true }); } })
    .on('body', { element(e) { if (beacon) e.append(beacon, { html: true }); } })
    .transform(res);
}
function adsTags(env) {
  const px = /^\d{6,20}$/.test(env.META_PIXEL_ID || '') ? env.META_PIXEL_ID : '';
  const ga = /^G-[A-Z0-9]{4,16}$/.test(env.GA4_ID || '') ? env.GA4_ID : '';
  if (!px && !ga) return '';
  let out = '';
  if (px) out += `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px}');fbq('track','PageView');</script>`;
  if (ga) out += `<script async src="https://www.googletagmanager.com/gtag/js?id=${ga}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}');</script>`;
  out += `<script>window.dcAds=function(e,d){d=d||{};try{if(window.fbq){if(e==='demo')fbq('trackCustom','ProboDemo');if(e==='checkout')fbq('track','InitiateCheckout');if(e==='purchase')fbq('track','Purchase',{value:d.value,currency:'ARS'},{eventID:'pago-'+d.id})}if(window.gtag){if(e==='demo')gtag('event','probo_demo');if(e==='checkout')gtag('event','begin_checkout',{currency:'ARS'});if(e==='purchase')gtag('event','purchase',{value:d.value,currency:'ARS',transaction_id:String(d.id)})}}catch(_){}};</script>`;
  return out;
}

/* ======================= Utilidades HTTP ======================= */
function cookie(token, url) {
  return `${COOKIE}=${token}; Path=/; Max-Age=${COOKIE_DAYS * 86400}; HttpOnly; SameSite=Lax${url.protocol === 'https:' ? '; Secure' : ''}`;
}
function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}
async function readJSON(request) {
  try { return await request.json(); } catch (e) { return {}; }
}
/* Landing de venta: el precio y si la venta está abierta se escriben en el servidor, sin parpadeos. */
async function landing(request, env, url) {
  /* Sin los encabezados condicionales del navegador: el HTML cambia con el precio, así que nunca va un 304. */
  const res = await env.ASSETS.fetch(new URL('/landing', url));
  const cfg = await getConfig(env);
  const open = salesOpen(env, cfg);
  const money = (n) => '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const price = open ? money(cfg.price) : 'Próximamente';
  const launch = open && cfg.listPrice > cfg.price;
  /* La garantía se anuncia aunque la venta todavía esté cerrada. */
  const days = cfg.guaranteeDays || 0;
  const cls = [open ? '' : 'is-closed', launch ? 'has-launch' : '', days ? '' : 'no-guarantee'].filter(Boolean).join(' ');
  /* X-Dulce-Page le avisa al service worker que no guarde esta página en lugar de la app. */
  const out = withHeaders(res, { 'Cache-Control': 'private, no-cache', 'X-Dulce-Page': 'landing' });
  out.headers.delete('ETag');
  return new HTMLRewriter()
    .on('[data-price]', { element(e) { e.setInnerContent(price); } })
    .on('[data-list]', { element(e) { e.setInnerContent(launch ? money(cfg.listPrice) : ''); } })
    .on('[data-off]', { element(e) { e.setInnerContent(launch ? `${cfg.off}% OFF` : ''); } })
    .on('[data-days]', { element(e) { e.setInnerContent(String(days)); } })
    .on('body', { element(e) { if (cls) e.setAttribute('class', cls); } })
    /* WhatsApp y las redes necesitan la dirección completa de la imagen para mostrar la vista previa. */
    .on('meta[property="og:image"]', { element(e) { e.setAttribute('content', `${url.origin}/og.png`); } })
    .transform(decorate(out, env, true));
}
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}
function redirect(to) {
  return new Response(null, { status: 302, headers: { Location: to.toString(), 'Cache-Control': 'no-store' } });
}
function withHeaders(res, headers) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries(headers)) r.headers.set(k, v);
  return r;
}
