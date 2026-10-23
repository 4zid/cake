/* ======================= Constantes ======================= */
const KEY = 'dulce-cuenta:data';
const SNAP_KEY = 'dulce-cuenta:snapshots';
const MAX_SNAPS = 7;
const UNITS = {
  g:   { type: 'mass', f: 1,    label: 'g' },
  kg:  { type: 'mass', f: 1000, label: 'kg' },
  ml:  { type: 'vol',  f: 1,    label: 'ml' },
  l:   { type: 'vol',  f: 1000, label: 'litros' },
  u:   { type: 'unit', f: 1,    label: 'unid.' },
  doc: { type: 'unit', f: 12,   label: 'docenas' }
};
const BY_TYPE = { mass: ['g', 'kg'], vol: ['ml', 'l'], unit: ['u', 'doc'] };
const PER = { mass: { f: 1000, label: 'kg' }, vol: { f: 1000, label: 'litro' }, unit: { f: 1, label: 'unidad' } };
const QUICK = {
  mass: [[50, 'g'], [100, 'g'], [150, 'g'], [250, 'g'], [500, 'g']],
  vol: [[50, 'ml'], [100, 'ml'], [200, 'ml'], [350, 'ml'], [500, 'ml']],
  unit: [[1, 'u'], [2, 'u'], [3, 'u'], [4, 'u'], [6, 'u']]
};
const CURRENCIES = [
  ['ARS', 'Peso argentino', 'es-AR'], ['MXN', 'Peso mexicano', 'es-MX'], ['CLP', 'Peso chileno', 'es-CL'],
  ['COP', 'Peso colombiano', 'es-CO'], ['PEN', 'Sol peruano', 'es-PE'], ['UYU', 'Peso uruguayo', 'es-UY'],
  ['BOB', 'Boliviano', 'es-BO'], ['PYG', 'Guaraní', 'es-PY'], ['GTQ', 'Quetzal', 'es-GT'],
  ['CRC', 'Colón costarricense', 'es-CR'], ['DOP', 'Peso dominicano', 'es-DO'], ['VES', 'Bolívar', 'es-VE'],
  ['USD', 'Dólar estadounidense', 'es-US'], ['EUR', 'Euro', 'es-ES']
];
/* Partes de la torta: cada ingrediente pertenece a una y se dibuja distinto. */
const CATS = [
  ['masa', 'Masa', 'Cada ingrediente de la masa suma bizcocho.'],
  ['relleno', 'Relleno', 'El relleno va entre las capas.'],
  ['cobertura', 'Cobertura', 'La cobertura baña la torta por arriba.'],
  ['deco', 'Decoración', 'La decoración va arriba de todo.']
];
const CAT_KEYS = CATS.map((c) => c[0]);
/* Ingredientes habituales: nombre, tamaño del paquete, unidad, parte de la torta e ilustración. */
const COMMON = [
  ['Harina 0000', 1, 'kg', 'masa', 'harina'], ['Azúcar', 1, 'kg', 'masa', 'azucar'], ['Huevos', 1, 'doc', 'masa', 'huevos'],
  ['Manteca', 200, 'g', 'masa', 'manteca'], ['Leche', 1, 'l', 'masa', 'leche'], ['Crema de leche', 350, 'ml', 'cobertura', 'crema'],
  ['Cacao amargo', 150, 'g', 'masa', 'cacao'], ['Dulce de leche repostero', 1, 'kg', 'relleno', 'ddl'],
  ['Polvo de hornear', 50, 'g', 'masa', 'polvo'], ['Esencia de vainilla', 100, 'ml', 'masa', 'vainilla'],
  ['Chocolate cobertura', 150, 'g', 'cobertura', 'chocolate'], ['Frutillas', 500, 'g', 'deco', 'frutillas'],
  ['Harina leudante', 1, 'kg', 'masa', 'harina'], ['Azúcar impalpable', 500, 'g', 'cobertura', 'azucar'], ['Aceite', 900, 'ml', 'masa', 'otro'],
  ['Queso crema', 290, 'g', 'relleno', 'crema'], ['Limones', 1, 'kg', 'relleno', 'otro'], ['Mermelada', 454, 'g', 'relleno', 'frutillas'],
  ['Coco rallado', 100, 'g', 'deco', 'otro'], ['Nueces', 100, 'g', 'deco', 'otro'], ['Merengue en polvo', 200, 'g', 'cobertura', 'azucar'],
  ['Colorante', 1, 'u', 'deco', 'otro'],
  ['Nutella', 350, 'g', 'relleno', 'chocolate'], ['Pistachos', 100, 'g', 'deco', 'frutos'], ['Almendras', 100, 'g', 'deco', 'frutos'],
  ['Chocolate blanco', 150, 'g', 'cobertura', 'chocolate'], ['Leche condensada', 395, 'g', 'relleno', 'leche'], ['Mascarpone', 250, 'g', 'relleno', 'crema'],
  ['Ricota', 500, 'g', 'relleno', 'crema'], ['Crema chantilly', 500, 'ml', 'cobertura', 'crema'], ['Fondant', 500, 'g', 'cobertura', 'azucar'],
  ['Maicena', 500, 'g', 'masa', 'harina'], ['Bicarbonato', 100, 'g', 'masa', 'polvo'], ['Café instantáneo', 100, 'g', 'masa', 'cacao'],
  ['Arándanos', 125, 'g', 'deco', 'frutillas'], ['Frambuesas', 125, 'g', 'deco', 'frutillas'], ['Granas de colores', 100, 'g', 'deco', 'granas'],
  ['Chips de chocolate', 150, 'g', 'deco', 'chocolate'], ['Manzanas', 1, 'kg', 'relleno', 'otro'], ['Zanahorias', 1, 'kg', 'masa', 'otro'],
  ['Galletitas', 170, 'g', 'masa', 'otro'], ['Gelatina sin sabor', 20, 'g', 'relleno', 'polvo'], ['Dulce de membrillo', 500, 'g', 'relleno', 'ddl']
];
const STARTER = COMMON.slice(0, 10);
/* Extras con ilustración propia. Cualquier otro extra se carga a mano. */
const XPRESETS = [['caja', 'Caja'], ['bandeja', 'Bandeja'], ['velas', 'Velas'], ['topper', 'Cartelito']];
const DAY = 86400000;
const MQ_MOBILE = '(max-width: 859px)';
const isMobile = () => window.matchMedia(MQ_MOBILE).matches;
const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } };

