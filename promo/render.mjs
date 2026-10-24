// Graba el video promocional de Cuánto Cobro (vertical 1080×1920, MP4 H.264).
//
// Uso, desde la raíz del repo:
//   npx http-server -p 8765 -c-1 .        (en otra terminal)
//   node promo/render.mjs                 (necesita playwright y ffmpeg)
//
// Escribe promo/cuanto-cobro-promo.mp4. La demo usa la app real (public/index.html) dentro de un celular.
import { createRequire } from 'module';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PROMO_BASE || 'http://localhost:8765';
const OUT = path.join(here, 'cuanto-cobro-promo.mp4');
const FRAMES = path.join(process.env.PROMO_TMP || path.join(here, '.frames'));

/* ---------- Datos de muestra para la demo ---------- */
const month = new Date().toISOString().slice(0, 7);
const now = Date.now();
let n = 0;
const id = () => 'demo' + (n++);
const ING = {};
const ing = (name, packQty, packUnit, price, cat) => { ING[name] = { id: id(), name, packQty, packUnit, price, cat, updatedAt: now - 3 * 86400000, sample: false }; return ING[name]; };
ing('Harina 0000', 1, 'kg', 1200, 'masa'); ing('Azúcar', 1, 'kg', 1500, 'masa'); ing('Huevos', 12, 'u', 3600, 'masa'); ing('Manteca', 200, 'g', 2800, 'masa');
ing('Cacao amargo', 150, 'g', 4200, 'masa'); ing('Leche', 1, 'l', 1600, 'masa'); ing('Crema de leche', 350, 'ml', 3500, 'cobertura'); ing('Dulce de leche repostero', 1, 'kg', 5600, 'relleno');
ing('Chocolate cobertura', 500, 'g', 6500, 'cobertura'); ing('Esencia de vainilla', 100, 'ml', 1900, 'masa'); ing('Frutillas', 500, 'g', 3800, 'deco'); ing('Queso crema', 290, 'g', 3300, 'relleno');
const line = (name, qty, unit) => ({ id: id(), ingId: ING[name].id, qty, unit });
const recipe = (name, items, extras, hours, margin) => ({
  id: id(), name, portions: 12, items, extras: extras.map(([n2, c]) => ({ id: id(), name: n2, cost: c })),
  hours, overhead: 1500, margin, price: null, notes: '', sample: false, createdAt: now, updatedAt: now
});
const seed = {
  app: 'dulce-cuenta', version: 1,
  settings: { business: 'Dulces de Ana', currency: 'ARS', hourlyRate: 4000, margin: 40, overhead: 1500, onboarded: true, lastExport: now },
  ingredients: Object.values(ING),
  recipes: [
    recipe('Vainilla y dulce de leche', [line('Harina 0000', 300, 'g'), line('Azúcar', 250, 'g'), line('Huevos', 4, 'u'), line('Manteca', 150, 'g'), line('Dulce de leche repostero', 500, 'g')], [['Caja', 2000]], 3, 40),
    recipe('Cheesecake de frutillas', [line('Queso crema', 580, 'g'), line('Frutillas', 500, 'g'), line('Azúcar', 150, 'g'), line('Huevos', 3, 'u'), line('Manteca', 100, 'g')], [['Bandeja', 1200]], 2.5, 40)
  ],
  sales: [3, 7, 10, 14, 18, 21].map((d, i) => ({ id: id(), date: `${month}-${String(d).padStart(2, '0')}`, recipeId: '', title: i % 2 ? 'Cheesecake de frutillas' : 'Vainilla y dulce de leche', client: '', price: [38000, 42000, 39500, 45000, 38000, 42000][i], cost: [21500, 23800, 21500, 25100, 21500, 23800][i] }))
};

/* ---------- Grabación ---------- */
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 576, height: 1024 }, deviceScaleFactor: 1.875 });
const page = await ctx.newPage();
await page.goto(`${BASE}/promo/promo.html`);
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dulce-cuenta:data', JSON.stringify(s)); }, seed);
await page.evaluate((u) => { document.getElementById('app').src = u; }, `${BASE}/public/index.html`);
await page.waitForTimeout(1500);
await page.evaluate(() => document.fonts.ready);
const app = page.frames().find((f) => f.url().includes('/public/index.html'));
await app.waitForSelector('.hero');

const frames = [];
const cdp = await ctx.newCDPSession(page);
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  frames.push({ data, t: metadata.timestamp });
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
const wait = (ms) => page.waitForTimeout(ms);
// Tramos que se aceleran al armar el MP4 (efecto time-lapse): [inicio, fin, factor de duración].
const speed = [];
const mark = () => Date.now() / 1000;
const say = (html) => page.evaluate((h) => window.caption(h), html);
const vis = (selector) => app.locator(selector).locator('visible=true').first();

