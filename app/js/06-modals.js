/* ======================= Hoja "¿Cuánto usas?" ======================= */
/* spec.ing: ingrediente de la despensa; spec.preset: { name, packQty, packUnit, cat } para uno que todavía no está. */
function qtySheet(r, spec) {
  const ing = spec.ing || null;
  const p = spec.preset || {};
  const line = ing ? r.items.find((l) => l.ingId === ing.id) : null;
  const st = {
    name: ing ? ing.name : (p.name || ''), packQty: ing ? ing.packQty : (p.packQty || 1), packUnit: ing ? ing.packUnit : (p.packUnit || 'kg'),
    price: ing ? ing.price : '', cat: ing ? ingCat(ing) : (p.cat || guessCat(p.name || '')),
    qty: line ? line.qty : '', unit: line ? line.unit : null, editBuy: false
  };
  const type = () => UNITS[st.packUnit].type;
  const fixUnit = () => { if (!st.unit || !UNITS[st.unit] || UNITS[st.unit].type !== type()) st.unit = BY_TYPE[type()][0]; };
  const showBuy = () => !ing || st.editBuy || !(num(ing.price) > 0);
  const m = openSheet({ label: ing ? ing.name : 'Ingrediente nuevo', html: '<div class="sh-body"></div>' });
  const box = $('.sh-body', m.el);

  const paint = () => {
    fixUnit();
    const kind = guessKind(st.name || '');
    const buy = showBuy();
    const sub = ing && num(ing.price) > 0 && !st.editBuy
      ? `Lo compras a <b>${money(ing.price)}</b> el paquete de ${packLabel(ing)} <button type="button" class="link link-sm" data-editbuy>Cambiar precio</button>`
      : ing ? 'Todavía no tiene precio. Cárgalo abajo.' : 'Nuevo en tu despensa';
    box.innerHTML = `${sheetHead({ art: ingArt(kind, 70), title: ing ? ing.name : (st.name || 'Ingrediente nuevo'), sub })}
      ${buy ? `<fieldset class="fs"><legend>¿Cómo lo compras?</legend>
        ${!ing ? `<label class="field"><span>Nombre</span><input class="inp" id="pk-name" value="${esc(st.name)}" maxlength="40" autocomplete="off"></label>` : ''}
        <div class="grid-3">
          <label class="field"><span>Paquete de</span><input class="inp" id="pk-pqty" type="number" min="0" step="any" inputmode="decimal" value="${esc(st.packQty)}"></label>
          <label class="field"><span>Unidad</span><span class="select"><select class="inp" id="pk-punit">${Object.keys(UNITS).map((k) => `<option value="${k}" ${k === st.packUnit ? 'selected' : ''}>${UNITS[k].label}</option>`).join('')}</select></span></label>
          <label class="field"><span>Pagaste</span>${moneyInput('pk-price', 'class="inp"', num(st.price) || '')}</label>
        </div>
        ${!ing ? `<label class="field"><span>¿Para qué parte de la torta?</span><span class="select"><select class="inp" id="pk-cat">${CATS.map(([k, l]) => `<option value="${k}" ${k === st.cat ? 'selected' : ''}>${l}</option>`).join('')}</select></span></label>` : ''}
        <p class="hint" id="pk-per"></p></fieldset>` : ''}
      <fieldset class="fs"><legend>¿Cuánto usas en esta torta?</legend>
        <div class="pills">${QUICK[type()].map(([q, u]) => `<button type="button" class="pill pill-q" data-quick="${q}" data-unit="${u}">${fmtQty(q)}${u === 'u' ? '' : ' ' + UNITS[u].label}</button>`).join('')}</div>
        <div class="qty-wrap"><label class="sr" for="pk-qty">Cantidad</label><input id="pk-qty" class="inp inp-xl" type="number" min="0" step="any" inputmode="decimal" value="${esc(st.qty)}" placeholder="0">
          <label class="sr" for="pk-unit">Unidad</label><span class="qty-unit"><select id="pk-unit">${BY_TYPE[type()].map((k) => `<option value="${k}" ${k === st.unit ? 'selected' : ''}>${UNITS[k].label}</option>`).join('')}</select></span></div>
      </fieldset>
      <p class="sum-box" id="pk-out" aria-live="polite"></p>
      <div class="sh-actions"><button type="button" class="btn" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-confirm>${line ? 'Guardar cantidad' : 'Agregar a la torta'}</button></div>`;
    preview();
    const f = $(!ing && !String(st.name).trim() ? '#pk-name' : buy && !(num(st.price) > 0) ? '#pk-price' : '#pk-qty', box);
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
  };
  const tmpIng = () => (showBuy() ? { packQty: num(st.packQty), packUnit: st.packUnit, price: num(st.price), type: type() } : ing);
  const preview = () => {
    const t = tmpIng();
    const uc = unitCost(t);
    const per = $('#pk-per', box);
    if (per) per.textContent = uc > 0 ? `Te sale a ${perLabel(t)}.` : 'Si no sabes el precio ahora, puedes cargarlo después.';
    const add = num(st.qty) * UNITS[st.unit].f * uc;
    const prev = line ? lineInfo(line).cost : 0;
    const after = calc(r).ingredients - prev + add;
    $('#pk-out', box).innerHTML = uc > 0
      ? `<span>Suma <b>${money(add)}</b> a esta torta</span><small>Los ingredientes pasan a costar ${money(after)}</small>`
      : '<span>Sin precio no podemos calcular cuánto suma.</span>';
    $$('[data-quick]', box).forEach((b) => b.setAttribute('aria-pressed', String(num(b.dataset.quick) === num(st.qty) && b.dataset.unit === st.unit)));
  };
  box.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'pk-name') { st.name = t.value; if (!st.catTouched) { st.cat = guessCat(t.value); const c = $('#pk-cat', box); if (c) c.value = st.cat; } }
    if (t.id === 'pk-pqty') st.packQty = t.value;
    if (t.id === 'pk-price') st.price = t.value;
    if (t.id === 'pk-qty') st.qty = t.value;
    preview();
  });
  box.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'pk-punit') { st.packUnit = t.value; paint(); }
    if (t.id === 'pk-unit') { st.unit = t.value; preview(); }
    if (t.id === 'pk-cat') { st.cat = t.value; st.catTouched = true; }
  });
  box.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-editbuy]')) { st.editBuy = true; paint(); return; }
    const qb = t.closest('[data-quick]');
    if (qb) { st.qty = num(qb.dataset.quick); st.unit = qb.dataset.unit; $('#pk-qty', box).value = st.qty; $('#pk-unit', box).value = st.unit; preview(); }
    if (t.closest('[data-confirm]')) confirm();
  });
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); confirm(); } });

  function confirm() {
    const name = (ing ? ing.name : String(st.name || '')).trim();
    if (!name) { toast('Ponle un nombre al ingrediente'); $('#pk-name', box)?.focus(); return; }
    if (!(num(st.packQty) > 0)) { toast('Indica el tamaño del paquete'); $('#pk-pqty', box)?.focus(); return; }
    if (!(num(st.qty) > 0)) { toast('Indica cuánto usas'); $('#pk-qty', box)?.focus(); return; }
    let target = ing;
    const t = type();
    if (!target) {
      target = state.ingredients.find((i) => norm(i.name) === norm(name));
      if (!target) {
        target = { id: uid(), name, packQty: num(st.packQty), packUnit: st.packUnit, price: num(st.price), type: t, cat: st.cat, updatedAt: Date.now(), sample: false };
        state.ingredients.push(target);
      }
    } else if (showBuy()) {
      const changed = num(st.price) !== num(target.price) || num(st.packQty) !== num(target.packQty) || st.packUnit !== target.packUnit;
      Object.assign(target, { packQty: num(st.packQty), packUnit: st.packUnit, price: num(st.price), type: t });
      if (changed) { target.updatedAt = Date.now(); target.sample = false; }
      state.recipes.forEach((rr) => rr.items.forEach((l) => { if (l.ingId === target.id && UNITS[l.unit].type !== t) l.unit = BY_TYPE[t][0]; }));
    }
    let l = r.items.find((x) => x.ingId === target.id);
    const isNew = !l;
    if (l) { l.qty = num(st.qty); l.unit = st.unit; }
    else { l = { id: uid(), ingId: target.id, qty: num(st.qty), unit: st.unit }; r.items.push(l); }
    if (isNew && CAT_KEYS.includes(ingCat(target))) ui.cat = ingCat(target);
    touch(r);
    m.close();
    const li = lineInfo(l);
    repaintPanel();
    refreshCake(r, `${isNew ? '+ ' : ''}${shortName(target.name)}${li.cost > 0 ? ` · ${money(li.cost)}` : ''}`);
  }
  paint();
}

