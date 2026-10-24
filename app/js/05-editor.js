/* ======================= Armar torta ======================= */
const STEPS = [['ing', 'Ingredientes', 'Ingredientes'], ['ext', 'Extras y trabajo', 'Extras'], ['pre', 'Precio', 'Precio']];
const SEG = { ing: '#C42F65', ext: '#F0CB93', lab: '#A0705C', ovh: '#B99AA2', pro: '#3F8452' };
const cur = () => findRecipe(route.id);
const stepOf = () => (STEPS.some((s) => s[0] === route.step) ? route.step : 'ing');
const stepper = (id, key, step, value, label, ph = '0') => `<span class="stepper"><button type="button" data-act="stepper" data-target="${id}" data-step="${-step}" aria-label="Menos ${label}">−</button><input id="${id}" type="number" min="${key === 'portions' ? 1 : 0}" step="${key === 'portions' ? 1 : 0.5}" inputmode="decimal" data-in="r" data-k="${key}" value="${esc(value)}" placeholder="${ph}" aria-label="${label}"><button type="button" data-act="stepper" data-target="${id}" data-step="${step}" aria-label="Más ${label}">+</button></span>`;

views.recipe = () => {
  const r = cur();
  const step = stepOf();
  return `<div class="ed" id="ed">
    <h1 class="sr">Armar torta${r.name ? `: ${esc(r.name)}` : ''}</h1>
    <div class="ed-top"><button type="button" class="back" data-go="recipes" aria-label="Volver a Tus tortas">${I.back}<span>Tus tortas</span></button>
      <div class="ed-actions only-d" role="group" aria-label="Acciones de la torta">
        <button type="button" class="btn btn-sm btn-quiet" data-act="sale-from-recipe">${ico(ICON_D.ventas, { s: 18 })}Anotar venta</button>
        <button type="button" class="btn btn-sm btn-quiet" data-act="dup-recipe">${ico(ICON_D.copy, { s: 18 })}Duplicar</button>
        <button type="button" class="btn btn-sm btn-quiet btn-danger-o" data-act="del-recipe">${I.trash}Eliminar</button>
      </div>${saveInd()}</div>
    <button type="button" class="ed-more only-m" data-act="card-menu" data-id="${r.id}" data-in-editor="1" aria-label="Opciones de la torta">${ico('M5 12h.01M12 12h.01M19 12h.01', { w: 3.2, s: 22 })}</button>
    <div class="ed-grid">
      <div class="ed-left">
        <textarea id="r-name" class="ed-title" rows="1" maxlength="60" data-in="r" data-k="name" placeholder="Ponle nombre a tu torta" aria-label="Nombre de la torta">${esc(r.name)}</textarea>
        <div class="stage">
          <div class="stage-art" id="cake-art"></div>
          <p class="badge-ing" aria-live="polite"><span>Ingredientes</span><b data-out="ing"></b></p>
          <span class="badge-count" data-out="count"></span>
        </div>
        <div class="pricebar only-d">${barHTML(step)}</div>
      </div>
      <div class="ed-right">
        <nav class="steps" id="steps" aria-label="Pasos para armar la torta">${stepsHTML(step)}</nav>
        <div class="ed-panel" id="ed-panel">${panelHTML(r, step)}</div>
        <div class="ed-next only-d" id="ed-next">${nextHTML(step)}</div>
      </div>
    </div>
    <div class="ed-bar only-m" id="ed-bar">${barHTML(step, true)}</div>
  </div>`;
};
function initEditor() {
  const r = cur();
  mountCake($('#cake-art'), cakeProps(r), false);
  fitTitle();
  updateOut();
}
function stepsHTML(step) {
  const idx = STEPS.findIndex((s) => s[0] === step);
  return STEPS.map(([k, d, m], n) => {
    const on = k === step, done = n < idx;
    return `<button type="button" class="step${on ? ' on' : ''}${done ? ' done' : ''}" data-act="step" data-step="${k}" aria-current="${on ? 'step' : 'false'}"><span class="step-n" aria-hidden="true">${done ? '✓' : n + 1}</span><span class="only-d">${d}</span><span class="only-m">${m}</span></button>`;
  }).join('');
}
function barHTML(step, withCta) {
  const cta = step === 'ing' ? ['next-step', 'Extras'] : step === 'ext' ? ['next-step', 'Precio'] : ['save-recipe', 'Guardar torta'];
  return `<div class="bar-l"><small data-out="barLabel"></small><b data-out="barVal"></b></div>
    ${withCta ? `<button type="button" class="btn btn-primary btn-lg" data-act="${cta[0]}">${cta[1]}${step === 'pre' ? '' : I.arrow}</button>` : '<div class="bar-r"><small>Costo total</small><b data-out="cost"></b></div>'}`;
}
function nextHTML(step) {
  if (step === 'pre') return '';
  return `<button type="button" class="btn btn-primary btn-lg" data-act="next-step">Siguiente: ${step === 'ing' ? 'extras y trabajo' : 'precio'}${I.arrow}</button>`;
}
const panelHTML = (r, step) => (step === 'ing' ? panelIng(r) : step === 'ext' ? panelExt(r) : panelPre(r));