/* ======================= Utilidades ======================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const numOrNull = (v) => (v === '' || v == null ? null : num(v));
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const sum = (arr, fn) => arr.reduce((a, x) => a + (fn ? fn(x) : x), 0);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

function locale() {
  const c = CURRENCIES.find((x) => x[0] === state.settings.currency);
  return c ? c[2] : 'es';
}
const fmtCache = new Map();
function money(n) {
  if (!isFinite(n)) n = 0;
  const cur = state.settings.currency || 'ARS';
  const abs = Math.abs(n);
  const digits = abs >= 100 || abs === 0 ? 0 : 2;
  /* Montos chicos con centavos: "$77,10" y no "$77,1". */
  const minDigits = digits && Math.round(abs * 100) % 100 !== 0 ? 2 : 0;
  const k = cur + digits + minDigits;
  if (!fmtCache.has(k)) {
    try {
      fmtCache.set(k, new Intl.NumberFormat(locale(), { style: 'currency', currency: cur, minimumFractionDigits: minDigits, maximumFractionDigits: digits }));
    } catch (e) {
      fmtCache.set(k, { format: (x) => '$' + x.toFixed(digits) });
    }
  }
  /* "$ 1.200" -> "$1.200": el símbolo va pegado al número. */
  return fmtCache.get(k).format(n).replace(/^(-?)([^\d\s -]+)[\s ]+(?=\d)/, '$1$2');
}
function curSymbol() {
  try {
    const p = new Intl.NumberFormat(locale(), { style: 'currency', currency: state.settings.currency }).formatToParts(1);
    return (p.find((x) => x.type === 'currency') || {}).value || '$';
  } catch (e) { return '$'; }
}
const moneyInput = (id, attrs, value) => {
  const sym = esc(curSymbol());
  return `<span class="money" style="--cur-w:${sym.length}"><span class="cur" aria-hidden="true">${sym}</span><input id="${id}" type="number" min="0" step="any" inputmode="decimal" ${attrs} value="${esc(value)}" placeholder="0"></span>`;
};
const pct = (x) => `${Math.round(x * 100)}%`;
const fmtQty = (n) => new Intl.NumberFormat('es', { maximumFractionDigits: 2 }).format(n);
function ago(ts) {
  if (!ts) return 'sin fecha';
  const d = Math.floor((Date.now() - ts) / DAY);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  if (d < 14) return 'hace 1 semana';
  if (d < 30) return `hace ${Math.floor(d / 7)} semanas`;
  const m = Math.floor(d / 30);
  return m === 1 ? 'hace 1 mes' : `hace ${m} meses`;
}
const fmtDate = (ts, opts) => new Intl.DateTimeFormat('es', opts).format(new Date(ts));
function roundNice(x) {
  if (!(x > 0)) return 0;
  const step = x < 100 ? 1 : x < 1000 ? 10 : x < 10000 ? 50 : x < 100000 ? 100 : 500;
  return Math.ceil(x / step) * step;
}

