/* Dulce Cuenta · servidor de licencias.
   - La app (/) solo se entrega a dispositivos activados con un código válido; al resto se le muestra
     la landing de venta (landing.html) con el precio actual.
   - /activar: página para cargar el código que llega por mail con la compra.
   - /admin: página para crear, revocar y liberar códigos (protegida con ADMIN_TOKEN).
   - /comprar: cobra con Mercado Pago (Checkout Pro). Con el pago aprobado se crea el código solo
     y se muestra en /gracias; los reembolsos y contracargos lo revocan.
   Los códigos viven en el KV "LICENSES" con la clave "code:DULCE-XXXX-XXXX-XXXX". */

const COOKIE = 'dc_lic';
const COOKIE_DAYS = 400;
const DEFAULT_DEVICES = 3;
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PROTECTED = new Set(['/', '/index', '/index.html']);
const LANDING = new Set(['/landing', '/landing.html']);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/comprar' || path === '/comprar/') return await comprar(request, env, url);
      if (path === '/api/mp/webhook') return await mpWebhook(request, env, url, ctx);
      if (path.startsWith('/api/')) return await api(request, env, url);
      /* /activar y /admin los sirve el gestor de archivos (activar.html y admin.html). */
      if (PROTECTED.has(path)) {
        const lic = await readLicense(request, env);
        if (!lic) return await landing(request, env, url);
        const res = await env.ASSETS.fetch(new Request(new URL('/', url), request));
        return withHeaders(res, { 'Cache-Control': 'private, no-cache' });
      }
      if (LANDING.has(path)) return await landing(request, env, url);
      return env.ASSETS.fetch(request);
    } catch (e) {
      return json({ error: 'server', message: 'Algo falló del lado del servidor. Prueba de nuevo en un rato.' }, 500);
    }
  }
};

