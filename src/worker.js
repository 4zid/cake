/* Dulce Cuenta · servidor de licencias.
   - La app (/) solo se entrega a dispositivos activados con un código válido.
   - /activar: página para cargar el código que llega por mail con la compra.
   - /admin: página para crear, revocar y liberar códigos (protegida con ADMIN_TOKEN).
   Los códigos viven en el KV "LICENSES" con la clave "code:DULCE-XXXX-XXXX-XXXX". */

const COOKIE = 'dc_lic';
const COOKIE_DAYS = 400;
const DEFAULT_DEVICES = 3;
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PROTECTED = new Set(['/', '/index', '/index.html']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path.startsWith('/api/')) return await api(request, env, url);
      /* /activar y /admin los sirve el gestor de archivos (activar.html y admin.html). */
      if (PROTECTED.has(path)) {
        const lic = await readLicense(request, env);
        if (!lic) return redirect(new URL('/activar', url));
        const res = await env.ASSETS.fetch(new Request(new URL('/', url), request));
        return withHeaders(res, { 'Cache-Control': 'private, no-cache' });
      }
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
const summary = (rec) => ({ code: rec.code, email: rec.email || '', note: rec.note || '', maxDevices: rec.maxDevices || DEFAULT_DEVICES, devices: (rec.devices || []).length, revoked: !!rec.revoked, createdAt: rec.createdAt || 0 });
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