/* ======================= Ingredientes: parte de la torta e ilustración ======================= */
function guessKind(name) {
  const n = norm(name);
  if (/dulce de leche|ddl|membrillo/.test(n)) return 'ddl';
  if (/pistach|almendr|nuez|nueces|avellan|castan|mani\b|coco/.test(n)) return 'frutos';
  if (/granas|grana|sprinkle|confit|colorines|perlas/.test(n)) return 'granas';
  if (/harina|maicena|almidon/.test(n)) return 'harina';
  if (/azucar|impalpable|glass|merengue|fondant/.test(n)) return 'azucar';
  if (/huevo/.test(n)) return 'huevos';
  if (/manteca|margarina/.test(n)) return 'manteca';
  if (/crema|queso|chantilly|ricota|mascarpone/.test(n)) return 'crema';
  if (/leche/.test(n)) return 'leche';
  if (/cacao|cafe/.test(n)) return 'cacao';
  if (/polvo|levadura|bicarbonato|gelatina/.test(n)) return 'polvo';
  if (/vainilla|esencia/.test(n)) return 'vainilla';
  if (/chocolate|ganache|nutella|cobertura/.test(n)) return 'chocolate';
  if (/frutilla|fresa|frambuesa|mermelada|arandano|cereza/.test(n)) return 'frutillas';
  return 'otro';
}
function guessCat(name) {
  const n = norm(name);
  if (/impalpable|glass|merengue|chantilly|ganache|cobertura|fondant/.test(n)) return 'cobertura';
  if (/coco|nuez|nueces|almendra|pistach|avellan|granas|confit|colorante|perla|sprinkle|chips|decor|flor|oblea|mani\b|arandano|frambuesa/.test(n)) return 'deco';
  if (/dulce de leche|ddl|mermelada|nutella|queso crema|limon|ricota|mascarpone|relleno|membrillo|condensada|gelatina|manzana/.test(n)) return 'relleno';
  const k = guessKind(name);
  if (k === 'chocolate' || k === 'crema') return 'cobertura';
  if (k === 'frutillas') return 'deco';
  if (k === 'ddl') return 'relleno';
  return 'masa';
}
const ingCat = (i) => (CAT_KEYS.includes(i.cat) ? i.cat : guessCat(i.name));
const ingKind = (i) => guessKind(i.name);
function shortName(name) {
  const n = norm(name);
  if (/dulce de leche/.test(n)) return 'Dulce de leche';
  if (/polvo de hornear/.test(n)) return 'Polvo hornear';
  if (/esencia de vainilla/.test(n)) return 'Vainilla';
  if (/^cacao/.test(n)) return 'Cacao';
  if (/^chocolate/.test(n)) return 'Chocolate';
  if (/^crema de leche/.test(n)) return 'Crema';
  if (/^harina 0000/.test(n)) return 'Harina';
  return String(name).replace(/\s+\d+$/, '');
}