function panelIng(r) {
  const cat = CAT_KEYS.includes(ui.cat) ? ui.cat : 'masa';
  const hint = CATS.find((c) => c[0] === cat)[2];
  const inRecipe = new Set(r.items.map((l) => l.ingId));
  const items = state.ingredients.filter((i) => ingCat(i) === cat).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  let body;
  if (ui.sview === 'lista') {
    body = `<ul class="plist">${items.map((i) => {
      const on = inRecipe.has(i.id);
      return `<li><span class="pl-main"><b>${esc(i.name)}</b><span class="muted">${num(i.price) > 0 ? `Paquete de ${packLabel(i)} a ${money(i.price)}` : 'Sin precio todavía'}</span></span><b class="pl-per">${perShort(i)}</b><button type="button" class="pl-btn${on ? ' on' : ''}" data-act="open-ing" data-id="${i.id}" aria-label="${on ? 'Cambiar cantidad de ' : 'Agregar '}${esc(i.name)}">${on ? 'Editar' : '+ Agregar'}</button></li>`;
    }).join('')}<li class="pl-more"><button type="button" class="pl-btn" data-act="more-ing">+ Otro ingrediente</button></li></ul>`;
  } else {
    body = `<div class="tiles">${items.map((i) => {
      const on = inRecipe.has(i.id);
      return `<button type="button" class="tile${on ? ' on' : ''}" data-act="open-ing" data-id="${i.id}" aria-label="${on ? 'Cambiar cantidad de ' : 'Agregar '}${esc(i.name)}, ${perShort(i)}">${on ? `<span class="tile-chk" aria-hidden="true">${I.check}</span>` : ''}${ingArtFor(i)}<span class="tile-name">${esc(shortName(i.name))}</span><span class="tile-per${num(i.price) > 0 ? '' : ' warn'}">${perShort(i)}</span></button>`;
    }).join('')}<button type="button" class="tile tile-add" data-act="more-ing"><span class="tile-plus" aria-hidden="true">+</span><span class="tile-name">Otro</span><span class="tile-per">ingrediente</span></button></div>`;
  }
  return `<section class="card shelf-card" aria-labelledby="shelf-hd">
      <div class="card-head"><div><h2 id="shelf-hd">Agrega ingredientes</h2><p class="muted only-d" id="cat-hint">${hint}</p></div>
        <div class="seg" role="group" aria-label="Cómo ver los ingredientes">
          <button type="button" data-act="sview" data-v="estantes" aria-pressed="${ui.sview === 'estantes'}">${I.grid}Estantes</button>
          <button type="button" data-act="sview" data-v="lista" aria-pressed="${ui.sview === 'lista'}">${I.list}Lista</button></div></div>
      <div class="pills" role="group" aria-label="Parte de la torta">${CATS.map(([k, label]) => `<button type="button" class="pill" data-act="cat" data-cat="${k}" aria-pressed="${k === cat}">${label}</button>`).join('')}</div>
      <p class="muted only-m">${hint}</p>
      ${body}
    </section>
    <section class="recipe-list" aria-labelledby="receta-hd">
      <div class="rl-head"><h2 id="receta-hd">Tu receta <span class="muted">· <span data-out="itemCount"></span></span></h2><b data-out="ing"></b></div>
      ${r.items.length ? `<ul class="rlines">${r.items.map((l) => {
        const ing = findIng(l.ingId);
        const li = lineInfo(l);
        return `<li class="rline">${ing ? ingArtFor(ing, 38) : '<span class="ing-art"></span>'}<span class="rl-main"><b>${ing ? esc(ing.name) : 'Ingrediente eliminado'}</b><span class="muted">${ing ? qtyLabel(ing, l) : 'Quítalo o reemplázalo'}</span></span><b class="rl-cost${li.missing ? ' warn' : ''}" data-linecost="${l.id}">${li.missing ? 'Sin precio' : money(li.cost)}</b>${ing ? `<button type="button" class="icon-btn" data-act="edit-line" data-id="${l.id}" aria-label="Cambiar cantidad de ${esc(ing.name)}">${I.edit}</button>` : ''}<button type="button" class="icon-btn" data-act="rm-line" data-id="${l.id}" aria-label="Quitar ${ing ? esc(ing.name) : 'ingrediente'}">${I.trash}</button></li>`;
      }).join('')}</ul>` : `<p class="empty-line">Todavía no hay ingredientes. Toca uno de arriba y cuéntanos cuánto usas.</p>`}
    </section>`;
}

