// Graba el video promocional de Dulce Cuenta (vertical 1080×1920, MP4 H.264).
//
// Uso, desde la raíz del repo:
//   npx http-server -p 8765 -c-1 .        (en otra terminal)
//   node promo/render.mjs                 (necesita playwright y ffmpeg)
//
// Escribe promo/dulce-cuenta-promo.mp4. La demo usa la app real (index.html) dentro de un celular.
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
const OUT = path.join(here, 'dulce-cuenta-promo.mp4');
const FRAMES = path.join(process.env.PROMO_TMP || path.join(here, '.frames'));

/* ---------- Datos de muestra para la demo ---------- */
const month = new Date().toISOString().slice(0, 7);
const now = Date.now();
let n = 0;
const id = () => 'demo' + (n++);
const ING = {};
const ing = (name, packQty, packUnit, price) => {
  const type = { g: 'mass', kg: 'mass', ml: 'vol', l: 'vol', u: 'unit', doc: 'unit' }[packUnit];
  ING[name] = { id: id(), name, packQty, packUnit, price, type, updatedAt: now - 3 * 86400000, sample: false };
  return ING[name];
};
ing('Harina 0000', 1, 'kg', 1200); ing('Azúcar', 1, 'kg', 1500); ing('Huevos', 1, 'doc', 3600); ing('Manteca', 200, 'g', 2800);
ing('Cacao amargo', 150, 'g', 4200); ing('Leche', 1, 'l', 1600); ing('Crema de leche', 350, 'ml', 3500); ing('Dulce de leche repostero', 1, 'kg', 5600);
ing('Polvo de hornear', 50, 'g', 650); ing('Esencia de vainilla', 100, 'ml', 1900); ing('Frutillas', 500, 'g', 3800); ing('Queso crema', 290, 'g', 3300);
const line = (name, qty, unit) => ({ id: id(), ingId: ING[name].id, qty, unit });
const recipe = (name, items, extras, hours, margin) => ({
  id: id(), name, portions: 12, items, extras: extras.map(([n2, c]) => ({ id: id(), name: n2, cost: c })),
  hours, overhead: 1500, margin, price: null, notes: '', sample: false, createdAt: now, updatedAt: now
});
const seed = {
  app: 'dulce-cuenta', version: 1,
  settings: { business: 'Dulces de Ana', currency: 'ARS', hourlyRate: 3500, margin: 45, overhead: 1500, onboarded: true, lastExport: now },
  ingredients: Object.values(ING),
  recipes: [
    recipe('Torta de vainilla y dulce de leche', [line('Harina 0000', 300, 'g'), line('Azúcar', 250, 'g'), line('Huevos', 4, 'u'), line('Manteca', 150, 'g'), line('Dulce de leche repostero', 500, 'g'), line('Leche', 200, 'ml'), line('Esencia de vainilla', 5, 'ml')], [['Caja', 2000], ['Decoración', 1500]], 3, 45),
    recipe('Cheesecake de frutillas', [line('Queso crema', 580, 'g'), line('Frutillas', 500, 'g'), line('Azúcar', 150, 'g'), line('Huevos', 3, 'u'), line('Manteca', 100, 'g'), line('Harina 0000', 100, 'g'), line('Crema de leche', 200, 'ml')], [['Base o bandeja', 1200]], 2.5, 45)
  ],
  sales: [3, 7, 10, 14, 18, 21].map((d, i) => ({ id: id(), date: `${month}-${String(d).padStart(2, '0')}`, recipeId: '', title: i % 2 ? 'Cheesecake de frutillas' : 'Torta de vainilla y dulce de leche', client: '', price: [38000, 42000, 39500, 45000, 38000, 42000][i], cost: [21500, 23800, 21500, 25100, 21500, 23800][i] }))
};