async function tap(selector, { pause = 380 } = {}) {
  const el = vis(selector);
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.evaluate(([px, py]) => window.tapAt(px, py, false), [x, y]);
  await wait(pause);
  await page.evaluate(([px, py]) => window.tapAt(px, py, true), [x, y]);
  await el.click();
}
async function smoothTo(selector, block = 'start') {
  await app.evaluate(([s, b]) => { const el = [...document.querySelectorAll(s)].find((e) => e.offsetParent); if (el) el.scrollIntoView({ behavior: 'smooth', block: b }); }, [selector, block]);
  await wait(700);
}
async function addIngredient(name, cat, { chip, qty }, fast) {
  await tap(`[data-act="cat"][data-cat="${cat}"]`, { pause: fast ? 100 : 260 });
  await wait(fast ? 80 : 250);
  await tap(`[data-act="open-ing"][data-id="${ING[name].id}"]`, { pause: fast ? 110 : 280 });
  await wait(fast ? 120 : 350);
  if (chip) await tap(`[data-quick="${chip[0]}"][data-unit="${chip[1]}"]`, { pause: fast ? 100 : 260 });
  else { await vis('#pk-qty').fill(''); await vis('#pk-qty').type(String(qty), { delay: fast ? 40 : 80 }); }
  await wait(fast ? 120 : 400);
  await tap('[data-confirm]', { pause: fast ? 100 : 260 });
  await page.evaluate(() => window.hideTap());
  await wait(fast ? 950 : 1300);
}

await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
const t0 = Date.now();

// 1. La pregunta
await page.evaluate(() => window.show('intro'));
await wait(4300);

// 2. Inicio de la app
await page.evaluate(() => window.show('demo'));
await say('Tu pastelería, <em>en números</em>');
await wait(2200);

// 3. Armar una torta
await say('Arma tu torta <em>ingrediente por ingrediente</em>');
await tap('[data-act="new-recipe"]');
await wait(800);
await vis('#r-name').type('Chocolate y frutillas', { delay: 32 });
await app.evaluate(() => document.activeElement.blur());
await wait(500);
await addIngredient('Harina 0000', 'masa', { qty: 300 });
await say('Cada precio sale de <em>lo que tú pagas</em>');
await addIngredient('Huevos', 'masa', { qty: 4 });
await say('Y la ves <em>crecer</em> en pantalla');
const fastStart = mark();
await addIngredient('Cacao amargo', 'masa', { qty: 60 }, true);
await addIngredient('Azúcar', 'masa', { qty: 250 }, true);
await addIngredient('Dulce de leche repostero', 'relleno', { qty: 400 }, true);
await addIngredient('Chocolate cobertura', 'cobertura', { qty: 200 }, true);
await addIngredient('Frutillas', 'deco', { qty: 250 }, true);
speed.push([fastStart, mark(), 0.5]);

// 4. Extras y horas
await say('Suma la caja, las velas, <em>tus horas</em>');
const extrasStart = mark();
await tap('[data-act="next-step"]');
await wait(900);
for (const [k, cost] of [['caja', '2000'], ['velas', '900']]) {
  await tap(`[data-act="toggle-extra"][data-k="${k}"]`, { pause: 280 });
  await wait(400);
  await app.evaluate(() => { const el = document.activeElement; if (el && el.select) el.select(); });
  await page.keyboard.type(cost, { delay: 90 });
  await app.evaluate(() => document.activeElement.blur());
  await wait(700);
}
await smoothTo('.work', 'center');
for (let i = 0; i < 6; i++) await tap('[data-act="stepper"][data-target="r-hours"][data-step="0.5"]', { pause: i ? 90 : 300 });
await page.evaluate(() => window.hideTap());
await wait(400);
speed.push([extrasStart, mark(), 0.65]);

// 5. Precio
await say('Elige tu <em>precio</em>');
await tap('[data-act="next-step"]');
await wait(1100);
await app.evaluate(async () => {
  const r = [...document.querySelectorAll('#r-margin')].find((e) => e.offsetParent);
  if (!r) return;
  for (let v = Number(r.value); v <= 50; v += 5) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((res) => setTimeout(res, 160)); }
});
await wait(900);
await say('Y mira <em>cuánto ganas</em>');
await smoothTo('#profit-box', 'center');
await page.evaluate(() => window.hideTap());
await wait(2600);

// 6. Además
await page.evaluate(() => window.show('feat'));
await wait(3900);

// 7. Cierre
await page.evaluate(() => window.show('cta'));
await wait(4200);

await cdp.send('Page.stopScreencast');
console.log(`grabado: ${((Date.now() - t0) / 1000).toFixed(1)} s, ${frames.length} cuadros`);
await browser.close();

/* ---------- Armado del MP4 ---------- */
let list = '';
frames.forEach((f, i) => {
  const file = path.join(FRAMES, `f${String(i).padStart(5, '0')}.jpg`);
  writeFileSync(file, Buffer.from(f.data, 'base64'));
  const next = frames[i + 1] ? frames[i + 1].t : f.t + 0.5;
  const k = (speed.find(([a, b]) => f.t >= a && f.t < b) || [0, 0, 1])[2];
  list += `file '${file}'\nduration ${Math.max(0.001, (next - f.t) * k).toFixed(4)}\n`;
});
list += `file '${path.join(FRAMES, `f${String(frames.length - 1).padStart(5, '0')}.jpg`)}'\n`;
writeFileSync(path.join(FRAMES, 'list.txt'), list);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(FRAMES, 'list.txt'),
  '-vf', 'scale=1080:1920:flags=lanczos,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
  '-movflags', '+faststart', OUT], { stdio: 'inherit' });
rmSync(FRAMES, { recursive: true, force: true });
console.log('listo:', OUT);