/* "Otro ingrediente": sugerencias comunes o uno nuevo. */
function pickerSheet(r) {
  const st = { q: '' };
  const cat = CAT_KEYS.includes(ui.cat) ? ui.cat : 'masa';
  const m = openSheet({
    label: 'Agregar ingrediente',
    html: `${sheetHead({ title: 'Agregar ingrediente', sub: 'Elige uno común o escribe el tuyo.' })}
      <label class="search search-lg"><span class="sr">Buscar o escribir un ingrediente</span>${I.search}<input type="search" id="pick-q" placeholder="Buscar o escribir uno nuevo" autocomplete="off" data-autofocus></label>
      <div class="pick-list" id="pick-list"></div>`
  });
  const list = $('#pick-list', m.el);
  const paint = () => {
    const q = norm(st.q.trim());
    const mineNames = new Set(state.ingredients.map((i) => norm(i.name)));
    const mine = q ? state.ingredients.filter((i) => norm(i.name).includes(q)) : [];
    const common = COMMON.filter(([n]) => !mineNames.has(norm(n)) && (!q || norm(n).includes(q)));
    const sorted = q ? common : [...common.filter((c) => c[3] === cat), ...common.filter((c) => c[3] !== cat)];
    const exact = mineNames.has(q) || COMMON.some(([n]) => norm(n) === q);
    const catName = (k) => CATS.find((c) => c[0] === k)[1];
    let html = '';
    if (mine.length) html += `<p class="pick-group">En tu despensa</p>` + mine.map((i) => `<button type="button" class="pick" data-pick="ing" data-id="${i.id}">${ingArtFor(i, 40)}<span><b>${esc(i.name)}</b><small>${catName(ingCat(i))} · ${perShort(i)}</small></span></button>`).join('');
    if (sorted.length) html += `<p class="pick-group">Comunes en pastelería</p>` + sorted.slice(0, q ? 20 : 14).map(([n, qty, u, c, k]) => `<button type="button" class="pick" data-pick="common" data-name="${esc(n)}">${ingArt(k, 40)}<span><b>${esc(n)}</b><small>${catName(c)} · paquete de ${packLabel({ packQty: qty, packUnit: u })}</small></span><span class="pick-plus" aria-hidden="true">+</span></button>`).join('');
    if (q && !exact) html += `<button type="button" class="pick pick-new" data-pick="new">${ingArt(guessKind(st.q), 40)}<span><b>Crear “${esc(st.q.trim())}”</b><small>Ingrediente nuevo en tu despensa</small></span></button>`;
    if (!html) html = `<p class="empty-line">Ya tienes todos los comunes. Escribe el nombre para crear uno nuevo.</p>`;
    list.innerHTML = html;
  };
  const qi = $('#pick-q', m.el);
  qi.addEventListener('input', () => { st.q = qi.value; paint(); });
  qi.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const f = $('.pick', list); if (f) f.click(); } });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    m.close();
    const k = b.dataset.pick;
    if (k === 'ing') qtySheet(r, { ing: findIng(b.dataset.id) });
    else if (k === 'common') { const c = COMMON.find(([n]) => n === b.dataset.name); qtySheet(r, { preset: { name: c[0], packQty: c[1], packUnit: c[2], cat: c[3] } }); }
    else qtySheet(r, { preset: { name: st.q.trim(), packQty: 1, packUnit: 'kg', cat: guessCat(st.q) || cat } });
  });
  paint();
}