/* ---------- Grabación ---------- */
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 576, height: 1024 }, deviceScaleFactor: 1.875 });
const page = await ctx.newPage();
await page.goto(`${BASE}/promo/promo.html`);
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dulce-cuenta:data', JSON.stringify(s)); }, seed);
await page.evaluate((u) => { document.getElementById('app').src = u; }, `${BASE}/index.html`);
await page.waitForTimeout(1500);
await page.evaluate(() => document.fonts.ready);
const app = page.frames().find((f) => f.url().endsWith('/index.html'));
await app.waitForSelector('.hero-num');

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

async function tap(selector, { pause = 380 } = {}) {
  const el = app.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  await page.evaluate(([x, y]) => window.tapAt(x, y, false), [b.x + b.width / 2, b.y + b.height / 2]);
  await wait(pause);
  await page.evaluate(([x, y]) => window.tapAt(x, y, true), [b.x + b.width / 2, b.y + b.height / 2]);
  await el.click();
}
async function smoothTo(selector, block = 'start') {
  await app.evaluate(([s, b]) => document.querySelector(s).scrollIntoView({ behavior: 'smooth', block: b }), [selector, block]);
  await wait(700);
}
async function addIngredient(search, { chip, qty }, fast) {
  await tap('.stage [data-act="add-ing"]', { pause: fast ? 120 : 300 });
  await wait(fast ? 120 : 350);
  await app.type('#pick-q', search, { delay: fast ? 20 : 60 });
  await wait(fast ? 60 : 250);
  await tap('.pick[data-pick="ing"]', { pause: fast ? 110 : 280 });
  await wait(fast ? 80 : 300);
  if (chip) await tap(`[data-quick="${chip[0]}"][data-unit="${chip[1]}"]`, { pause: fast ? 100 : 260 });
  else await app.type('#pk-qty', String(qty), { delay: fast ? 40 : 80 });
  await wait(fast ? 120 : 450);
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
await wait(700);
await app.type('#r-name', 'Torta de chocolate y frutillas', { delay: 28 });
await app.evaluate(() => document.activeElement.blur());
await wait(500);
await addIngredient('har', { qty: 300 });
await say('Cada precio sale de <em>lo que tú pagas</em>');
await addIngredient('hue', { chip: [4, 'u'] });
await say('Y la ves <em>crecer</em> en pantalla');
const fastStart = mark();
await addIngredient('cac', { qty: 60 }, true);
await addIngredient('frut', { chip: [500, 'g'] }, true);
await addIngredient('azú', { chip: [250, 'g'] }, true);
await addIngredient('crem', { chip: [250, 'ml'] }, true);
await addIngredient('mant', { chip: [100, 'g'] }, true);
speed.push([fastStart, mark(), 0.5]);

// 4. Extras: velas
await say('Suma la caja, las velas, <em>tus horas</em>');
const extrasStart = mark();
await smoothTo('#extra-chips', 'center');
await tap('[data-act="add-extra"][data-name="Velas"]');
await wait(300);
await app.type('input[data-in="extra"][data-k="cost"]', '900', { delay: 90 });
for (let i = 0; i < 6; i++) await tap('[data-act="step"][data-target="r-hours"][data-step="0.5"]', { pause: i ? 90 : 300 });
await page.evaluate(() => window.hideTap());
await wait(250);
speed.push([extrasStart, mark(), 0.65]);
await smoothTo('.stage');
await wait(1100);

// 5. Precio
await say('Elige tu <em>precio</em>');
await tap('.minibar [data-act="to-price"]');
await wait(1100);
await app.evaluate(async () => {
  const r = document.getElementById('r-margin');
  for (let v = Number(r.value); v <= 55; v++) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((res) => setTimeout(res, 70)); }
});
await wait(900);
await tap('[data-act="price-mode"][data-mode="custom"]');
await wait(400);
await app.type('#r-price', '42000', { delay: 110 });
await page.evaluate(() => window.hideTap());
await say('Y mira <em>cuánto ganas</em>');
await app.evaluate(() => document.activeElement.blur());
await smoothTo('#profit-box', 'center');
await wait(2200);

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