/* ======================= Estado y guardado ======================= */
let storageOK = true;
function defaults() {
  return {
    app: 'dulce-cuenta', version: 1,
    settings: { business: '', currency: 'ARS', hourlyRate: 0, margin: 40, overhead: 0, onboarded: false, lastExport: null },
    ingredients: [], recipes: [], sales: []
  };
}
function normalize(d) {
  const base = defaults();
  d = d && typeof d === 'object' ? d : {};
  const arr = (x) => (Array.isArray(x) ? x : []);
  return {
    ...base,
    settings: { ...base.settings, ...(d.settings || {}) },
    ingredients: arr(d.ingredients).map((i) => ({ id: i.id || uid(), name: i.name || 'Ingrediente', packQty: num(i.packQty) || 1, packUnit: UNITS[i.packUnit] ? i.packUnit : 'u', price: num(i.price), type: UNITS[i.packUnit] ? UNITS[i.packUnit].type : 'unit', cat: CAT_KEYS.includes(i.cat) ? i.cat : '', updatedAt: i.updatedAt || Date.now(), sample: !!i.sample })),
    recipes: arr(d.recipes).map((r) => ({
      id: r.id || uid(), name: r.name || '', portions: num(r.portions) || 1,
      items: arr(r.items).filter((l) => l && l.ingId).map((l) => ({ id: l.id || uid(), ingId: l.ingId || '', qty: l.qty ?? '', unit: UNITS[l.unit] ? l.unit : 'g' })),
      extras: arr(r.extras).map((x) => ({ id: x.id || uid(), name: x.name || '', cost: x.cost ?? '' })),
      hours: r.hours ?? '', overhead: r.overhead ?? '', margin: r.margin ?? base.settings.margin, price: r.price ?? null,
      notes: r.notes || '', sample: !!r.sample, createdAt: r.createdAt || Date.now(), updatedAt: r.updatedAt || Date.now()
    })),
    sales: arr(d.sales).map((s) => ({ id: s.id || uid(), date: /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? s.date : todayISO(), recipeId: s.recipeId || '', title: s.title || 'Venta', client: s.client || '', price: num(s.price), cost: num(s.cost) }))
  };
}
function load() {
  try {
    const t = '__dc_test';
    localStorage.setItem(t, '1'); localStorage.removeItem(t);
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { storageOK = false; }
  return defaults();
}
let state = load();

let saveTimer = null;
function save() {
  setSaveState('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 300);
}
function persist() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    setSaveState('saved');
  } catch (e) {
    setSaveState('error');
  }
}
function setSaveState(s) {
  $$('.save-ind').forEach((el) => {
    el.classList.toggle('is-saving', s === 'saving');
    el.classList.toggle('is-error', s === 'error');
    const t = $('.save-text', el);
    if (t) t.textContent = s === 'saving' ? 'Guardando…' : s === 'error' ? 'No se pudo guardar' : (el.dataset.saved || 'Guardado');
  });
}
const saveInd = (saved) => `<p class="save-ind" role="status" data-saved="${esc(saved || 'Guardado')}"><i aria-hidden="true"></i><span class="save-text">${esc(saved || 'Guardado')}</span></p>`;
window.addEventListener('beforeunload', () => { if (saveTimer) persist(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) persist(); });

/* Copias automáticas: una por día de uso, con lo que había al abrir la app. */
function readSnaps() {
  try { return JSON.parse(localStorage.getItem(SNAP_KEY) || '[]'); } catch (e) { return []; }
}
function makeSnapshot(reason) {
  if (!hasData()) return;
  try {
    const list = readSnaps();
    const day = todayISO();
    if (reason === 'daily' && list.some((s) => s.day === day && s.reason === 'daily')) return;
    list.unshift({ id: uid(), day, at: Date.now(), reason, data: JSON.parse(JSON.stringify(state)) });
    localStorage.setItem(SNAP_KEY, JSON.stringify(list.slice(0, MAX_SNAPS)));
  } catch (e) { /* sin espacio: se omite la copia */ }
}
const hasData = () => state.ingredients.length + state.recipes.length + state.sales.length > 0;

/* ======================= Cálculos ======================= */
const findIng = (id) => state.ingredients.find((i) => i.id === id);
const findRecipe = (id) => state.recipes.find((r) => r.id === id);
function unitCost(ing) {
  const base = num(ing.packQty) * (UNITS[ing.packUnit] ? UNITS[ing.packUnit].f : 1);
  return base > 0 ? num(ing.price) / base : 0;
}
const ONE = { l: 'litro', u: 'unidad', doc: 'docena' };
const packLabel = (ing) => `${fmtQty(ing.packQty)} ${num(ing.packQty) === 1 && ONE[ing.packUnit] ? ONE[ing.packUnit] : UNITS[ing.packUnit].label}`;
const perLabel = (ing) => `${money(unitCost(ing) * PER[ing.type].f)} / ${PER[ing.type].label}`;
/* Versión corta para las fichas: "$1.200/kg", "$300/unid." */
const perShort = (ing) => (num(ing.price) > 0 ? `${money(unitCost(ing) * PER[ing.type].f)}/${ing.type === 'unit' ? 'unid.' : PER[ing.type].label}` : 'Sin precio');
function lineInfo(line) {
  const ing = findIng(line.ingId);
  if (!ing) return { ing: null, cost: 0, missing: !!line.ingId };
  const u = UNITS[line.unit];
  const f = u && u.type === ing.type ? u.f : 1;
  const uc = unitCost(ing);
  return { ing, cost: num(line.qty) * f * uc, missing: !(uc > 0) };
}
const qtyLabel = (ing, line) => {
  const q = fmtQty(num(line.qty));
  if (line.unit === 'u') return `${q} ${num(line.qty) === 1 ? 'unidad' : 'unidades'}`;
  if (line.unit === 'doc') return `${q} ${num(line.qty) === 1 ? 'docena' : 'docenas'}`;
  if (line.unit === 'l') return `${q} ${num(line.qty) === 1 ? 'litro' : 'litros'}`;
  return `${q} ${UNITS[line.unit].label}`;
};
function calc(r) {
  let ingredients = 0, missing = 0;
  const lines = [];
  for (const l of r.items) {
    const li = lineInfo(l);
    ingredients += li.cost;
    if (li.missing) missing++;
    if (li.ing) lines.push({ name: li.ing.name, kind: ingKind(li.ing), cost: li.cost });
  }
  const extras = sum(r.extras, (x) => num(x.cost));
  const labor = num(r.hours) * num(state.settings.hourlyRate);
  const overhead = num(r.overhead);
  const cost = ingredients + extras + labor + overhead;
  const m = clamp(num(r.margin), 0, 90) / 100;
  const suggested = roundNice(cost / (1 - m));
  const custom = num(r.price) > 0 ? num(r.price) : 0;
  const price = custom || suggested;
  const profit = price - cost;
  const portions = Math.max(1, Math.round(num(r.portions)) || 1);
  return {
    ingredients, extras, labor, overhead, cost, suggested, custom, price, profit, missing, portions, lines,
    marginReal: price > 0 ? profit / price : 0,
    perPortion: price / portions, costPortion: cost / portions
  };
}
function status(c) {
  if (c.cost <= 0) return { k: 'empty', t: 'Sin datos todavía' };
  if (c.profit < 0) return { k: 'loss', t: 'Pierdes dinero' };
  if (c.marginReal < 0.2) return { k: 'low', t: 'Margen bajo' };
  return { k: 'ok', t: 'Buen margen' };
}
const chip = (c) => { const s = status(c); return `<span class="chip ${s.k}"><i aria-hidden="true"></i>${s.t}</span>`; };

