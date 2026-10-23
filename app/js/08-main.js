/* ======================= Tortas: duplicar, eliminar y menú ======================= */
function duplicateRecipe(id) {
  const r = findRecipe(id);
  if (!r) return;
  const copy = JSON.parse(JSON.stringify(r));
  copy.id = uid(); copy.name = (r.name || 'Torta') + ' (copia)'; copy.sample = false;
  copy.items.forEach((l) => (l.id = uid())); copy.extras.forEach((x) => (x.id = uid()));
  copy.createdAt = copy.updatedAt = Date.now();
  state.recipes.push(copy); save();
  go('recipe', { id: copy.id, step: 'ing' });
  toast('Torta duplicada. Ya puedes cambiarla.');
}
async function deleteRecipe(id) {
  const r = findRecipe(id);
  if (!r) return;
  const sold = state.sales.filter((s) => s.recipeId === r.id).length;
  const ok = await confirmBox({ title: `¿Eliminar “${r.name || 'Torta sin nombre'}”?`, text: `Se borra la receta y su cálculo.${sold ? ` Las ${plural(sold, 'venta anotada', 'ventas anotadas')} se conservan.` : ''}`, ok: 'Eliminar', danger: true });
  if (!ok) return;
  state.recipes = state.recipes.filter((x) => x.id !== r.id); save();
  if (route.view === 'recipe') go('recipes'); else render();
  toast('Torta eliminada');
}
function cardMenu(id) {
  const r = findRecipe(id);
  if (!r) return;
  const c = calc(r);
  const inEditor = route.view === 'recipe';
  const m = openSheet({
    label: `Opciones de ${r.name || 'Torta sin nombre'}`, cls: 'sheet-sm',
    html: `${sheetHead({ art: `<span class="sh-cake">${cakeHTML(thumbProps(r), '')}</span>`, title: r.name || 'Torta sin nombre', sub: `${money(c.price)} · ${plural(c.portions, 'porción', 'porciones')}` })}
      <div class="menu-list">
        ${inEditor ? '' : `<button type="button" class="menu-item" data-m="open" data-autofocus>${I.edit}<span>Editar torta</span></button>`}
        <button type="button" class="menu-item" data-m="sale" ${inEditor ? 'data-autofocus' : ''}>${ico(ICON_D.ventas, { s: 20 })}<span>Anotar venta</span></button>
        <button type="button" class="menu-item" data-m="dup">${ico(ICON_D.copy, { s: 20 })}<span>Duplicar</span></button>
        <button type="button" class="menu-item danger" data-m="del">${I.trash}<span>Eliminar</span></button>
      </div>`
  });
  $('.menu-list', m.el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    m.close();
    const k = b.dataset.m;
    if (k === 'open') go('recipe', { id, step: 'ing' });
    else if (k === 'sale') saleSheet(id);
    else if (k === 'dup') duplicateRecipe(id);
    else deleteRecipe(id);
  });
}

