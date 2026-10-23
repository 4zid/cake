/* ======================= Hojas, confirmaciones y avisos ======================= */
let overlays = 0;
function lockScroll(on) {
  overlays = Math.max(0, overlays + (on ? 1 : -1));
  document.body.style.overflow = overlays > 0 ? 'hidden' : '';
}
/* Hoja inferior en el celular, ventana centrada en escritorio. */
function openSheet({ html, label, cls = '', onClose }) {
  const prev = document.activeElement;
  const el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML = `<div class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1"><span class="grab" aria-hidden="true"></span>${html}</div>`;
  document.body.appendChild(el);
  lockScroll(true);
  const dlg = $('.sheet', el);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    el.remove();
    lockScroll(false);
    document.removeEventListener('keydown', onKey, true);
    if (onClose) onClose();
    if (prev && prev.focus && document.contains(prev)) prev.focus({ preventScroll: true });
  };
  const onKey = (e) => {
    if (!el.isConnected) return;
    const top = $$('.overlay').pop();
    if (top !== el) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {
      const f = $$('button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])', dlg).filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && (document.activeElement === f[0] || document.activeElement === dlg)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener('keydown', onKey, true);
  el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
  el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  setTimeout(() => { const f = $('[data-autofocus]', dlg); (f || dlg).focus({ preventScroll: true }); }, 0);
  return { el, dlg, close };
}
const sheetHead = ({ art = '', title, sub = '', titleHTML }) => `<div class="sh-head">${art ? `<span class="sh-art">${art}</span>` : ''}<div class="sh-titles"><h2>${titleHTML || esc(title)}</h2>${sub ? `<span class="sh-sub">${sub}</span>` : ''}</div><button type="button" class="sh-x" data-close aria-label="Cerrar">${I.close}</button></div>`;
function confirmBox({ title, text, ok = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const m = openSheet({
      label: title, cls: 'sheet-sm',
      html: `${sheetHead({ title })}<p class="sh-text">${esc(text)}</p><div class="sh-actions"><button type="button" class="btn" data-close>Cancelar</button><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button></div>`,
      onClose: () => { if (!answered) resolve(false); }
    });
    $('[data-ok]', m.el).addEventListener('click', () => { answered = true; m.close(); resolve(true); });
  });
}
let toastTimer;
function toast(msg) {
  let el = $('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2800);
}

/* ======================= Navegación ======================= */
const view = $('#view');
let route = { view: 'home' };
const ui = { q: '', iq: '', month: todayISO().slice(0, 7), dview: 'estantes', sview: 'estantes', cat: 'masa' };
const views = {};

function routeFromHash() {
  const m = /^#\/(torta\/([\w-]+)|recipes|ingredients|sales|settings|home)$/.exec(location.hash);
  if (!m) return null;
  return m[2] ? { view: 'recipe', id: m[2], step: 'ing' } : { view: m[1] };
}
const routePath = () => '#/' + (route.view === 'recipe' ? 'torta/' + route.id : route.view);
function go(v, params = {}, { replace = false } = {}) {
  if (saveTimer) persist();
  route = { view: v, ...params };
  try { history[replace ? 'replaceState' : 'pushState']({ route }, '', routePath()); } catch (e) { /* sin historial */ }
  render();
  window.scrollTo({ top: 0 });
  view.focus({ preventScroll: true });
}
window.addEventListener('popstate', (e) => {
  /* Los saltos dentro de la página (como "Saltar al contenido") no son rutas: se ignoran. */
  const next = e.state && e.state.route ? e.state.route : routeFromHash();
  if (!next) return;
  route = next;
  if (!(e.state && e.state.route)) { try { history.replaceState({ route }, '', routePath()); } catch (err) { /* sin historial */ } }
  $$('.overlay').forEach((o) => o.remove());
  overlays = 0; lockScroll(false);
  if (onbEl) lockScroll(true);
  render();
});
function render() {
  if (route.view === 'recipe' && !findRecipe(route.id)) route = { view: 'recipes' };
  const navKey = route.view === 'recipe' ? 'recipes' : route.view;
  $$('[data-nav]').forEach((b) => { if (b.dataset.nav === navKey) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  document.body.classList.toggle('in-editor', route.view === 'recipe');
  const sub = $('#brand-sub');
  if (sub) sub.textContent = state.settings.business || 'Costos y ganancias';
  view.innerHTML = (views[route.view] || views.home)();
  if (route.view === 'recipe') initEditor();
  if (route.view === 'settings') loadLicense();
  setSaveState(saveTimer ? 'saving' : 'saved');
}
/* Los estantes cambian de 6 a 3 columnas según el ancho. */
window.matchMedia(MQ_MOBILE).addEventListener('change', () => { if (['ingredients'].includes(route.view)) render(); });

/* ======================= Piezas compartidas ======================= */
const gainText = (c) => (c.cost > 0 ? `<span class="gain ${c.profit < 0 ? 'neg' : ''}">${c.profit < 0 ? 'pierdes' : 'ganas'} ${money(Math.abs(c.profit))}</span>` : '<span class="gain muted">sin costos todavía</span>');
const thumbProps = (r) => ({ ...cakeProps(r), velas: false, topper: false });
const editedAgo = (ts) => { const a = ago(ts); return a === 'hoy' ? 'editada hoy' : a === 'ayer' ? 'editada ayer' : a; };
function recipeCard(r) {
  const c = calc(r);
  const name = esc(r.name || 'Torta sin nombre');
  return `<div class="rcard">
    <span class="rcard-art">${cakeHTML(thumbProps(r), r.name || 'Torta')}</span>
    <button type="button" class="rcard-menu" data-act="card-menu" data-id="${r.id}" aria-label="Opciones de ${name}">${ico('M5 12h.01M12 12h.01M19 12h.01', { w: 3.2, s: 22 })}</button>
    <span class="rcard-body">
      <span class="rcard-top"><button type="button" class="rcard-name rcard-link" data-open="${r.id}">${name}</button>${chip(c)}</span>
      <span class="rcard-meta">${r.sample ? 'Ejemplo · ' : ''}${plural(c.portions, 'porción', 'porciones')} · ${editedAgo(r.updatedAt)}</span>
      <span class="rcard-price"><b class="price-d">${money(c.price)}</b>${gainText(c)}</span>
      ${c.missing ? '<span class="rcard-warn">Faltan precios de ingredientes</span>' : ''}
    </span>
  </div>`;
}
const newRecipeTile = (txt = 'Empieza vacía y súmale ingredientes.') => `<button type="button" class="rcard rcard-new" data-act="new-recipe">
  <span class="rcard-new-art">${cakeHTML({ masa: 0, velas: false, frutillas: false }, 'Torta vacía')}</span>
  <b>Nueva torta</b><span class="muted">${txt}</span></button>`;
const notice = (tone, icon, html, action) => `<div class="notice ${tone}">${icon}<p>${html}</p>${action}</div>`;
const noticeBtn = (label, attrs) => `<button type="button" class="notice-btn" ${attrs}>${label}</button>`;

/* ======================= Inicio ======================= */
views.home = () => {
  const s = state.settings;
  const month = todayISO().slice(0, 7);
  const sales = state.sales.filter((x) => x.date.slice(0, 7) === month);
  const income = sum(sales, (x) => x.price);
  const cost = sum(sales, (x) => x.cost);
  const profit = income - cost;
  const stale = state.ingredients.filter((i) => Date.now() - i.updatedAt > 30 * DAY && !i.sample);
  const samples = state.ingredients.filter((i) => i.sample);
  const sorted = [...state.recipes].sort((a, b) => b.updatedAt - a.updatedAt);
  const needsBackup = hasData() && (!s.lastExport || Date.now() - s.lastExport > 7 * DAY);
  const losing = state.recipes.filter((r) => { const c = calc(r); return c.cost > 0 && c.profit < 0; });
  const monthName = fmtDate(Date.now(), { month: 'long' });
  const days = s.lastExport ? Math.floor((Date.now() - s.lastExport) / DAY) : 0;

  const notices = [
    !storageOK && notice('red', I.alert, '<b>Tu navegador no deja guardar datos.</b> Puede ser una ventana privada: abre la app en una ventana normal para no perder lo que cargues.', ''),
    losing.length && notice('red', I.alert, losing.length === 1 ? `<b>“${esc(losing[0].name || 'Una torta')}” se vende por debajo del costo.</b> Revisa el precio.` : `<b>${losing.length} tortas se venden por debajo del costo.</b> Revisa los precios.`, noticeBtn('Revisar', `data-open="${losing[0].id}"`)),
    samples.length && notice('amber', I.alert, `${plural(samples.length, 'ingrediente tiene', 'ingredientes tienen')} <b>precio de ejemplo</b>.<span class="only-d"> Tus precios salen mejor con lo que pagaste.</span>`, noticeBtn('Revisar', 'data-go="ingredients"')),
    !samples.length && stale.length && notice('amber', I.tag, `${plural(stale.length, 'precio tiene', 'precios tienen')} <b>más de un mes</b>.<span class="only-d"> Actualízalos y tus tortas se recalculan solas.</span>`, noticeBtn('Actualizar', 'data-go="ingredients"')),
    needsBackup && notice('pink', I.shield, s.lastExport ? `Hace ${plural(days, 'día', 'días')} que no descargas un respaldo<span class="only-d"> de tus datos</span>.` : 'Todavía no descargaste un respaldo de tus datos.', noticeBtn('Descargar', 'data-act="export"'))
  ].filter(Boolean);

  const actions = `<button type="button" class="btn btn-primary" data-act="new-recipe">${I.plus}Armar torta</button><button type="button" class="btn" data-act="new-sale">${ico(ICON_D.ventas, { s: 20 })}Anotar venta</button>`;
  const shown = sorted.slice(0, 3);
  return `<div class="page page-home">
    <section class="hero" aria-labelledby="hola">
      <div class="hero-brand only-m"><span class="brand-word">Cuánto Cobro</span>${saveInd()}</div>
      <div class="hero-row">
        <div class="hero-main">
          <h1 id="hola" class="hello">${s.business ? `Hola, ${esc(s.business)}` : 'Hola'}</h1>
          <span class="eyebrow">Ganancia de ${esc(monthName)}</span>
          <b class="big-num${profit < 0 ? ' neg' : ''}">${money(profit)}</b>
          <span class="hero-sub">${sales.length ? `${plural(sales.length, 'torta vendida', 'tortas vendidas')} · ${money(income)} cobrados<span class="only-d"> · ${money(cost)} en costos</span>` : 'Anota tus ventas para ver cuánto ganas en el mes.'}</span>
          <div class="hero-actions only-d">${actions}</div>
        </div>
        <div class="hero-art">${localHTML(s.business, true)}</div>
      </div>
    </section>
    <div class="pbody">
      <div class="m-actions only-m">${actions}</div>
      ${notices.length ? `<section class="notices" aria-label="Avisos">${notices.join('')}</section>` : ''}
      <section class="sec" aria-labelledby="tortas-h">
        <div class="sec-head"><h2 id="tortas-h">Tus tortas</h2>${sorted.length > 3 ? `<button type="button" class="link" data-go="recipes">Ver las ${sorted.length}</button>` : ''}</div>
        <div class="rgrid">${shown.map(recipeCard).join('')}${newRecipeTile()}</div>
      </section>
    </div>
  </div>`;
};

/* ======================= Tortas ======================= */
views.recipes = () => `<div class="page">
  <header class="phead">
    <div><h1>Tus tortas</h1><p class="lead">Cada torta guarda su receta. Si cambia el precio de un ingrediente, el costo se actualiza solo.</p></div>
    <button type="button" class="btn btn-primary btn-sm" data-act="new-recipe">${I.plus}<span>Armar torta</span></button>
    ${state.recipes.length ? `<div class="ctl"><label class="search"><span class="sr">Buscar torta</span>${I.search}<input type="search" id="recipe-search" data-in="search" placeholder="Buscar torta" value="${esc(ui.q)}"></label></div>` : ''}
  </header>
  <div class="pbody"><div id="recipe-list">${recipeList()}</div></div>
</div>`;
function recipeList() {
  const q = norm(ui.q.trim());
  const list = [...state.recipes].filter((r) => !q || norm(r.name).includes(q)).sort((a, b) => b.updatedAt - a.updatedAt);
  if (state.recipes.length && !list.length) return `<p class="empty-line">No hay tortas que coincidan con “${esc(ui.q)}”.</p>`;
  return `<div class="rgrid">${list.map(recipeCard).join('')}${q ? '' : newRecipeTile(state.recipes.length ? 'Empieza vacía y súmale ingredientes.' : 'Agrega ingredientes uno por uno y mírala crecer.')}</div>`;
}

/* ======================= Despensa ======================= */
const usedIn = (ingId) => state.recipes.filter((r) => r.items.some((l) => l.ingId === ingId));
views.ingredients = () => {
  const n = state.ingredients.length;
  const samples = state.ingredients.filter((i) => i.sample).length;
  const old = state.ingredients.filter((i) => !i.sample && Date.now() - i.updatedAt > 30 * DAY).length;
  const stats = [plural(n, 'ingrediente', 'ingredientes')];
  if (samples) stats.push(`<b class="warn">${samples} con precio de ejemplo</b>`);
  return `<div class="page page-desp">
    <header class="phead">
      <div><h1>Tu despensa</h1>
        <p class="lead only-d">Lo que compras y cuánto pagaste. Si cambias un precio, tus tortas se recalculan solas.</p>
        <p class="lead only-m">${stats.join(' · ')}</p></div>
      <button type="button" class="btn btn-primary btn-sm" data-act="new-ing">${I.plus}<span>Nuevo<span class="only-d"> ingrediente</span></span></button>
      <div class="ctl">
        <label class="search"><span class="sr">Buscar ingrediente</span>${I.search}<input type="search" id="ing-search" data-in="isearch" placeholder="Buscar" value="${esc(ui.iq)}"></label>
        <p class="ctl-stats only-d">${stats.join(' · ')}${old ? ` · ${old} sin actualizar hace más de un mes` : ''}</p>
        <div class="seg seg-dark" role="group" aria-label="Cómo ver la despensa">
          <button type="button" data-act="dview" data-v="estantes" aria-pressed="${ui.dview === 'estantes'}">${I.grid}Estantes</button>
          <button type="button" data-act="dview" data-v="lista" aria-pressed="${ui.dview === 'lista'}">${I.list}Lista</button>
        </div>
      </div>
    </header>
    <div class="pbody"><div id="ing-body">${ingBody()}</div></div>
  </div>`;
};
function filteredIngs() {
  const q = norm(ui.iq.trim());
  return [...state.ingredients].filter((i) => !q || norm(i.name).includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
function ingBody() {
  if (!state.ingredients.length) {
    return `<div class="empty-card"><h2>Tu despensa está vacía</h2><p>Agrega harina, huevos, azúcar… con lo que pagaste. También puedes sumarlos mientras armas una torta.</p><button type="button" class="btn btn-primary" data-act="new-ing">${I.plus}Agregar el primero</button></div>`;
  }
  const list = filteredIngs();
  if (!list.length) return `<p class="empty-line">No hay ingredientes con ese nombre.</p>`;
  return ui.dview === 'lista' ? ingTable(list) : ingShelves(list);
}
const isOld = (i) => !i.sample && Date.now() - i.updatedAt > 30 * DAY;
function ingShelves(list) {
  const cols = isMobile() ? 3 : 6;
  const GROUPS = [['masa', 'Para la masa', ['masa']], ['rel', 'Rellenos y coberturas', ['relleno', 'cobertura']], ['deco', 'Decoración', ['deco']]];
  return `<div class="shelves">${GROUPS.map(([, title, cats]) => {
    const items = list.filter((i) => cats.includes(ingCat(i)));
    if (!items.length) return '';
    const rows = [];
    for (let k = 0; k < items.length; k += cols) rows.push(items.slice(k, k + cols));
    return `<section class="shelf-group"><h2>${title}</h2>${rows.map((row) => `<div class="shelf" style="--cols:${cols}">
      <div class="shelf-items">${row.map((i) => `<button type="button" class="shelf-btn" data-act="edit-ing" data-id="${i.id}" aria-label="Editar ${esc(i.name)}: ${money(i.price)} el paquete de ${packLabel(i)}${i.sample ? ', precio de ejemplo' : ''}">${ingArtFor(i)}</button>`).join('')}</div>
      <div class="plank" aria-hidden="true"></div>
      <div class="shelf-tags">${row.map((i) => `<div class="tagcol"><span class="stem" aria-hidden="true"></span><button type="button" class="pricetag${i.sample ? ' is-sample' : ''}" data-act="edit-ing" data-id="${i.id}" tabindex="-1" aria-hidden="true">
        <span class="pt-name">${esc(shortName(i.name))}</span><b class="pt-price">${num(i.price) > 0 ? money(i.price) : 'Sin precio'}</b>
        <span class="pt-pack">${packLabel(i)}${num(i.price) > 0 ? `<span class="pt-per"> · ${money(unitCost(i) * PER[i.type].f)}/${PER[i.type].label}</span>` : ''}</span>
        ${i.sample ? '<span class="pt-flag">de ejemplo</span>' : isOld(i) ? `<span class="pt-old">${ago(i.updatedAt)}</span>` : ''}</button></div>`).join('')}</div>
    </div>`).join('')}</section>`;
  }).join('')}</div>`;
}
function ingTable(list) {
  return `<div class="table-wrap"><table class="itable">
    <caption class="sr">Precios de tus ingredientes</caption>
    <thead><tr><th scope="col">Ingrediente</th><th scope="col" class="c-pack">Paquete</th><th scope="col">Pagaste</th><th scope="col" class="r">Te sale</th><th scope="col" class="r c-upd">Actualizado</th></tr></thead>
    <tbody>${list.map((i) => {
      const used = usedIn(i.id).length;
      return `<tr class="${i.sample ? 'is-sample' : ''}" data-ing="${i.id}">
        <th scope="row"><button type="button" class="in-name" data-act="edit-ing" data-id="${i.id}"><span class="in-art">${ingArtFor(i, 36)}</span>
          <span class="in-txt"><b>${esc(i.name)}</b>${i.sample ? '<span class="tag">de ejemplo</span>' : ''}<small class="only-m">${packLabel(i)} · ${i.sample ? 'de ejemplo' : ago(i.updatedAt)}${used ? ` · en ${plural(used, 'torta', 'tortas')}` : ''}</small></span></button></th>
        <td class="c-pack">${packLabel(i)}</td>
        <td><label class="in-price"><span class="sr">Precio de ${esc(i.name)}, paquete de ${packLabel(i)}</span>${moneyInput(`ip-${i.id}`, `class="inp" data-ch="ing-price" data-id="${i.id}"`, num(i.price) || '')}</label></td>
        <td class="r" data-unitcost>${num(i.price) > 0 ? `<b>${money(unitCost(i) * PER[i.type].f)}</b><small>por ${PER[i.type].label}</small>` : '<small>falta el precio</small>'}</td>
        <td class="r c-upd ${i.sample || isOld(i) ? 'warn' : ''}" data-ago>${i.sample ? 'Precio de ejemplo' : ago(i.updatedAt)}${used ? `<small>en ${plural(used, 'torta', 'tortas')}</small>` : ''}</td>
      </tr>`;
    }).join('')}</tbody></table></div>
    ${state.ingredients.some((i) => i.sample) ? `<p class="legend-note"><i aria-hidden="true"></i>Precio de ejemplo: cámbialo por lo que pagaste para que tus precios sean reales.</p>` : ''}`;
}

/* ======================= Ventas ======================= */
const saleThumb = (s) => {
  const r = findRecipe(s.recipeId);
  return cakeHTML(r ? thumbProps(r) : { masa: 2, relleno: true, cobertura: 'rosa', frutillas: false, velas: false }, s.title);
};
views.sales = () => {
  const mk = ui.month;
  const list = state.sales.filter((s) => s.date.slice(0, 7) === mk).sort((a, b) => b.date.localeCompare(a.date));
  const income = sum(list, (s) => s.price), cost = sum(list, (s) => s.cost), profit = income - cost;
  const [y, mo] = mk.split('-').map(Number);
  const label = `${fmtDate(new Date(y, mo - 1, 1), { month: 'long' })} ${y}`;
  const lastSale = state.sales.reduce((a, s) => (s.date.slice(0, 7) > a ? s.date.slice(0, 7) : a), todayISO().slice(0, 7));
  const rank = {};
  list.forEach((s) => { const k = s.recipeId || s.title; (rank[k] = rank[k] || { s, n: 0, g: 0 }); rank[k].n++; rank[k].g += s.price - s.cost; });
  const top = Object.values(rank).sort((a, b) => b.g - a.g).slice(0, 4);
  const addBtn = `<button type="button" class="btn btn-primary btn-sm" data-act="new-sale">${I.plus}<span>Anotar venta</span></button>`;
  return `<div class="page page-sales">
    <header class="phead">
      <div class="sales-top"><h1>Ventas</h1>
        <div class="month-nav"><button type="button" class="mn-btn" data-act="month" data-d="-1" aria-label="Mes anterior">${ico(ICON_D.back, { w: 2.2, s: 20 })}</button><span class="mn-label" aria-live="polite">${esc(label)}</span><button type="button" class="mn-btn" data-act="month" data-d="1" aria-label="Mes siguiente" ${mk >= lastSale ? 'disabled' : ''}>${ico(ICON_D.next, { w: 2.2, s: 20 })}</button></div>
      </div>
      <span class="only-d">${addBtn}</span>
      <div class="stats">
        <div class="stat stat-main"><span>Ganaste</span><b class="${profit < 0 ? 'neg' : ''}">${money(profit)}</b></div>
        <div class="stat"><span>Cobraste</span><b>${money(income)}</b></div>
        <div class="stat"><span>Costos</span><b>${money(cost)}</b></div>
        <div class="stat only-d"><span>Tortas vendidas</span><b>${list.length}</b></div>
      </div>
    </header>
    <div class="pbody">
      <div class="m-actions only-m one">${addBtn.replace('btn-sm', 'btn-lg btn-block')}</div>
      ${list.length ? `<div class="sales-grid">
        <section aria-labelledby="ventas-h"><h2 id="ventas-h" class="sec-title"><span class="only-d">Cada venta</span><span class="only-m">${plural(list.length, 'torta vendida', 'tortas vendidas')}</span></h2>
          <div class="table-wrap"><table class="stable"><caption class="sr">Ventas de ${esc(label)}</caption>
            <thead><tr><th scope="col">Fecha</th><th scope="col">Torta</th><th scope="col" class="r">Cobraste</th><th scope="col" class="r">Ganaste</th><th scope="col"><span class="sr">Borrar</span></th></tr></thead>
            <tbody>${list.map((s) => {
              const d = new Date(s.date + 'T12:00:00');
              const p = s.price - s.cost;
              return `<tr class="srow" data-act="edit-sale" data-id="${s.id}"><td class="s-date"><b>${d.getDate()}</b><small>${esc(fmtDate(d, { month: 'short' }).replace('.', ''))}</small></td>
                <td class="s-cake"><span class="s-thumb">${saleThumb(s)}</span><span class="s-name"><b>${esc(s.title)}</b>${s.client ? `<small>${esc(s.client)}</small>` : ''}</span></td>
                <td class="r s-price"><b>${money(s.price)}</b><small class="only-m ${p < 0 ? 'neg' : 'pos'}">${p < 0 ? '' : '+'}${money(p)}</small></td>
                <td class="r s-gain only-d ${p < 0 ? 'neg' : 'pos'}">${p < 0 ? '' : '+'}${money(p)}</td>
                <td class="s-del"><button type="button" class="icon-btn" data-act="edit-sale" data-id="${s.id}" aria-label="Editar venta de ${esc(s.title)} del ${d.getDate()} de ${esc(fmtDate(d, { month: 'long' }))}">${I.edit}</button><button type="button" class="icon-btn" data-act="del-sale" data-id="${s.id}" aria-label="Borrar venta de ${esc(s.title)} del ${d.getDate()} de ${esc(fmtDate(d, { month: 'long' }))}">${I.trash}</button></td></tr>`;
            }).join('')}</tbody></table></div>
        </section>
        <aside class="topsold" aria-labelledby="top-h"><h2 id="top-h">Lo que más vendiste</h2>${top.map((t) => `<div class="ts-row"><span class="ts-thumb">${saleThumb(t.s)}</span><span class="ts-name"><b>${esc(t.s.title)}</b><small>${t.n === 1 ? '1 vez' : t.n + ' veces'}</small></span><b class="pos">${t.g < 0 ? '' : '+'}${money(t.g)}</b></div>`).join('')}</aside>
      </div>` : `<div class="empty-card"><h2>Sin ventas en este mes</h2><p>Cuando entregues una torta, anótala acá. Tomamos el costo de la receta para calcular cuánto ganaste.</p><button type="button" class="btn btn-primary" data-act="new-sale">${I.plus}Anotar venta</button></div>`}
    </div>
  </div>`;
};

/* ======================= Ajustes ======================= */
views.settings = () => {
  const s = state.settings;
  const snaps = readSnaps();
  return `<div class="page page-settings">
    <header class="phead"><div><h1>Ajustes</h1><p class="lead">Tus datos de cocina y las copias de seguridad.</p></div></header>
    <div class="pbody settings">
      <section class="card stack"><h2>Tu pastelería</h2>
        <div class="grid-2">
          <label class="field"><span>Nombre</span><input class="inp" id="set-business" data-in="setting" data-k="business" value="${esc(s.business)}" maxlength="40" placeholder="Ej: Dulces de Ana" autocomplete="organization"></label>
          <label class="field"><span>Moneda</span><span class="select"><select class="inp" id="set-currency" data-ch="currency">${CURRENCIES.map((c) => `<option value="${c[0]}" ${c[0] === s.currency ? 'selected' : ''}>${c[1]} (${c[0]})</option>`).join('')}</select></span></label>
        </div>
      </section>
      <section class="card stack"><h2>Valores por defecto</h2>
        <p class="hint">Se usan al crear una torta nueva. El valor de tu hora se aplica a todas.</p>
        <div class="grid-3">
          <label class="field"><span>Tu hora vale</span>${moneyInput('set-rate', 'data-in="setting" data-k="hourlyRate" class="inp"', s.hourlyRate || '')}</label>
          <label class="field"><span>Margen de ganancia (%)</span><input class="inp" id="set-margin" type="number" min="0" max="90" step="1" inputmode="numeric" data-in="setting" data-k="margin" value="${esc(s.margin)}"></label>
          <label class="field"><span>Gas, luz y otros por torta</span>${moneyInput('set-overhead', 'data-in="setting" data-k="overhead" class="inp"', s.overhead || '')}</label>
        </div>
      </section>
      <section class="card stack" id="lic-box" hidden aria-labelledby="lic-title"><h2 id="lic-title">Tu licencia</h2><p class="hint" id="lic-info"></p><div class="row"><button type="button" class="btn btn-sm" data-act="lic-out">Desactivar este dispositivo</button></div><p class="hint">Úsalo si vas a cambiar de teléfono o computadora: libera un lugar para activar el nuevo. Antes descarga un respaldo, porque los datos quedan en este navegador.</p><div class="stack" id="lic-guarantee" hidden><p class="hint" id="lic-g-text"></p><div class="row"><button type="button" class="btn btn-sm" data-act="lic-refund">Pedir devolución</button></div></div></section>
      <section class="card stack" aria-labelledby="bk-title"><h2 id="bk-title">Respaldo de tus datos</h2>
        <p class="hint">Todo se guarda en este navegador. Descarga un respaldo de vez en cuando para no perder nada si cambias de teléfono o borras el historial. ${s.lastExport ? `Último respaldo: ${ago(s.lastExport)}.` : 'Todavía no hiciste ninguno.'}</p>
        <div class="row">
          <button type="button" class="btn btn-primary btn-sm" data-act="export">${I.down}Descargar respaldo</button>
          <button type="button" class="btn btn-sm" data-act="copy-backup">${I.copy}Copiar como texto</button>
        </div>
        <div class="row">
          <label class="btn btn-sm" for="import-file">${I.up}Restaurar desde archivo</label>
          <input id="import-file" type="file" accept=".json,application/json,text/plain" class="sr" data-ch="import-file">
          <button type="button" class="btn btn-sm" data-act="paste-backup">Pegar respaldo</button>
        </div>
        <p class="hint">Si la descarga no empieza, usa “Copiar como texto” y pégalo en una nota o en un mail para ti.</p>
      </section>
      <section class="card stack"><h2>Copias automáticas</h2>
        <p class="hint">La app guarda sola una copia cada día que la abres (las últimas ${MAX_SNAPS}) y antes de restaurar o borrar. Sirven si te equivocas, pero viven en este mismo navegador.</p>
        ${snaps.length ? `<ul class="snap-list">${snaps.map((sn) => `<li><span><b>${esc(fmtDate(sn.at, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</b><small>${sn.reason === 'daily' ? 'Al abrir la app' : sn.reason === 'import' ? 'Antes de restaurar' : 'Antes de borrar'} · ${plural((sn.data.recipes || []).length, 'torta', 'tortas')}, ${plural((sn.data.ingredients || []).length, 'ingrediente', 'ingredientes')}</small></span><button type="button" class="btn btn-sm" data-act="restore-snap" data-id="${sn.id}">Volver a esta copia</button></li>`).join('')}</ul>` : '<p class="hint">Aún no hay copias automáticas. Aparecen desde el segundo día de uso.</p>'}
      </section>
      <section class="card stack"><h2>Otras opciones</h2>
        <div class="row">
          <button type="button" class="btn btn-sm" data-act="replay-onb">Ver la introducción otra vez</button>
          <button type="button" class="btn btn-sm" data-act="load-sample">Agregar torta de ejemplo</button>
          <button type="button" class="btn btn-sm btn-danger-o" data-act="reset">${I.trash}Borrar todos los datos</button>
        </div>
      </section>
    </div>
  </div>`;
};