function panelExt(r) {
  const s = state.settings;
  const taken = new Set();
  const slot = (k) => { const x = r.extras.find((e) => !taken.has(e.id) && extraKind(e.name) === k); if (x) taken.add(x.id); return x; };
  const presets = XPRESETS.map(([k, name]) => ({ k, name, x: slot(k) }));
  const customs = r.extras.filter((e) => !taken.has(e.id));
  return `<section class="card" aria-labelledby="extras-hd">
      <div><h2 id="extras-hd">Extras</h2><p class="muted">Lo que no es ingrediente pero también cuesta. Míralo aparecer en la torta.</p></div>
      <div class="xgrid">
        ${presets.map(({ k, name, x }) => `<div class="xcard${x ? ' on' : ''}">
          <button type="button" class="xcard-btn" data-act="toggle-extra" data-k="${k}" aria-pressed="${!!x}"><span class="xicon">${xArt(k)}</span><span class="xtxt"><b>${name}</b><span class="xstate">${x ? 'En la torta' : 'Agregar'}</span></span></button>
          ${x ? `<label class="sr" for="ex-cost-${x.id}">Costo de ${name}</label>${moneyInput(`ex-cost-${x.id}`, `class="inp" data-in="extra" data-k="cost" data-id="${x.id}"`, x.cost)}` : ''}</div>`).join('')}
        ${customs.map((x) => `<div class="xcard on custom"><div class="xcustom-head"><label class="sr" for="ex-name-${x.id}">Nombre del extra</label><input id="ex-name-${x.id}" class="inp" data-in="extra" data-k="name" data-id="${x.id}" value="${esc(x.name)}" placeholder="Ej: Envío" maxlength="40"><button type="button" class="icon-btn" data-act="rm-extra" data-id="${x.id}" aria-label="Quitar ${esc(x.name || 'extra')}">${I.trash}</button></div>
          <label class="sr" for="ex-cost-${x.id}">Costo de ${esc(x.name || 'extra')}</label>${moneyInput(`ex-cost-${x.id}`, `class="inp" data-in="extra" data-k="cost" data-id="${x.id}"`, x.cost)}</div>`).join('')}
        <button type="button" class="xcard xcard-add" data-act="add-extra"><span class="tile-plus" aria-hidden="true">+</span><b>Otro extra</b></button>
      </div>
    </section>
    <section class="work" aria-labelledby="trabajo-hd">
      <div class="work-col"><h2 id="trabajo-hd">Tu trabajo</h2>
        <div class="work-row">${stepper('r-hours', 'hours', 0.5, r.hours, 'horas de trabajo')}<p>horas × <b data-out="rate"></b> = <b data-out="labor"></b></p></div>
        <label class="mini-field"><span>Tu hora vale</span>${moneyInput('s-rate', 'class="inp" data-in="setting" data-k="hourlyRate"', s.hourlyRate || '')}</label>
        <p class="hint warn" data-out="rateHint"></p></div>
      <div class="work-col"><label class="h2l" for="r-overhead">Gastos de cocina</label>${moneyInput('r-overhead', 'class="inp" data-in="r" data-k="overhead" aria-describedby="ovh-hint"', r.overhead)}<small id="ovh-hint" class="muted">Gas, luz, papel manteca: lo que usas en cada torta.</small></div>
      <div class="work-col"><h2 class="h2l" id="porc-hd">Porciones</h2>${stepper('r-portions', 'portions', 1, r.portions, 'porciones', '12')}<small class="muted">Cuántas porciones rinde la torta.</small></div>
    </section>
    <details class="notes" ${r.notes ? 'open' : ''}><summary>Notas de la receta</summary><textarea id="r-notes" class="inp" rows="4" data-in="r" data-k="notes" placeholder="Temperatura del horno, molde, relleno, pedidos especiales…">${esc(r.notes)}</textarea></details>`;
}