/* ======================= Acciones ======================= */
const actions = {
  'new-recipe': newRecipe,
  'new-ing': () => ingredientSheet(null),
  'edit-ing': (t) => ingredientSheet(findIng(t.dataset.id)),
  'new-sale': () => saleSheet(''),
  'sale-from-recipe': () => saleSheet(route.id),
  dview: (t) => {
    ui.dview = t.dataset.v;
    $$('[data-act="dview"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === ui.dview)));
    $('#ing-body').innerHTML = ingBody();
  },
  sview: (t) => { ui.sview = t.dataset.v; repaintPanel(); $(`[data-act="sview"][data-v="${ui.sview}"]`)?.focus(); },
  cat: (t) => { ui.cat = t.dataset.cat; repaintPanel(); $(`[data-act="cat"][data-cat="${ui.cat}"]`)?.focus(); },
  step: (t) => setStep(t.dataset.step),
  'next-step': nextStep,
  'open-ing': (t) => { const ing = findIng(t.dataset.id); if (ing) qtySheet(cur(), { ing }); },
  'more-ing': () => pickerSheet(cur()),
  'edit-line': (t) => { const r = cur(); const l = r.items.find((x) => x.id === t.dataset.id); if (l && findIng(l.ingId)) qtySheet(r, { ing: findIng(l.ingId) }); },
  'rm-line': (t) => {
    const r = cur();
    r.items = r.items.filter((l) => l.id !== t.dataset.id);
    touch(r); repaintPanel(); refreshCake(r);
    toast('Ingrediente quitado');
  },
  'toggle-extra': (t) => {
    const r = cur();
    const k = t.dataset.k;
    const name = (XPRESETS.find((p) => p[0] === k) || [])[1];
    const x = r.extras.find((e) => extraKind(e.name) === k);
    if (x) r.extras = r.extras.filter((e) => e.id !== x.id);
    else r.extras.push({ id: uid(), name, cost: '' });
    touch(r); repaintPanel();
    refreshCake(r, x ? '' : `+ ${name}`);
    if (!x) { const added = r.extras[r.extras.length - 1]; const inp = $(`#ex-cost-${added.id}`); if (inp) inp.focus({ preventScroll: true }); }
    else $(`[data-act="toggle-extra"][data-k="${k}"]`)?.focus();
  },
  'add-extra': () => {
    const r = cur();
    const x = { id: uid(), name: '', cost: '' };
    r.extras.push(x); touch(r); repaintPanel();
    $(`#ex-name-${x.id}`)?.focus();
  },
  'rm-extra': (t) => {
    const r = cur();
    r.extras = r.extras.filter((x) => x.id !== t.dataset.id);
    touch(r); repaintPanel(); refreshCake(r);
  },
  stepper: (t) => {
    const input = $('#' + t.dataset.target);
    input.value = Math.max(num(input.min), Math.round((num(input.value) + num(t.dataset.step)) * 100) / 100);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  },
  'price-mode': (t) => {
    const r = cur();
    const custom = t.dataset.mode === 'custom';
    r.price = custom ? (calc(r).price || null) : null;
    touch(r);
    $$('[data-act="price-mode"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === t.dataset.mode)));
    $('#pp-sug').hidden = custom;
    $('#pp-mio').hidden = !custom;
    const pi = $('#r-price');
    pi.value = r.price || '';
    updateOut();
    if (custom) { pi.focus(); pi.select(); }
  },
  'use-suggested': () => {
    const r = cur();
    r.price = calc(r).suggested || null; touch(r);
    $('#r-price').value = r.price || '';
    updateOut();
    toast('Precio sugerido aplicado');
  },
  'save-recipe': () => {
    const r = cur();
    persist();
    toast(`“${r.name || 'Torta sin nombre'}” guardada`);
    go('home');
  },
  'dup-recipe': () => duplicateRecipe(route.id),
  'del-recipe': () => deleteRecipe(route.id),
  'card-menu': (t) => cardMenu(t.dataset.id),
  'edit-sale': (t) => saleSheet('', t.dataset.id),
  'del-sale': async (t) => {
    const ok = await confirmBox({ title: '¿Borrar esta venta?', text: 'Se quita del resumen del mes.', ok: 'Borrar', danger: true });
    if (!ok) return;
    state.sales = state.sales.filter((s) => s.id !== t.dataset.id); save(); render();
    toast('Venta borrada');
  },
  month: (t) => {
    const [y, m] = ui.month.split('-').map(Number);
    const d = new Date(y, m - 1 + Number(t.dataset.d), 1);
    ui.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    render();
    $(`[data-act="month"][data-d="${t.dataset.d}"]`)?.focus();
  },
  export: exportFile,
  'copy-backup': copyBackup,
  'paste-backup': pasteBackup,
  'restore-snap': (t) => { const sn = readSnaps().find((s) => s.id === t.dataset.id); if (sn) restoreData(normalize(sn.data), 'snap'); },
  'lic-out': async () => {
    const ok = await confirmBox({ title: '¿Desactivar este dispositivo?', text: 'Para volver a usar la app acá tendrás que escribir tu código otra vez. Tus datos no se borran, pero descarga un respaldo si vas a cambiar de equipo.', ok: 'Desactivar', danger: true });
    if (!ok) return;
    persist();
    try { await fetch('/api/salir', { method: 'POST', credentials: 'same-origin' }); } catch (e) { toast('Necesitas conexión para desactivar'); return; }
    location.replace('/activar');
  },
  'replay-onb': () => onboarding(),
  'load-sample': () => { const r = addSample(); go('recipe', { id: r.id, step: 'ing' }); toast('Agregamos una torta de ejemplo'); },
  reset: async () => {
    const ok = await confirmBox({ title: '¿Borrar todos los datos?', text: 'Se eliminan tus tortas, ingredientes y ventas de este navegador. Guardamos una copia automática antes, por si te arrepientes.', ok: 'Borrar todo', danger: true });
    if (!ok) return;
    makeSnapshot('reset');
    state = defaults(); fmtCache.clear(); persist();
    go('home'); onboarding();
  }
};

const inputs = {
  r: (t) => {
    const r = cur(); if (!r) return;
    const k = t.dataset.k;
    if (k === 'name') { r.name = t.value.replace(/\n/g, ' '); fitTitle(); }
    else if (k === 'notes') r.notes = t.value;
    else if (k === 'price') r.price = numOrNull(t.value);
    else r[k] = t.value === '' ? '' : num(t.value);
    touch(r); updateOut();
  },
  extra: (t) => {
    const r = cur();
    const x = r.extras.find((e) => e.id === t.dataset.id); if (!x) return;
    if (t.dataset.k === 'cost') x.cost = t.value === '' ? '' : num(t.value);
    else { const before = extraKind(x.name); x.name = t.value; if (extraKind(x.name) !== before) refreshCake(r); }
    touch(r); updateOut();
  },
  margin: (t) => {
    const r = cur();
    r.margin = clamp(num(t.value), 0, 90);
    touch(r); updateOut();
  },
  setting: (t) => {
    const k = t.dataset.k;
    state.settings[k] = k === 'business' ? t.value : num(t.value);
    if (k === 'business') { const s = $('#brand-sub'); if (s) s.textContent = t.value || 'Costos y ganancias'; }
    save();
    if (route.view === 'recipe') updateOut();
  },
  search: (t) => { ui.q = t.value; $('#recipe-list').innerHTML = recipeList(); },
  isearch: (t) => { ui.iq = t.value; $('#ing-body').innerHTML = ingBody(); }
};

const changes = {
  'ing-price': (t) => {
    const ing = findIng(t.dataset.id); if (!ing) return;
    ing.price = num(t.value); ing.updatedAt = Date.now(); ing.sample = false;
    save();
    const row = t.closest('tr');
    row.classList.remove('is-sample');
    const tag = $('.in-txt .tag', row); if (tag) tag.remove();
    $('[data-unitcost]', row).innerHTML = num(ing.price) > 0 ? `<b>${money(unitCost(ing) * PER[ing.type].f)}</b><small>por ${PER[ing.type].label}</small>` : '<small>falta el precio</small>';
    const used = usedIn(ing.id).length;
    const agoCell = $('[data-ago]', row);
    agoCell.classList.remove('warn');
    agoCell.innerHTML = `hoy${used ? `<small>en ${plural(used, 'torta', 'tortas')}</small>` : ''}`;
    toast(used ? `Precio actualizado. ${plural(used, 'torta recalculada', 'tortas recalculadas')}` : 'Precio actualizado');
  },
  currency: (t) => { state.settings.currency = t.value; fmtCache.clear(); save(); render(); toast('Moneda cambiada'); },
  'import-file': (t) => { const f = t.files && t.files[0]; t.value = ''; readBackupFile(f); }
};

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go],[data-open],[data-act]');
  if (!t || t.closest('.overlay') || t.closest('.onb')) return;
  e.preventDefault();
  if (t.dataset.go) { go(t.dataset.go); return; }
  if (t.dataset.open) { go('recipe', { id: t.dataset.open, step: 'ing' }); return; }
  const fn = actions[t.dataset.act];
  if (fn) fn(t, e);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'r-name') { e.preventDefault(); e.target.blur(); } });
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.in && inputs[t.dataset.in] && !t.closest('.overlay') && !t.closest('.onb')) inputs[t.dataset.in](t, e);
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.ch && changes[t.dataset.ch] && !t.closest('.overlay') && !t.closest('.onb')) changes[t.dataset.ch](t, e);
});
window.addEventListener('resize', () => { if (route.view === 'recipe') fitTitle(); });

/* ======================= Inicio ======================= */
(function initRoute() {
  route = routeFromHash() || route;
  try { history.replaceState({ route }, '', routePath()); } catch (e) { /* sin historial */ }
})();
const NAV = [['home', 'Inicio', 'inicio'], ['recipes', 'Tortas', 'tortas'], ['ingredients', 'Ingredientes', 'ingredientes'], ['sales', 'Ventas', 'ventas'], ['settings', 'Ajustes', 'ajustes']];
$('#side-nav').innerHTML = NAV.map(([k, l, i]) => `<li><button type="button" class="nav-item" data-go="${k}" data-nav="${k}">${ico(ICON_D[i], { w: 1.9 })}<span>${l}</span></button></li>`).join('');
$('#tabbar').innerHTML = NAV.map(([k, l, i]) => `<button type="button" class="tab" data-go="${k}" data-nav="${k}"><span class="tab-pill">${ico(ICON_D[i], { w: 1.9 })}</span><span>${l}</span></button>`).join('');
$('#side-save').innerHTML = saveInd('Guardado en este navegador');
makeSnapshot('daily');
render();
if (!state.settings.onboarded) onboarding();

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* sin modo offline */ }
}