/* ======================= Qué se dibuja en la torta ======================= */
function extraKind(name) {
  const n = norm(name);
  if (/vela/.test(n)) return 'velas';
  if (/caja|packag|envase/.test(n)) return 'caja';
  if (/base|bandeja|plato|carton/.test(n)) return 'bandeja';
  if (/topper|cartel/.test(n)) return 'topper';
  if (/decor|perla|flor|granas|confit|sprinkle/.test(n)) return 'deco';
  return '';
}
/* Convierte la receta en las capas de la ilustración. */
function cakeProps(r) {
  const by = { masa: [], relleno: [], cobertura: [], deco: [] };
  for (const l of r.items) {
    const ing = findIng(l.ingId);
    if (ing) by[ingCat(ing)].push(norm(ing.name));
  }
  const all = [].concat(by.masa, by.relleno, by.cobertura, by.deco).join(' ');
  const has = (list, re) => list.some((n) => re.test(n));
  const masaN = by.masa.length;
  const kinds = new Set(r.extras.map((x) => extraKind(x.name)).filter(Boolean));
  const sabor = /red velvet|colorante/.test(all) ? 'redvelvet' : has(by.masa, /cacao|chocolate/) ? 'chocolate' : has(by.masa, /limon/) ? 'limon' : 'vainilla';
  const rs = has(by.relleno, /dulce de leche|ddl|nutella|membrillo/) ? 'ddl' : has(by.relleno, /frutilla|fresa|frambuesa|mermelada/) ? 'frutilla' : has(by.relleno, /limon/) ? 'limon' : 'crema';
  const cob = !by.cobertura.length ? 'ninguna'
    : has(by.cobertura, /chocolate blanco/) && !has(by.cobertura, /ganache|nutella|chocolate (?!blanco)|^chocolate$/) ? 'crema'
    : has(by.cobertura, /ganache|chocolate|nutella/) ? 'chocolate'
    : has(by.cobertura, /merengue/) ? 'merengue'
    : has(by.cobertura, /crema|chantilly|queso|impalpable|glass/) ? 'crema' : 'rosa';
  const granas = /granas|sprinkle|confit|colorines/.test(all);
  const fru = /frutilla|fresa/.test(all);
  const otherDeco = by.deco.some((n) => !/frutilla|fresa|granas|sprinkle|confit|colorines/.test(n)) || kinds.has('deco');
  return {
    masa: masaN >= 5 ? 3 : masaN >= 3 ? 2 : masaN >= 1 ? 1 : 0,
    relleno: by.relleno.length > 0, rellenoSabor: rs, cobertura: cob, sabor,
    frutillas: fru, rosetas: otherDeco, granas,
    velas: kinds.has('velas'), topper: kinds.has('topper'), caja: kinds.has('caja'), bandeja: kinds.has('bandeja')
  };
}
const recipeCount = (r) => r.items.filter((l) => findIng(l.ingId)).length;