function panelPre(r) {
  const custom = num(r.price) > 0;
  const sym = esc(curSymbol());
  return `<div class="pre-grid">
    <section class="card price-card" aria-labelledby="precio-hd">
      <div class="card-head"><h2 id="precio-hd">Precio de venta</h2>
        <div class="seg" role="group" aria-label="Tipo de precio">
          <button type="button" data-act="price-mode" data-mode="suggested" aria-pressed="${!custom}">Sugerido</button>
          <button type="button" data-act="price-mode" data-mode="custom" aria-pressed="${custom}">Mi precio</button></div></div>
      <div id="pp-sug" ${custom ? 'hidden' : ''} class="stack">
        <div class="stack-s"><span class="muted b">Precio sugerido</span><b class="price-big" data-out="suggested" aria-live="polite"></b></div>
        <div class="stack-s"><label for="r-margin" class="b">Quiero ganar <span class="acc" data-out="marginPct"></span> del precio</label>
          <input id="r-margin" class="range" type="range" min="0" max="80" step="5" data-in="margin" value="${esc(clamp(num(r.margin), 0, 80))}">
          <small class="muted">Redondeado hacia arriba, para que sea cómodo de cobrar.</small></div>
      </div>
      <div id="pp-mio" ${custom ? '' : 'hidden'} class="stack-s">
        <label for="r-price" class="muted b">Tu precio</label>
        <span class="price-input" style="--cur-w:${sym.length}"><span class="cur" aria-hidden="true">${sym}</span><input id="r-price" type="number" min="0" step="any" inputmode="decimal" data-in="r" data-k="price" value="${custom ? esc(r.price) : ''}"></span>
        <small class="muted">El sugerido con <span data-out="marginPct"></span> de ganancia es <b data-out="suggested"></b>. <button type="button" class="link link-sm" data-act="use-suggested">Usar ese</button></small>
      </div>
      <div class="profit-box" id="profit-box" aria-live="polite"><span class="b" data-out="profitLabel"></span>
        <div class="profit-row"><b class="profit-num" data-out="profitAbs"></b><span class="b" data-out="realPct"></span></div>
        <small data-out="profitHint"></small></div>
      <dl class="facts"><div><dt>Costo total</dt><dd data-out="cost"></dd></div><div><dt>Por porción (<span data-out="portions"></span>)</dt><dd data-out="perPortion"></dd></div></dl>
      <p class="hint warn" data-out="missingHint"></p>
      <div class="btn-row"><button type="button" class="btn btn-primary btn-lg" data-act="save-recipe">Guardar torta</button><button type="button" class="btn btn-lg" data-act="sale-from-recipe">Anotar como vendida</button></div>
    </section>
    <section class="card breakdown" aria-labelledby="sale-hd">
      <h2 id="sale-hd">¿De dónde sale el precio?</h2>
      <div class="bar" id="bar" aria-hidden="true"></div>
      <ul class="legend" id="legend"></ul>
      <div id="top-ings"></div>
    </section>
  </div>
`;
}