/* ======================= API ======================= */
async function api(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/activar' && method === 'POST') {
    const body = await readJSON(request);
    const code = normalizeCode(body.code);
    const device = String(body.device || '').slice(0, 64);
    if (!code) return json({ error: 'formato', message: 'El código tiene el formato DULCE-XXXX-XXXX-XXXX.' }, 400);
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
    }
    const token = await sign(env, { c: code, d: device, i: Date.now() });
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(token, url) });
  }

  if (path === '/api/venta' && method === 'GET') {
    const cfg = await getConfig(env);
    return json({ open: salesOpen(env, cfg), price: cfg.price || 0, title: cfg.title });
  }

  if (path === '/api/compra' && method === 'GET') return compraStatus(env, url);

  if (path === '/api/licencia' && method === 'GET') {
    const lic = await readLicense(request, env);
    if (!lic) return json({ error: 'sin-licencia' }, 401);
    return json({ code: lic.rec.code, email: lic.rec.email || '', devices: lic.rec.devices.length, maxDevices: lic.rec.maxDevices || DEFAULT_DEVICES });
  }

  if (path === '/api/salir' && method === 'POST') {
    const lic = await readLicense(request, env);
    if (lic) {
      lic.rec.devices = lic.rec.devices.filter((d) => d.id !== lic.device);
      await putCode(env, lic.rec);
    }
    return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${url.protocol === 'https:' ? '; Secure' : ''}` });
  }

  if (path.startsWith('/api/admin/')) return admin(request, env, url);
  return json({ error: 'no-encontrado' }, 404);
}

async function admin(request, env, url) {
  if (!env.ADMIN_TOKEN) return json({ error: 'sin-configurar', message: 'Falta configurar ADMIN_TOKEN en Cloudflare (Settings → Variables and Secrets).' }, 503);
  const auth = request.headers.get('Authorization') || '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!(await safeEqual(given, env.ADMIN_TOKEN))) return json({ error: 'no-autorizado', message: 'Clave de administración incorrecta.' }, 401);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/admin/config' && method === 'GET') return json(await adminConfig(env, url));
  if (path === '/api/admin/config' && method === 'PUT') {
    const body = await readJSON(request);
    const cfg = await getConfig(env);
    const price = Math.round(Number(String(body.price ?? cfg.price).replace(',', '.')) * 100) / 100;
    if (!(price >= 0) || price > 100000000) return json({ error: 'precio', message: 'El precio no es válido.' }, 400);
    const next = {
      ...cfg,
      price,
      title: String(body.title ?? cfg.title).trim().slice(0, 120) || DEFAULT_CONFIG.title,
      maxDevices: Math.min(Math.max(parseInt(body.maxDevices ?? cfg.maxDevices, 10) || DEFAULT_DEVICES, 1), 20)
    };
    await env.LICENSES.put('config', JSON.stringify(next));
    return json(await adminConfig(env, url));
  }

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
  return `DULCE-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
function normalizeCode(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^DULCE/, '');
  if (s.length !== 12 || [...s].some((c) => !ALPHABET.includes(c))) return null;
  return `DULCE-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}
const summary = (rec) => ({ code: rec.code, email: rec.email || '', note: rec.note || '', maxDevices: rec.maxDevices || DEFAULT_DEVICES, devices: (rec.devices || []).length, revoked: !!rec.revoked, createdAt: rec.createdAt || 0, source: rec.source || 'manual', paymentId: rec.paymentId || '', amount: rec.amount || 0, emailSentAt: rec.emailSentAt || 0 });
async function getCode(env, code) {
  return env.LICENSES.get('code:' + code, { type: 'json' });
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
const DEFAULT_CONFIG = { price: 0, title: 'Dulce Cuenta · acceso a la app', currency: 'ARS', maxDevices: DEFAULT_DEVICES };
const PRODUCT = 'dulce-cuenta';
/* MP_API_BASE solo se usa para probar en local con un Mercado Pago simulado. */
const mpApi = (env) => env.MP_API_BASE || 'https://api.mercadopago.com';
async function getConfig(env) {
  const saved = await env.LICENSES.get('config', { type: 'json' });
  return { ...DEFAULT_CONFIG, ...(saved || {}) };
}
const salesOpen = (env, cfg) => !!env.MP_ACCESS_TOKEN && cfg.price > 0;
async function adminConfig(env, url) {
  const cfg = await getConfig(env);
  const token = env.MP_ACCESS_TOKEN || '';
  return {
    ...cfg,
    open: salesOpen(env, cfg),
    buyUrl: `${url.origin}/comprar`,
    webhookUrl: `${url.origin}/api/mp/webhook`,
    mercadopago: token ? (token.startsWith('TEST-') ? 'prueba' : 'real') : 'sin-configurar',
    webhookSecret: !!env.MP_WEBHOOK_SECRET,
    email: !!(env.RESEND_API_KEY && env.MAIL_FROM)
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
async function comprar(request, env, url) {
  const cfg = await getConfig(env);
  if (!salesOpen(env, cfg)) return redirect(new URL('/gracias?estado=cerrado', url));
  const ref = `dc-${b64url(crypto.getRandomValues(new Uint8Array(12)))}`;
  try {
    const pref = await mp(env, 'POST', '/checkout/preferences', {
      items: [{ id: PRODUCT, title: cfg.title, description: 'Calculadora de costos y ganancias para tortas', quantity: 1, currency_id: cfg.currency, unit_price: cfg.price }],
      back_urls: { success: `${url.origin}/gracias`, pending: `${url.origin}/gracias`, failure: `${url.origin}/gracias` },
      auto_return: 'approved',
      notification_url: `${url.origin}/api/mp/webhook`,
      external_reference: ref,
      statement_descriptor: 'DULCE CUENTA',
      metadata: { product: PRODUCT }
    }, { 'X-Idempotency-Key': ref });
    return redirect(new URL(pref.init_point));
  } catch (e) {
    return redirect(new URL('/gracias?estado=error', url));
  }
}
/* /api/compra: la página /gracias pregunta cómo salió el pago y, si se aprobó, recibe el código. */
async function compraStatus(env, url) {
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
    return json({ status: 'aprobado', code: rec.code, email: rec.email || '', emailSent: !!rec.emailSentAt, maxDevices: rec.maxDevices });
  }
  if (pay.status === 'pending' || pay.status === 'in_process' || pay.status === 'authorized') return json({ status: 'pendiente' });
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
      await putCode(env, rec);
    }
  }
}
/* El código sale del número de pago y la clave secreta: el aviso y /gracias llegan al mismo código. */
async function codeForPayment(env, paymentId) {
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(env), new TextEncoder().encode(`mp:${paymentId}`)));
  const chars = Array.from(sig.slice(0, 12), (b) => ALPHABET[b % 32]).join('');
  return `DULCE-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
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
  }
  if (!rec.emailSentAt && rec.email && env.RESEND_API_KEY && env.MAIL_FROM) {
    const sent = await sendCodeMail(env, rec, origin).catch(() => false);
    if (sent) { rec.emailSentAt = Date.now(); await putCode(env, rec); }
  }
  return rec;
}
async function sendCodeMail(env, rec, origin) {
  const link = `${origin}/activar?codigo=${encodeURIComponent(rec.code)}`;
  const text = `¡Hola! Gracias por comprar Dulce Cuenta.\n\nTu código de acceso es:\n${rec.code}\n\nPara empezar, entra a este enlace desde tu teléfono o computadora:\n${link}\n\nPuedes usarlo en hasta ${rec.maxDevices} dispositivos. Tus datos se guardan en tu navegador; desde Ajustes puedes descargar un respaldo cuando quieras.\n\n¡Que vendas muchas tortas!`;
  const html = `<div style="font-family:Arial,sans-serif;color:#3A2228;max-width:520px;margin:0 auto;padding:24px"><p style="font-size:22px;font-weight:800;color:#A82756;margin:0 0 16px">Dulce Cuenta</p><p>¡Hola! Gracias por tu compra.</p><p>Tu código de acceso es:</p><p style="font-size:24px;font-weight:800;letter-spacing:2px;background:#FFE6EE;padding:14px 18px;border-radius:14px;display:inline-block">${rec.code}</p><p><a href="${link}" style="display:inline-block;background:#C42F65;color:#fff;font-weight:800;padding:14px 22px;border-radius:14px;text-decoration:none">Activar Dulce Cuenta</a></p><p style="color:#7A5860;font-size:14px">Puedes usarlo en hasta ${rec.maxDevices} dispositivos. Tus datos se guardan en tu navegador; desde Ajustes puedes descargar un respaldo cuando quieras.</p></div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `code-${rec.code}` },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [rec.email], subject: 'Tu acceso a Dulce Cuenta', text, html })
  });
  return res.ok;
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
  const price = open ? '$' + String(Math.round(cfg.price)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : 'Próximamente';
  /* X-Dulce-Page le avisa al service worker que no guarde esta página en lugar de la app. */
  const out = withHeaders(res, { 'Cache-Control': 'private, no-cache', 'X-Dulce-Page': 'landing' });
  out.headers.delete('ETag');
  return new HTMLRewriter()
    .on('[data-price]', { element(e) { e.setInnerContent(price); } })
    .on('body', { element(e) { if (!open) e.setAttribute('class', 'is-closed'); } })
    /* WhatsApp y las redes necesitan la dirección completa de la imagen para mostrar la vista previa. */
    .on('meta[property="og:image"]', { element(e) { e.setAttribute('content', `${url.origin}/og.png`); } })
    .transform(out);
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
