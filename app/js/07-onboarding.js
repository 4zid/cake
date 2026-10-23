/* ======================= Bienvenida (5 pasos) ======================= */
let onbEl = null;
function closeOnboarding() {
  if (!onbEl) return;
  onbEl.remove();
  onbEl = null;
  lockScroll(false);
}
function onboarding() {
  closeOnboarding();
  const s = state.settings;
  const draft = { business: s.business, currency: s.currency, hourlyRate: s.hourlyRate || '', margin: [30, 40, 50, 60].includes(s.margin) ? s.margin : 40, prices: {} };
  STARTER.forEach(([n]) => { const i = state.ingredients.find((x) => norm(x.name) === norm(n)); if (i && !i.sample && num(i.price) > 0) draft.prices[n] = i.price; });
  let step = 1;
  const el = document.createElement('div');
  el.className = 'onb';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Bienvenida a Dulce Cuenta');
  document.body.appendChild(el);
  onbEl = el;
  lockScroll(true);

  const symFor = () => { try { const loc = (CURRENCIES.find((c) => c[0] === draft.currency) || [])[2] || 'es'; return new Intl.NumberFormat(loc, { style: 'currency', currency: draft.currency }).formatToParts(1).find((x) => x.type === 'currency').value; } catch (e) { return '$'; } };
  const filled = () => STARTER.filter(([n]) => num(draft.prices[n]) > 0).length;

  const art = () => {
    if (step === 1) return `<div class="onb-cake">${cakeHTML({ masa: 3, relleno: true, cobertura: 'rosa', sabor: 'vainilla', rellenoSabor: 'frutilla', frutillas: true, velas: true }, 'Torta con frutillas y velas')}${PRICE_TAG}</div>`;
    if (step === 2) return `<div class="onb-local">${localHTML(draft.business, false)}</div>`;
    if (step === 3) {
      const sym = esc(symFor());
      return `<div class="onb-pie">${pieHTML(draft.margin, 200)}<div class="pie-legend">
        <div><span><i class="sw-pink" aria-hidden="true"></i>Tu ganancia</span><b class="acc">${draft.margin}%</b></div>
        <div><span><i class="sw-cream" aria-hidden="true"></i>Lo que cuesta</span><b>${100 - draft.margin}%</b></div></div><span class="sr">De cada ${sym}100 que cobras, ${sym}${draft.margin} son ganancia.</span></div>`;
    }
    if (step === 4) {
      const rows = [STARTER.slice(0, 4), STARTER.slice(4, 7), STARTER.slice(7, 10)];
      return `<div class="onb-shelves" role="img" aria-label="Despensa con ${filled()} de 10 ingredientes con precio">${rows.map((row) => `<div class="onb-shelf"><div class="onb-shelf-items">${row.map(([n, , , , k]) => `<span class="${num(draft.prices[n]) > 0 ? 'is-on' : ''}">${ingArt(k)}</span>`).join('')}</div><div class="plank"></div></div>`).join('')}</div>`;
    }
    return `<div class="onb-local">${localHTML(draft.business, true)}</div>`;
  };

  const content = () => {
    const sym = esc(symFor());
    if (step === 1) return `<div class="stack-l">
        <div class="stack-s"><h1 class="onb-h1" tabindex="-1">¿A cuánto vendo <span>esta torta?</span></h1>
        <p class="onb-lead">Arma tu torta ingrediente por ingrediente y te decimos cuánto te cuesta, a cuánto venderla y cuánto te queda.</p></div>
        <ol class="how">
          <li><span class="how-ico">${ingArt('harina', 48)}</span><span><b>Carga lo que pagas</b><span class="only-d">Un kilo de harina, una docena de huevos: tus precios reales.</span></span></li>
          <li><span class="how-ico">${cakeHTML({ masa: 2, relleno: true, cobertura: 'chocolate', sabor: 'chocolate', frutillas: false, velas: false }, '')}</span><span><b>Arma la torta</b><span class="only-d">Suma ingredientes, extras y tus horas. La ves crecer en pantalla.</span></span></li>
          <li><span class="how-ico">${TAG_SMALL}</span><span><b>Elige tu precio</b><span class="only-d">Usa el sugerido o pon el tuyo y mira cuánto ganas.</span></span></li>
        </ol></div>`;
    if (step === 2) return `<form class="stack-l" data-onb-form novalidate>
        <div class="stack-s"><h2 class="onb-h2" tabindex="-1">¿Cómo se llama tu pastelería?</h2><p class="onb-lead">Es opcional. Mira cómo queda en el cartel mientras escribes.</p></div>
        <label class="field"><span>Nombre de tu pastelería</span><input class="inp inp-lg" id="onb-business" value="${esc(draft.business)}" maxlength="40" placeholder="Ej: Dulces de Ana" autocomplete="organization"></label>
        <label class="field"><span>Moneda</span><span class="select"><select class="inp inp-lg" id="onb-currency">${CURRENCIES.map((c) => `<option value="${c[0]}" ${c[0] === draft.currency ? 'selected' : ''}>${c[1]} (${c[0]})</option>`).join('')}</select></span></label>
      </form>`;
    if (step === 3) return `<form class="stack-l" data-onb-form novalidate>
        <div class="stack-s"><h2 class="onb-h2" tabindex="-1">Tu tiempo también cuesta</h2><p class="onb-lead only-d">Con esto calculamos el precio sugerido de cada torta.</p></div>
        <label class="field"><span>¿Cuánto vale una hora de tu trabajo?</span>
          <span class="money money-lg" style="--cur-w:${sym.length}"><span class="cur" aria-hidden="true">${sym}</span><input class="inp inp-lg" id="onb-rate" type="number" min="0" step="any" inputmode="decimal" value="${esc(draft.hourlyRate)}" placeholder="Ej: 4000" aria-describedby="onb-rate-hint"><span class="suffix" aria-hidden="true">por hora</span></span>
          <small class="hint" id="onb-rate-hint">Piensa cuánto cobrarías por hora en otro trabajo.</small></label>
        <fieldset class="fs"><legend>¿Cuánto quieres ganar sobre el precio?</legend>
          <div class="mchips">${[30, 40, 50, 60].map((v) => `<button type="button" class="mchip" data-margin="${v}" aria-pressed="${draft.margin === v}">${v}%</button>`).join('')}</div>
          <p class="onb-calc" aria-live="polite">De cada <b>${sym}100</b> que cobras, <b class="acc">${sym}${draft.margin}</b> son ganancia.</p>
          <small class="hint">Entre 30% y 50% es lo habitual en pastelería casera.</small></fieldset>
      </form>`;
    if (step === 4) {
      const f = filled();
      return `<div class="stack">
        <div class="stack-s"><h2 class="onb-h2" tabindex="-1">¿Cuánto pagas por esto?</h2><p class="onb-lead">Pon lo que pagaste la última vez. Lo que no uses, déjalo vacío.</p>
          <div class="progress"><span class="track" aria-hidden="true"><i style="width:${f * 10}%"></i></span><span class="progress-txt" aria-live="polite">${f} de 10 cargados</span></div></div>
        <div class="starter">${STARTER.map(([n, q, u, , k]) => `<div class="st-card${num(draft.prices[n]) > 0 ? ' on' : ''}">
          ${num(draft.prices[n]) > 0 ? `<span class="tile-chk" aria-hidden="true">${I.check}</span>` : ''}
          <span class="st-art">${ingArt(k)}</span>
          <span class="st-txt"><label for="onb-p-${k}">${esc(n)}</label><small>paquete de ${packLabel({ packQty: q, packUnit: u })}</small></span>
          <span class="money" style="--cur-w:${sym.length}"><span class="cur" aria-hidden="true">${sym}</span><input class="inp" id="onb-p-${k}" type="number" min="0" step="any" inputmode="decimal" data-price="${esc(n)}" value="${esc(draft.prices[n] || '')}" placeholder="0"></span>
        </div>`).join('')}</div></div>`;
    }
    const name = draft.business.trim();
    return `<div class="stack-l">
      <div class="stack-s"><h2 class="onb-h2" tabindex="-1">${name ? `¡Todo listo, ${esc(name)}!` : '¡Todo listo!'}</h2>
        <p class="onb-lead">Tus datos se guardan en este navegador, sin cuentas ni contraseñas. Desde Ajustes puedes descargar un respaldo.</p></div>
      <div class="choice-list">
        <button type="button" class="choice choice-main" data-finish="build"><span class="choice-art">${cakeHTML({ masa: 0, frutillas: false, velas: false }, '')}</span><span><b>Armar mi primera torta</b><small>Empiezas vacía y la ves crecer con cada ingrediente.</small></span></button>
        <button type="button" class="choice" data-finish="sample"><span class="choice-art">${cakeHTML({ masa: 3, relleno: true, cobertura: 'chocolate', sabor: 'chocolate', frutillas: true, velas: false }, '')}</span><span><b>Ver una torta de ejemplo</b><small>Una de chocolate ya armada, para ver cómo funciona.</small></span></button>
      </div></div>`;
  };

  const foot = () => {
    if (step === 5) return '';
    const cta = step === 1 ? 'Empezar' : step === 4 && filled() === 0 ? 'Lo completo después' : 'Siguiente';
    return `${step === 1 ? '<button type="button" class="btn btn-alt" data-restore>Ya tengo un respaldo</button>' : '<button type="button" class="btn only-d" data-prev>Atrás</button>'}
      <span class="grow"></span><button type="button" class="btn btn-primary btn-lg" data-next>${cta}${I.arrow}</button>`;
  };

  const paint = () => {
    el.className = `onb s${step}`;
    el.innerHTML = `<div class="onb-top">
        ${step > 1 ? `<button type="button" class="icon-btn onb-back" data-prev aria-label="Volver al paso anterior">${I.back}</button>` : ''}
        <span class="onb-count">Paso ${step} de 5</span>
        <div class="segs" aria-hidden="true">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= step ? 'on' : ''}"></i>`).join('')}</div>
        <span class="grow"></span>
        ${step < 5 ? '<button type="button" class="link" data-skip>Saltar</button>' : ''}
      </div>
      <div class="onb-art"><p class="brand-word">Dulce Cuenta</p><div class="onb-art-in">${art()}</div></div>
      <div class="onb-content"><div class="onb-inner">${content()}</div></div>
      <div class="onb-foot">${foot()}</div>`;
    const h = $('h1, h2', el);
    if (h) h.focus({ preventScroll: true });
    el.scrollTop = 0;
    $('.onb-content', el).scrollTop = 0;
  };
  const readForm = () => {
    const b = $('#onb-business', el); if (b) draft.business = b.value.trim();
    const c = $('#onb-currency', el); if (c) draft.currency = c.value;
    const r = $('#onb-rate', el); if (r) draft.hourlyRate = r.value;
    $$('[data-price]', el).forEach((i) => { draft.prices[i.dataset.price] = i.value; });
  };
  const goStep = (n) => { readForm(); step = clamp(n, 1, 5); paint(); };
  const finish = (mode) => {
    readForm();
    Object.assign(state.settings, { business: draft.business, currency: draft.currency, hourlyRate: num(draft.hourlyRate), margin: draft.margin, onboarded: true });
    fmtCache.clear();
    for (const [n, q, u, cat] of STARTER) {
      const p = num(draft.prices[n]);
      if (!(p > 0)) continue;
      const existing = state.ingredients.find((x) => norm(x.name) === norm(n));
      if (existing) Object.assign(existing, { price: p, sample: false, updatedAt: Date.now() });
      else state.ingredients.push({ id: uid(), name: n, packQty: q, packUnit: u, price: p, type: UNITS[u].type, cat, updatedAt: Date.now(), sample: false });
    }
    closeOnboarding();
    persist();
    if (mode === 'sample') { const r = addSample(); persist(); go('recipe', { id: r.id, step: 'ing' }); }
    else if (mode === 'build') newRecipe();
    else go('home');
  };
  el.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-next]')) goStep(step + 1);
    else if (t.closest('[data-prev]')) goStep(step - 1);
    else if (t.closest('[data-skip]')) finish('skip');
    else if (t.closest('[data-finish]')) finish(t.closest('[data-finish]').dataset.finish);
    else if (t.closest('[data-restore]')) restoreChooser();
    else if (t.closest('[data-margin]')) {
      readForm();
      draft.margin = Number(t.closest('[data-margin]').dataset.margin);
      paint();
      const b = $(`[data-margin="${draft.margin}"]`, el); if (b) b.focus();
    }
  });
  el.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'onb-business') { draft.business = t.value; $('.onb-art-in', el).innerHTML = art(); }
    if (t.dataset.price) {
      draft.prices[t.dataset.price] = t.value;
      const card = t.closest('.st-card');
      const on = num(t.value) > 0;
      card.classList.toggle('on', on);
      const chk = $('.tile-chk', card);
      if (on && !chk) card.insertAdjacentHTML('afterbegin', `<span class="tile-chk" aria-hidden="true">${I.check}</span>`);
      if (!on && chk) chk.remove();
      const f = filled();
      $('.progress .track i', el).style.width = f * 10 + '%';
      $('.progress-txt', el).textContent = `${f} de 10 cargados`;
      $('.onb-art-in', el).innerHTML = art();
      const cta = $('[data-next]', el);
      if (cta) cta.firstChild.textContent = f === 0 ? 'Lo completo después' : 'Siguiente';
    }
  });
  el.addEventListener('change', (e) => { if (e.target.id === 'onb-currency') { draft.currency = e.target.value; } });
  el.addEventListener('submit', (e) => { e.preventDefault(); goStep(step + 1); });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); goStep(step + 1); }
  });
  paint();
}

/* ======================= Licencia (solo informativo) ======================= */
async function loadLicense() {
  const box = $('#lic-box');
  if (!box) return;
  try {
    const res = await fetch('/api/licencia', { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) throw new Error('sin licencia');
    const d = await res.json();
    if (!document.contains(box)) return;
    box.hidden = false;
    $('#lic-info', box).innerHTML = `Código <b>${esc(d.code)}</b>${d.email ? ` · ${esc(d.email)}` : ''}. Activado en ${plural(d.devices, 'dispositivo', 'dispositivos')} de ${d.maxDevices}.`;
    const g = d.guarantee || {};
    if (g.refundable) {
      const until = new Date(g.until).toLocaleDateString('es', { day: 'numeric', month: 'long' });
      $('#lic-g-text', box).innerHTML = `<b>Garantía de ${g.days} días.</b> Hasta el ${esc(until)} puedes pedir la devolución: Mercado Pago te devuelve el pago completo y la app se desactiva.`;
      $('#lic-guarantee', box).hidden = false;
    }
  } catch (e) { /* abierta sin servidor (por ejemplo, desde un archivo) */ }
}