/* ======================= Ingrediente de la despensa ======================= */
function ingredientSheet(ing) {
  const isNew = !ing;
  const d = ing ? { ...ing, cat: ingCat(ing) } : { name: '', packQty: 1, packUnit: 'kg', price: '', cat: 'masa' };
  const used = ing ? usedIn(ing.id) : [];
  const unitOpts = Object.keys(UNITS).map((k) => `<option value="${k}" ${k === d.packUnit ? 'selected' : ''}>${UNITS[k].label}</option>`).join('');
  const catOpts = CATS.map(([k, l]) => `<option value="${k}" ${k === d.cat ? 'selected' : ''}>${l}</option>`).join('');
  const more = `<label class="field"><span>Nombre</span><input class="inp" id="ing-name" value="${esc(d.name)}" maxlength="40" placeholder="Ej: Harina 0000" autocomplete="off" ${isNew ? 'data-autofocus' : ''}></label>
    <div class="grid-2">
      <label class="field"><span>Paquete de</span><input class="inp" id="ing-qty" type="number" min="0" step="any" inputmode="decimal" value="${esc(d.packQty)}"></label>
      <label class="field"><span>Unidad</span><span class="select"><select class="inp" id="ing-unit">${unitOpts}</select></span></label>
    </div>
    <label class="field"><span>Parte de la torta</span><span class="select"><select class="inp" id="ing-cat">${catOpts}</select></span></label>`;
  const m = openSheet({
    label: isNew ? 'Nuevo ingrediente' : `Editar ${ing.name}`,
    html: `${sheetHead({ art: ingArt(isNew ? 'otro' : ingKind(ing), 70), title: isNew ? 'Nuevo ingrediente' : ing.name, sub: isNew ? 'Súmalo a tu despensa.' : `Paquete de ${packLabel(ing)} · ${ing.sample ? 'precio de ejemplo' : 'actualizado ' + ago(ing.updatedAt)}` })}
      <form id="ing-form" class="stack" novalidate>
        ${isNew ? more : ''}
        <label class="field"><span class="b">¿Cuánto pagaste la última vez?</span>${moneyInput('ing-price', `class="inp inp-xl" ${isNew ? '' : 'data-autofocus'}`, num(d.price) || '')}</label>
        <p class="sum-box" id="ing-preview" aria-live="polite"></p>
        ${used.length ? `<p class="hint">Se usa en ${used.map((r) => `“${esc(r.name || 'Torta sin nombre')}”`).join(', ')}. Al guardar, esas tortas se recalculan.</p>` : ''}
        ${isNew ? '' : `<details class="more"><summary>Cambiar nombre, paquete o parte de la torta</summary><div class="stack">${more}</div></details>`}
        <button type="submit" hidden></button>
      </form>
      <div class="sh-actions">${isNew ? '' : `<button type="button" class="btn btn-danger-o left" data-del aria-label="Eliminar ingrediente">${I.trash}<span>Eliminar</span></button>`}<button type="button" class="btn" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-save>${isNew ? 'Agregar' : 'Guardar precio'}</button></div>`
  });
  const f = $('#ing-form', m.el);
  const preview = () => {
    const tmp = { packQty: num($('#ing-qty', m.el).value), packUnit: $('#ing-unit', m.el).value, price: num($('#ing-price', m.el).value) };
    tmp.type = UNITS[tmp.packUnit].type;
    $('#ing-preview', m.el).innerHTML = unitCost(tmp) > 0 ? `<span>Te sale <b>${money(unitCost(tmp) * PER[tmp.type].f)}</b> por ${PER[tmp.type].label}.</span><small>Tus tortas se recalculan solas.</small>` : '<span>Completa el paquete y el precio para ver cuánto te sale.</span>';
  };
  f.addEventListener('input', preview);
  f.addEventListener('change', preview);
  preview();
  const submit = (e) => {
    if (e) e.preventDefault();
    const name = $('#ing-name', m.el).value.trim();
    if (!name) { const det = $('details.more', m.el); if (det) det.open = true; $('#ing-name', m.el).focus(); toast('Ponle un nombre al ingrediente'); return; }
    const packUnit = $('#ing-unit', m.el).value;
    const packQty = num($('#ing-qty', m.el).value);
    if (!(packQty > 0)) { const det = $('details.more', m.el); if (det) det.open = true; $('#ing-qty', m.el).focus(); toast('Indica el tamaño del paquete'); return; }
    const price = num($('#ing-price', m.el).value);
    const type = UNITS[packUnit].type;
    const cat = $('#ing-cat', m.el).value;
    if (isNew) {
      state.ingredients.push({ id: uid(), name, packQty, packUnit, price, type, cat, updatedAt: Date.now(), sample: false });
    } else {
      const changed = price !== num(ing.price) || packQty !== num(ing.packQty) || packUnit !== ing.packUnit;
      Object.assign(ing, { name, packQty, packUnit, price, type, cat });
      if (changed) { ing.updatedAt = Date.now(); ing.sample = false; }
      state.recipes.forEach((r) => r.items.forEach((l) => { if (l.ingId === ing.id && UNITS[l.unit].type !== type) l.unit = BY_TYPE[type][0]; }));
    }
    save();
    m.close();
    toast(isNew ? 'Ingrediente agregado' : used.length ? `Guardado. ${plural(used.length, 'torta recalculada', 'tortas recalculadas')}` : 'Precio guardado');
    render();
  };
  f.addEventListener('submit', submit);
  $('[data-save]', m.el).addEventListener('click', submit);
  const del = $('[data-del]', m.el);
  if (del) del.addEventListener('click', async () => {
    m.close();
    const ok = await confirmBox({
      title: `¿Eliminar “${ing.name}”?`,
      text: used.length ? `Se usa en ${plural(used.length, 'torta', 'tortas')}. Ahí quedará marcado como “ingrediente eliminado” para que lo reemplaces.` : 'No se usa en ninguna torta.',
      ok: 'Eliminar', danger: true
    });
    if (!ok) return;
    state.ingredients = state.ingredients.filter((i) => i.id !== ing.id);
    save(); render(); toast('Ingrediente eliminado');
  });
}