/* Recalcula todo lo que se ve sin tocar los campos que se están escribiendo. */
function updateOut() {
  const r = cur();
  if (!r) return;
  const c = calc(r);
  const s = state.settings;
  const step = stepOf();
  const m = clamp(num(r.margin), 0, 90);
  const loss = c.profit < 0;
  const n = recipeCount(r);
  const bar = step === 'pre'
    ? { label: loss ? 'Pierdes' : 'Ganas', val: money(Math.abs(c.profit)), tone: loss ? 'neg' : 'pos' }
    : { label: 'Precio sugerido', val: money(c.suggested), tone: 'acc' };
  const out = {
    ing: money(c.ingredients), cost: money(c.cost), suggested: money(c.suggested), price: money(c.price),
    profitAbs: money(Math.abs(c.profit)), realPct: c.price > 0 ? `${Math.round(c.marginReal * 100)}% del precio` : '',
    profitLabel: loss ? 'Con este precio pierdes' : 'Con este precio ganas',
    perPortion: money(c.perPortion), portions: String(c.portions), marginPct: `${Math.round(m)}%`,
    labor: money(c.labor), rate: money(num(s.hourlyRate)),
    count: plural(n, 'ingrediente', 'ingredientes'), itemCount: String(r.items.length),
    barLabel: bar.label, barVal: bar.val,
    profitHint: c.cost <= 0 ? 'Agrega ingredientes para calcular.' : loss ? `Te faltan ${money(-c.profit)} para cubrir el costo.` : c.labor > 0 ? `Además de pagarte ${money(c.labor)} por tu tiempo.` : 'Ojo: no estás contando tu tiempo de trabajo.',
    rateHint: num(s.hourlyRate) > 0 ? '' : 'Pon cuánto vale tu hora. Si lo dejas en 0, estás regalando tu trabajo.',
    missingHint: c.missing ? `${plural(c.missing, 'ingrediente no tiene', 'ingredientes no tienen')} precio: el costo real es mayor.` : ''
  };
  $$('[data-out]', view).forEach((el) => { const k = el.dataset.out; if (k in out) el.textContent = out[k]; });
  $$('[data-out="barVal"]', view).forEach((el) => { el.className = bar.tone; });
  const pb = $('#profit-box'); if (pb) pb.classList.toggle('is-loss', loss);
  for (const l of r.items) {
    const el = $(`[data-linecost="${l.id}"]`, view);
    if (!el) continue;
    const li = lineInfo(l);
    el.classList.toggle('warn', li.missing);
    el.textContent = li.missing ? 'Sin precio' : money(li.cost);
  }
  const barEl = $('#bar');
  if (barEl) {
    const base = Math.max(c.price, c.cost) || 1;
    const segs = [['ing', 'Ingredientes', c.ingredients], ['ext', 'Extras', c.extras], ['lab', 'Tu trabajo', c.labor], ['ovh', 'Gastos de cocina', c.overhead], ['pro', 'Ganancia', Math.max(c.profit, 0)]];
    barEl.innerHTML = segs.map(([k, , v]) => `<span style="width:${(v / base) * 100}%;background:${SEG[k]}"></span>`).join('');
    $('#legend').innerHTML = segs.map(([k, name, v]) => `<li><i style="background:${SEG[k]}" aria-hidden="true"></i><span>${name}</span><b>${money(v)}</b><small>${c.price > 0 ? pct(v / c.price) : ''}</small></li>`).join('');
    const top = [...c.lines].sort((a, b) => b.cost - a.cost).slice(0, 3).filter((x) => x.cost > 0);
    const max = top.length ? top[0].cost : 1;
    $('#top-ings').innerHTML = top.length ? `<h3>Lo que más pesa</h3>${top.map((x) => `<div class="top-row">${ingArt(x.kind, 40)}<div><span>${esc(x.name)}</span><span class="track" aria-hidden="true"><i style="width:${Math.round((x.cost / max) * 100)}%"></i></span></div><b>${money(x.cost)}</b></div>`).join('')}` : '';
  }
}
function fitTitle() {
  const t = $('#r-name');
  if (!t) return;
  t.style.height = 'auto';
  t.style.height = t.scrollHeight + 'px';
}
function touch(r) { r.updatedAt = Date.now(); r.sample = false; save(); }
function repaintPanel() {
  const r = cur();
  const p = $('#ed-panel');
  if (!r || !p) return;
  const y = p.scrollTop;
  p.innerHTML = panelHTML(r, stepOf());
  p.scrollTop = y;
  updateOut();
}
function refreshCake(r, floatText, animate = true) {
  mountCake($('#cake-art'), cakeProps(r), animate);
  if (floatText) {
    const stage = $('.stage');
    if (!stage) return;
    $$('.stage-float', stage).forEach((e) => e.remove());
    const f = document.createElement('div');
    f.className = 'stage-float';
    f.setAttribute('aria-hidden', 'true');
    f.textContent = floatText;
    stage.appendChild(f);
    setTimeout(() => f.remove(), 2300);
  }
}
function setStep(step) {
  const r = cur();
  if (!r || !STEPS.some((s) => s[0] === step)) return;
  route.step = step;
  try { history.replaceState({ route }, '', routePath()); } catch (e) { /* sin historial */ }
  $('#steps').innerHTML = stepsHTML(step);
  $('#ed-next').innerHTML = nextHTML(step);
  $('#ed-bar').innerHTML = barHTML(step, true);
  $('.pricebar').innerHTML = barHTML(step);
  const p = $('#ed-panel');
  p.innerHTML = panelHTML(r, step);
  p.scrollTop = 0;
  if (!isMobile()) $('.ed-right').scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
  updateOut();
}
const nextStep = () => { const i = STEPS.findIndex((s) => s[0] === stepOf()); if (i < STEPS.length - 1) setStep(STEPS[i + 1][0]); };

function newRecipe() {
  const s = state.settings;
  const r = {
    id: uid(), name: '', portions: 12, items: [], extras: [],
    hours: '', overhead: s.overhead || '', margin: s.margin ?? 40, price: null, notes: '', sample: false,
    createdAt: Date.now(), updatedAt: Date.now()
  };
  state.recipes.push(r);
  save();
  go('recipe', { id: r.id, step: 'ing' });
  setTimeout(() => { const n = $('#r-name'); if (n) n.focus({ preventScroll: true }); }, 30);
}