/* ======================= Anotar venta ======================= */
function saleSheet(recipeId, saleId) {
  const editing = saleId ? state.sales.find((x) => x.id === saleId) : null;
  if (editing) recipeId = editing.recipeId;
  const recipes = [...state.recipes].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
  const title = editing ? 'Editar venta' : 'Anotar venta';
  const m = openSheet({
    label: title,
    html: `${sheetHead({ title, sub: editing ? 'Corrige lo que haga falta.' : 'Tomamos el costo de la receta para calcular cuánto ganaste.' })}
      <form id="sale-form" class="stack" novalidate>
        <label class="field"><span>¿Qué torta vendiste?</span><span class="select"><select class="inp" id="sale-recipe" data-autofocus><option value="">Otra (escribir a mano)</option>${recipes.map((r) => `<option value="${r.id}" ${r.id === recipeId ? 'selected' : ''}>${esc(r.name || 'Torta sin nombre')}</option>`).join('')}</select></span></label>
        <label class="field" id="sale-title-wrap"><span>Descripción</span><input class="inp" id="sale-title" placeholder="Ej: Torta de cumpleaños" maxlength="60" autocomplete="off" value="${editing ? esc(editing.title) : ''}"></label>
        <div class="grid-2">
          <label class="field"><span>Cobraste</span>${moneyInput('sale-price', 'class="inp"', editing ? editing.price : '')}</label>
          <label class="field"><span>Te costó</span>${moneyInput('sale-cost', 'class="inp"', editing ? editing.cost : '')}</label>
        </div>
        <div class="grid-2">
          <label class="field"><span>Fecha</span><input class="inp" id="sale-date" type="date" value="${editing ? editing.date : todayISO()}"></label>
          <label class="field"><span>Cliente (opcional)</span><input class="inp" id="sale-client" placeholder="Ej: Laura" maxlength="40" autocomplete="off" value="${editing ? esc(editing.client) : ''}"></label>
        </div>
        <p class="sum-box" id="sale-preview" aria-live="polite"></p>
        <label class="check" id="sale-update-wrap" hidden><input type="checkbox" id="sale-update" checked><span id="sale-update-text"></span></label>
        <button type="submit" hidden></button>
      </form>
      <div class="sh-actions">${editing ? `<button type="button" class="btn btn-danger-o left" data-del aria-label="Borrar venta">${I.trash}<span>Borrar</span></button>` : ''}<button type="button" class="btn" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-save>Guardar venta</button></div>`
  });
  const sel = $('#sale-recipe', m.el);
  /* Si la vendió a otro precio, se ofrece usarlo como precio de la torta. */
  const priceDiffers = () => {
    const r = findRecipe(sel.value);
    const price = num($('#sale-price', m.el).value);
    return r && price > 0 && Math.round(price * 100) !== Math.round(calc(r).price * 100) ? r : null;
  };
  const preview = () => {
    const p = num($('#sale-price', m.el).value) - num($('#sale-cost', m.el).value);
    $('#sale-preview', m.el).innerHTML = `<span>${p < 0 ? 'Pierdes' : 'Ganas'} <b class="${p < 0 ? 'neg' : 'pos'}">${money(Math.abs(p))}</b> con esta venta</span>`;
    const r = priceDiffers();
    $('#sale-update-wrap', m.el).hidden = !r;
    if (r) $('#sale-update-text', m.el).innerHTML = `Usar <b>${money(num($('#sale-price', m.el).value))}</b> como precio de “${esc(r.name || 'Torta sin nombre')}” de ahora en adelante <small>Ahora figura a ${money(calc(r).price)}.</small>`;
  };
  /* Al elegir una torta se completan precio y costo; al editar se respetan los valores guardados. */
  const fill = (fromUser) => {
    const r = findRecipe(sel.value);
    $('#sale-title-wrap', m.el).hidden = !!r;
    if (r && (fromUser || !editing)) {
      const c = calc(r);
      $('#sale-price', m.el).value = Math.round(c.price * 100) / 100 || '';
      $('#sale-cost', m.el).value = Math.round(c.cost * 100) / 100 || '';
    }
    preview();
  };
  sel.addEventListener('change', () => fill(true));
  $('#sale-form', m.el).addEventListener('input', preview);
  fill(false);
  const submit = (e) => {
    if (e) e.preventDefault();
    const r = findRecipe(sel.value);
    const name = r ? (r.name || 'Torta sin nombre') : $('#sale-title', m.el).value.trim();
    if (!name) { $('#sale-title', m.el).focus(); toast('Escribe qué vendiste'); return; }
    const price = num($('#sale-price', m.el).value);
    if (!(price > 0)) { $('#sale-price', m.el).focus(); toast('Indica cuánto cobraste'); return; }
    const date = $('#sale-date', m.el).value || todayISO();
    const data = { date, recipeId: r ? r.id : '', title: name, client: $('#sale-client', m.el).value.trim(), price, cost: num($('#sale-cost', m.el).value) };
    if (editing) Object.assign(editing, data);
    else state.sales.push({ id: uid(), ...data });
    const updatePrice = priceDiffers() && $('#sale-update', m.el).checked;
    if (updatePrice) { r.price = price; r.updatedAt = Date.now(); r.sample = false; }
    save(); m.close();
    ui.month = date.slice(0, 7);
    const done = editing ? 'Venta actualizada' : 'Venta anotada';
    toast(updatePrice ? `${done}. “${r.name || 'Torta sin nombre'}” ahora vale ${money(price)}` : done);
    if (route.view === 'recipe') { repaintPanel(); updateOut(); }
    else render();
  };
  $('#sale-form', m.el).addEventListener('submit', submit);
  $('[data-save]', m.el).addEventListener('click', submit);
  const del = $('[data-del]', m.el);
  if (del) del.addEventListener('click', async () => {
    m.close();
    const ok = await confirmBox({ title: '¿Borrar esta venta?', text: 'Se quita del resumen del mes.', ok: 'Borrar', danger: true });
    if (!ok) return;
    state.sales = state.sales.filter((x) => x.id !== editing.id); save(); render();
    toast('Venta borrada');
  });
}

/* ======================= Respaldo ======================= */
const backupPayload = () => ({ app: 'dulce-cuenta', version: 1, exportedAt: new Date().toISOString(), data: state });
function exportFile() {
  persist();
  try {
    const blob = new Blob([JSON.stringify(backupPayload(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuanto-cobro-respaldo-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    state.settings.lastExport = Date.now();
    save(); render();
    toast('Respaldo descargado');
  } catch (e) {
    copyBackup();
  }
}
function copyBackup() {
  const text = JSON.stringify(backupPayload());
  const done = () => { state.settings.lastExport = Date.now(); save(); render(); toast('Respaldo copiado. Pégalo en una nota o mail.'); };
  const fallback = () => {
    const m = openSheet({
      label: 'Copia este texto',
      html: `${sheetHead({ title: 'Copia este texto' })}<p class="sh-text">Selecciona todo el texto y cópialo. Guárdalo en una nota o mándatelo por mail.</p><textarea id="bk-text" class="inp" rows="8" readonly>${esc(text)}</textarea><div class="sh-actions"><button type="button" class="btn btn-primary" data-close>Listo</button></div>`
    });
    const ta = $('#bk-text', m.el); ta.focus(); ta.select();
    state.settings.lastExport = Date.now(); save();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
  else fallback();
}
function parseBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { return null; }
  const data = obj && obj.data && typeof obj.data === 'object' ? obj.data : obj;
  if (!data || typeof data !== 'object' || !(Array.isArray(data.recipes) || Array.isArray(data.ingredients))) return null;
  return normalize(data);
}
async function restoreData(data, source) {
  const ok = await confirmBox({
    title: '¿Restaurar este respaldo?',
    text: `Tiene ${plural(data.recipes.length, 'torta', 'tortas')}, ${plural(data.ingredients.length, 'ingrediente', 'ingredientes')} y ${plural(data.sales.length, 'venta', 'ventas')}. Reemplaza lo que tienes ahora; antes guardamos una copia automática por si acaso.`,
    ok: 'Restaurar'
  });
  if (!ok) return;
  makeSnapshot('import');
  data.settings.onboarded = true;
  state = data;
  fmtCache.clear();
  persist();
  closeOnboarding();
  go('home');
  toast(source === 'snap' ? 'Volviste a la copia elegida' : 'Respaldo restaurado');
}
function pasteBackup() {
  const m = openSheet({
    label: 'Pegar respaldo',
    html: `${sheetHead({ title: 'Pegar respaldo' })}<p class="sh-text">Pega acá el texto que copiaste con “Copiar como texto”.</p><label class="sr" for="paste-text">Texto del respaldo</label><textarea id="paste-text" class="inp" rows="8" placeholder='{"app":"dulce-cuenta", …}' data-autofocus></textarea><div class="sh-actions"><button type="button" class="btn" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-ok>Continuar</button></div>`
  });
  $('[data-ok]', m.el).addEventListener('click', () => {
    const data = parseBackup($('#paste-text', m.el).value.trim());
    if (!data) { toast('Ese texto no es un respaldo de Cuánto Cobro'); return; }
    m.close();
    restoreData(data, 'paste');
  });
}
function readBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const data = parseBackup(String(reader.result));
    if (!data) { toast('Ese archivo no es un respaldo de Cuánto Cobro'); return; }
    restoreData(data, 'file');
  };
  reader.readAsText(file);
}
/* Desde la bienvenida: archivo o texto. */
function restoreChooser() {
  const m = openSheet({
    label: 'Recuperar tus datos',
    html: `${sheetHead({ title: 'Recuperar tus datos', sub: 'Usa el respaldo que descargaste o copiaste antes.' })}
      <div class="choice-list">
        <label class="choice" for="onb-file"><span class="choice-ico">${ico(ICON_D.up, { s: 26 })}</span><span><b>Elegir el archivo</b><small>El .json que descargaste desde Ajustes.</small></span></label>
        <input id="onb-file" type="file" accept=".json,application/json,text/plain" class="sr">
        <button type="button" class="choice" data-paste><span class="choice-ico">${ico(ICON_D.copy, { s: 26 })}</span><span><b>Pegar el texto</b><small>Si lo guardaste en una nota o en un mail.</small></span></button>
      </div>`
  });
  $('#onb-file', m.el).addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; m.close(); readBackupFile(f); });
  $('[data-paste]', m.el).addEventListener('click', () => { m.close(); pasteBackup(); });
}

/* ======================= Datos de ejemplo ======================= */
/* Usa los ingredientes de la despensa si ya existen (con el precio de la usuaria);
   los que falten se crean con precios inventados y marcados como ejemplo. */
const SAMPLE_PRICES = { 'Harina 0000': 1200, 'Azúcar': 1400, 'Huevos': 3600, 'Manteca': 2800, 'Cacao amargo': 3900, 'Leche': 1500, 'Polvo de hornear': 600, 'Esencia de vainilla': 2000, 'Dulce de leche repostero': 6500, 'Crema de leche': 3200, 'Chocolate cobertura': 3300, 'Frutillas': 4000 };
function addSample() {
  const now = Date.now();
  const get = (name) => {
    const existing = state.ingredients.find((i) => norm(i.name) === norm(name));
    if (existing) {
      if (!(num(existing.price) > 0)) Object.assign(existing, { price: SAMPLE_PRICES[name], sample: true });
      return existing;
    }
    const [, packQty, packUnit, cat] = COMMON.find(([n]) => n === name);
    const i = { id: uid(), name, packQty, packUnit, price: SAMPLE_PRICES[name], type: UNITS[packUnit].type, cat, updatedAt: now, sample: true };
    state.ingredients.push(i);
    return i;
  };
  const line = (name, qty, unit) => ({ id: uid(), ingId: get(name).id, qty, unit });
  const r = {
    id: uid(), name: 'Chocolate con dulce de leche', portions: 12,
    items: [line('Harina 0000', 300, 'g'), line('Azúcar', 250, 'g'), line('Huevos', 4, 'u'), line('Manteca', 200, 'g'), line('Cacao amargo', 60, 'g'), line('Dulce de leche repostero', 500, 'g'), line('Chocolate cobertura', 150, 'g'), line('Frutillas', 250, 'g')],
    extras: [{ id: uid(), name: 'Caja', cost: 1800 }, { id: uid(), name: 'Bandeja', cost: 900 }],
    hours: 3, overhead: state.settings.overhead || 1500, margin: state.settings.margin || 40, price: null,
    notes: 'Ejemplo: horno a 180 °C durante 40 minutos, molde de 24 cm.',
    sample: true, createdAt: now, updatedAt: now
  };
  state.recipes.push(r);
  save();
  return r;
}
