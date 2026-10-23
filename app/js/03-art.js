/* ======================= Ilustraciones ======================= */
const INK = '#3A2228';

function ingArt(kind, size) {
  const k = ING_ART[kind] ? kind : 'otro';
  const dim = size ? ` width="${size}" height="${size}"` : '';
  return `<svg class="ing-art" viewBox="0 0 64 64"${dim} aria-hidden="true" focusable="false" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="32" cy="59.5" rx="20" ry="2.5" fill="${INK}" stroke="none" opacity=".1"/>${ING_ART[k]}</svg>`;
}
const ingArtFor = (ing, size) => ingArt(ingKind(ing), size);
function xArt(kind, size = 44) {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" focusable="false" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${X_ART[kind] || ''}</svg>`;
}

/* Torta por capas. Cada grupo lleva data-k para animar solo lo que aparece. */
function cakeGeo(p) {
  const flag = (v, d) => (v === undefined || v === null ? d : v === true || v === 'true');
  const masa = clamp(Math.round(Number(p.masa ?? 3)) || 0, 0, 3);
  const relleno = flag(p.relleno, true) && masa > 0;
  const cob = masa > 0 ? (p.cobertura ?? 'rosa') : 'ninguna';
  const sabor = p.sabor ?? 'vainilla';
  const rsabor = p.rellenoSabor ?? 'ddl';
  const caja = flag(p.caja, false);
  const bandeja = flag(p.bandeja, false);
  const frutillas = flag(p.frutillas, true) && masa > 0;
  const rosetas = flag(p.rosetas, false) && masa > 0;
  const granas = flag(p.granas, false) && masa > 0;
  const velas = flag(p.velas, true) && masa > 0;
  const topper = flag(p.topper, false) && masa > 0;

  const SAB = { vainilla: ['#F0CB93', '#C99A57'], chocolate: ['#7A4A35', '#55301F'], redvelvet: ['#B23A48', '#82263A'], limon: ['#F2DD8A', '#C9AE52'] };
  const REL = { ddl: '#B87436', frutilla: '#E07A92', crema: '#FFF6EA', limon: '#F3DE72' };
  const COB = { rosa: ['#F2A7BB', '#FFF2F4', '#F2A7BB'], chocolate: ['#4A2A1E', '#FFF2E2', '#C99A57'], crema: ['#FFF7EE', '#F2A7BB', '#FFFFFF'], merengue: ['#FFFFFF', '#F2A7BB', '#FFFFFF'] };
  const sc = SAB[sabor] || SAB.vainilla;
  const cc = COB[cob] || COB.rosa;

  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  const stack = [];
  let y = 236;
  let top = 236;
  for (let i = 0; i < masa; i++) {
    y -= 38;
    top = y;
    const crumbs = [];
    for (let k = 0; k < 8; k++) crumbs.push({ x: (74 + rnd() * 172).toFixed(1), y: (y + 13 + rnd() * 19).toFixed(1), r: (1.3 + rnd() * 1.3).toFixed(1) });
    stack.push({ k: 'm' + i, y, hy: y + 6, sponge: true, crumbs });
    if (relleno && (i < masa - 1 || masa === 1)) {
      const fy = y - 9;
      stack.push({ k: 'r' + i, y: fy, fill: true });
      top = fy;
      y = fy + 2;
    }
  }
  const t = top - 3;
  const b = top + 16;
  const drips = [[244, 16], [220, 8], [196, 24], [168, 11], [140, 20], [112, 7], [84, 15]];
  let cobPath = 'M58 ' + b + ' V' + (t + 8) + ' Q58 ' + t + ' 66 ' + t + ' H254 Q262 ' + t + ' 262 ' + (t + 8) + ' V' + b;
  drips.forEach(([x, len]) => { cobPath += ' H' + (x + 6) + ' V' + (b + len) + ' A6 6 0 0 1 ' + (x - 6) + ' ' + (b + len) + ' V' + b; });
  cobPath += ' H58 Z';
  const showCob = cob !== 'ninguna' && masa > 0;
  const surf = showCob ? t : top;

  const sprinkles = [];
  const scols = ['#F6C453', '#7BC4C4', '#E86A92', '#FFFFFF', '#9C7BD1'];
  for (let k = 0; k < 22; k++) {
    const x = 66 + rnd() * 186;
    const yy = surf + 3 + rnd() * 9;
    const a = Math.round(rnd() * 180);
    sprinkles.push({ x: x.toFixed(1), y: yy.toFixed(1), c: scols[k % scols.length], t: 'rotate(' + a + ' ' + (x + 3).toFixed(1) + ' ' + (yy + 1.3).toFixed(1) + ')' });
  }
  const rosettes = [84, 122, 160, 198, 236].map((x) => ({ x, y: surf - 1 }));
  const bx = velas ? [82, 108, 212, 238] : rosetas ? [103, 141, 179, 217] : [100, 140, 180, 220];
  const berries = bx.map((x) => 'translate(' + x + ' ' + (surf - 4) + ') scale(.6)');
  const candles = [[134, 34, '#9FD3E6'], [160, 42, '#F6C453'], [186, 34, '#F29BB6']].map(([x, h, c]) => ({
    x: x - 4, cx: x, y: surf - h, h: h + 2, c,
    stripe: 'M' + (x - 2) + ' ' + (surf - h + 8) + ' L' + (x + 2) + ' ' + (surf - h + 12) + ' M' + (x - 2) + ' ' + (surf - h + 18) + ' L' + (x + 2) + ' ' + (surf - h + 22),
    fy: surf - h - 9, fy2: surf - h - 7
  }));
  const topY = velas ? surf - 96 : surf - 76;
  const topSticks = 'M114 ' + (surf + 2) + ' V' + (topY + 26) + ' M206 ' + (surf + 2) + ' V' + (topY + 26);

  const SABN = { vainilla: 'de vainilla', chocolate: 'de chocolate', redvelvet: 'red velvet', limon: 'de limón' };
  const RELN = { ddl: 'dulce de leche', frutilla: 'frutilla', crema: 'crema', limon: 'crema de limón' };
  const COBN = { rosa: 'rosa', chocolate: 'de chocolate', crema: 'de crema', merengue: 'de merengue' };
  let label;
  if (masa === 0) label = 'Torta vacía: todavía no tiene ingredientes';
  else {
    label = 'Torta de ' + masa + (masa === 1 ? ' capa' : ' capas') + ' de bizcocho ' + (SABN[sabor] || '');
    if (relleno) label += ', relleno de ' + (RELN[rsabor] || 'crema');
    if (showCob) label += ', cobertura ' + (COBN[cob] || '');
    const deco = [];
    if (frutillas) deco.push('frutillas');
    if (rosetas) deco.push('rosetas');
    if (granas) deco.push('granas de colores');
    if (velas) deco.push('velas');
    if (topper) deco.push('cartelito');
    if (caja) deco.push('caja');
    if (deco.length) label += ', con ' + deco.join(', ');
  }
  return { masa, stack, sc, cc, cobPath, showCob, surf, sprinkles, rosettes, berries, candles, topY, topSticks, label, caja, bandeja, frutillas, rosetas, granas, velas, topper, fillC: REL[rsabor] || REL.ddl };
}

function cakeBuild(p, labelOverride) {
  const g = cakeGeo(p);
  const parts = [];
  const add = (k, svg) => parts.push([k, svg]);
  const crumbC = g.sc[1], spongeC = g.sc[0];
  if (g.caja) add('cajaB', `<g data-k="cajaB"><rect x="22" y="52" width="276" height="160" rx="8" fill="#FFD6E3" opacity=".55"/><path d="M22 76 H298" stroke="#F2A7BB" stroke-width="3" fill="none"/></g>`);
  const shadow = `<ellipse cx="160" cy="274" rx="92" ry="4.5" fill="${INK}" opacity=".08"/>`;
  if (!g.bandeja) add('stand', `<g data-k="stand"><ellipse cx="160" cy="266" rx="46" ry="7" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/><path d="M145 245 L175 245 L169 262 H151 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="38" y="234" width="244" height="12" rx="6" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/><path d="M50 238 H120" stroke="#F2A7BB" stroke-width="2" stroke-linecap="round" fill="none"/></g>`);
  else add('band', `<g data-k="band"><rect x="30" y="234" width="260" height="14" rx="7" fill="#E3B95C" stroke="${INK}" stroke-width="2.5"/><path d="M42 239 H140" stroke="#F6DFA0" stroke-width="2.5" stroke-linecap="round" fill="none"/></g>`);
  if (g.masa === 0) add('ghost', `<g data-k="ghost"><rect x="62" y="122" width="196" height="112" rx="10" fill="none" stroke="#B07F8D" stroke-width="2.5" stroke-dasharray="8 8"/><path d="M160 160 V196 M142 178 H178" stroke="#B07F8D" stroke-width="3" stroke-linecap="round" fill="none"/></g>`);
  for (const l of g.stack) {
    if (l.sponge) {
      const crumbs = l.crumbs.map((c) => `<circle cx="${c.x}" cy="${c.y}" r="${c.r}" fill="${crumbC}"/>`).join('');
      add(l.k, `<g data-k="${l.k}"><rect x="62" y="${l.y}" width="196" height="38" rx="9" fill="${spongeC}" stroke="${INK}" stroke-width="2.5"/><rect x="72" y="${l.hy}" width="176" height="3" rx="1.5" fill="#FFFFFF" opacity=".32"/>${crumbs}</g>`);
    } else add(l.k, `<g data-k="${l.k}"><rect x="57" y="${l.y}" width="206" height="11" rx="5.5" fill="${g.fillC}" stroke="${INK}" stroke-width="2.5"/></g>`);
  }
  if (g.showCob) add('cob', `<g data-k="cob"><path d="${g.cobPath}" fill="${g.cc[0]}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M72 ${g.surf + 6} H118" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".45" fill="none"/></g>`);
  if (g.granas) add('gra', `<g data-k="gra">${g.sprinkles.map((s) => `<rect x="${s.x}" y="${s.y}" width="6" height="2.6" rx="1.3" fill="${s.c}" transform="${s.t}"/>`).join('')}</g>`);
  if (g.rosetas) {
    const ringC = g.cc[2] === '#FFFFFF' ? '#E7C9CF' : g.cc[2];
    const rosC = g.showCob ? g.cc[1] : '#FFF2F4';
    add('ros', `<g data-k="ros">${g.rosettes.map((r) => `<circle cx="${r.x}" cy="${r.y}" r="9" fill="${rosC}" stroke="${INK}" stroke-width="2.2"/><circle cx="${r.x}" cy="${r.y}" r="3.6" fill="none" stroke="${g.showCob ? ringC : '#F2A7BB'}" stroke-width="1.8"/>`).join('')}</g>`);
  }
  if (g.frutillas) {
    const berry = (tr) => `<g transform="${tr}"><path d="M0 -12 C-9 -13 -13 -6 -11 2 C-9 9 -4 14 0 16 C4 14 9 9 11 2 C13 -6 9 -13 0 -12 Z" fill="#E2384F" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-8 -11 L-4 -18 L0 -13 L4 -18 L8 -11 Q0 -7 -8 -11 Z" fill="#5E9A4E" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><ellipse cx="-4" cy="-2" rx="1.4" ry="2" fill="#FCE38A"/><ellipse cx="4" cy="-1" rx="1.4" ry="2" fill="#FCE38A"/><ellipse cx="0" cy="6" rx="1.4" ry="2" fill="#FCE38A"/></g>`;
    add('fru', `<g data-k="fru">${g.berries.map(berry).join('')}</g>`);
  }
  if (g.velas) {
    add('vel', `<g data-k="vel">${g.candles.map((v) => `<rect x="${v.x}" y="${v.y}" width="8" height="${v.h}" rx="2" fill="${v.c}" stroke="${INK}" stroke-width="2"/><path d="${v.stripe}" stroke="#FFFFFF" stroke-width="2" opacity=".7" fill="none"/><ellipse cx="${v.cx}" cy="${v.fy}" rx="4.2" ry="7" fill="#F5A524" stroke="${INK}" stroke-width="1.6"><animate attributeName="ry" values="7;5.8;7" dur="1.1s" repeatCount="indefinite"/></ellipse><ellipse cx="${v.cx}" cy="${v.fy2}" rx="1.8" ry="3" fill="#FFE08A"/>`).join('')}</g>`);
  }
  if (g.topper) {
    add('top', `<g data-k="top"><path d="${g.topSticks}" stroke="#B9965A" stroke-width="3" stroke-linecap="round" fill="none"/><rect x="104" y="${g.topY}" width="112" height="26" rx="6" fill="#D63C72" stroke="${INK}" stroke-width="2.5"/><text x="160" y="${g.topY + 17}" text-anchor="middle" font-family="DM Sans, sans-serif" font-weight="800" font-size="11" letter-spacing="1.4" fill="#FFFFFF">FELIZ DÍA</text></g>`);
  }
  if (g.caja) add('cajaF', `<g data-k="cajaF"><rect x="18" y="204" width="284" height="60" rx="8" fill="#FFD6E3" stroke="${INK}" stroke-width="2.5"/><rect x="146" y="204" width="28" height="60" fill="#D63C72" stroke="${INK}" stroke-width="2.5"/><ellipse cx="148" cy="200" rx="13" ry="7" fill="#D63C72" stroke="${INK}" stroke-width="2.5" transform="rotate(-18 148 200)"/><ellipse cx="172" cy="200" rx="13" ry="7" fill="#D63C72" stroke="${INK}" stroke-width="2.5" transform="rotate(18 172 200)"/><circle cx="160" cy="203" r="5" fill="#B02A5B" stroke="${INK}" stroke-width="2.5"/></g>`);
  /* La sombra va después de la caja de fondo y antes del resto. */
  const idx = parts.findIndex((x) => x[0] !== 'cajaB');
  const html = parts.map((x) => x[1]);
  html.splice(idx < 0 ? html.length : idx, 0, shadow);
  return {
    keys: parts.map((x) => x[0]),
    html: `<svg class="cake-art" viewBox="0 0 320 280" role="img" aria-label="${esc(labelOverride || g.label)}" focusable="false">${html.join('')}</svg>`
  };
}
const cakeHTML = (p, label) => cakeBuild(p, label).html;
/* Dibuja la torta dentro de un contenedor y anima solo las capas nuevas. */
function mountCake(el, p, animate) {
  if (!el) return;
  const { html, keys } = cakeBuild(p);
  const prev = el._keys;
  el.innerHTML = html;
  el._keys = keys;
  if (!animate || !prev || reducedMotion()) return;
  let d = 0;
  keys.filter((k) => !prev.includes(k) && k !== 'ghost').forEach((k) => {
    const g = el.querySelector(`[data-k="${k}"]`);
    if (g && g.animate) {
      g.animate([{ transform: 'translateY(-64px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 560, delay: d, easing: 'cubic-bezier(.2,.9,.3,1.25)', fill: 'backwards' });
      d += 110;
    }
  });
}
const recipeCakeHTML = (r) => cakeHTML(cakeProps(r), r.name || 'Torta');

/* La pastelería: el cartel muestra el nombre de la usuaria. */
function localSign(nombre) {
  const raw = String(nombre ?? '').trim();
  const text = raw || 'Tu pastelería';
  const L = text.length;
  const base = L <= 8 ? 30 : L <= 12 ? 25 : L <= 16 ? 20 : L <= 22 ? 16 : 13;
  return { text, base, empty: raw.length === 0 };
}
function localHTML(nombre, abierto) {
  const s = localSign(nombre);
  const glass = abierto ? '#FFF3C9' : '#FFF1F5';
  let stripes = '';
  for (let i = 0; i < 10; i++) {
    const x = 30 + i * 28;
    stripes += `<path d="M${x} 118 H${x + 28} V136 A14 14 0 0 1 ${x} 136 Z" fill="${i % 2 ? '#FFFFFF' : '#D63C72'}"/>`;
  }
  const open = abierto ? `<path d="M44 38 Q 100 50 156 38 M184 38 Q 240 50 296 38" stroke-width="1.5"/>${[[58, 42], [100, 44], [142, 41], [198, 41], [240, 44], [282, 42]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#F6C453" stroke-width="1.5"/>`).join('')}` : '';
  const sign = abierto ? `<path d="M243 220 L255 211 L267 220" stroke-width="1.5"/><rect x="235" y="219" width="40" height="16" rx="3" fill="#FFFFFF" stroke-width="2"/><text x="255" y="230.2" text-anchor="middle" font-family="DM Sans, sans-serif" font-weight="800" font-size="7.4" letter-spacing=".6" fill="#2F6B40" stroke="none">ABIERTO</text>` : '';
  return `<div class="local" aria-hidden="true">
    <svg viewBox="0 0 340 300" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
      <ellipse cx="170" cy="292" rx="156" ry="6" fill="${INK}" stroke="none" opacity=".08"/>
      <rect x="36" y="28" width="268" height="256" rx="10" fill="#FFF8F1"/>
      <rect x="26" y="20" width="288" height="16" rx="6" fill="#F2A7BB"/>${open}
      <rect x="70" y="48" width="200" height="56" rx="12" fill="#FFFFFF"/>
      <rect x="77" y="55" width="186" height="42" rx="8" stroke="#F2A7BB" stroke-width="1.6" stroke-dasharray="4 4"/>
      <rect x="24" y="108" width="292" height="10" rx="4" fill="#B02A5B"/>${stripes}
      <rect x="54" y="168" width="152" height="98" rx="8" fill="${glass}"/>
      <path d="M66 204 L94 176 M66 222 L112 176" stroke="#FFFFFF" stroke-width="4" opacity=".8"/>
      <rect x="62" y="244" width="136" height="7" rx="3.5" fill="#E9CFC6" stroke-width="2"/>
      <rect x="82" y="216" width="56" height="28" rx="5" fill="#F0CB93" stroke-width="2.2"/>
      <rect x="80" y="209" width="60" height="12" rx="6" fill="#F2A7BB" stroke-width="2.2"/>
      <path d="M110 203 Q112 196 117 194" stroke-width="2"/>
      <circle cx="110" cy="204" r="5.5" fill="#C0292F" stroke-width="2"/>
      <path d="M156 244 L152 228 H180 L176 244 Z" fill="#9FD3E6" stroke-width="2.2"/>
      <path d="M151 228 Q151 214 166 214 Q181 214 181 228 Z" fill="#FFF2F4" stroke-width="2.2"/>
      <circle cx="166" cy="211" r="4" fill="#C0292F" stroke-width="2"/>
      <rect x="222" y="164" width="66" height="120" rx="6" fill="#F2A7BB"/>
      <path d="M232 210 V188 A23 23 0 0 1 278 188 V210 Z" fill="${glass}"/>
      <circle cx="279" cy="240" r="3.6" fill="${INK}" stroke="none"/>${sign}
      <rect x="14" y="281" width="312" height="9" rx="4.5" fill="#E9CFC6" stroke-width="2"/>
    </svg>
    <div class="local-sign${s.empty ? ' is-empty' : ''}" style="--fs:${s.base}">${esc(s.text)}</div>
  </div>`;
}

/* Gráfico de torta del onboarding: la porción rosa es la ganancia. */
function pieHTML(margin, size) {
  const m = clamp(margin, 0, 100) / 100;
  const cx = 100, cy = 100, r = 78;
  const pt = (deg, rr, ox, oy) => { const a = deg * Math.PI / 180; return [(cx + ox + rr * Math.cos(a)).toFixed(2), (cy + oy + rr * Math.sin(a)).toFixed(2)]; };
  const a0 = -90, a1 = -90 + 360 * m, am = (a0 + a1) / 2 * Math.PI / 180;
  const ox = 9 * Math.cos(am), oy = 9 * Math.sin(am);
  const p0 = pt(a0, r, ox, oy), p1 = pt(a1, r, ox, oy);
  const pieSlice = 'M' + (cx + ox).toFixed(2) + ' ' + (cy + oy).toFixed(2) + ' L' + p0[0] + ' ' + p0[1] + ' A' + r + ' ' + r + ' 0 ' + (m > 0.5 ? 1 : 0) + ' 1 ' + p1[0] + ' ' + p1[1] + ' Z';
  const q0 = pt(a1, r, 0, 0), q1 = pt(a0 + 360, r, 0, 0);
  const pieRest = 'M' + cx + ' ' + cy + ' L' + q0[0] + ' ' + q0[1] + ' A' + r + ' ' + r + ' 0 ' + (1 - m > 0.5 ? 1 : 0) + ' 1 ' + q1[0] + ' ' + q1[1] + ' Z';
  let dots = '';
  for (let i = 0; i < 12; i++) {
    const deg = -90 + 15 + i * 30;
    const inSlice = deg < a1;
    const p = pt(deg, 62, inSlice ? ox : 0, inSlice ? oy : 0);
    dots += `<circle cx="${p[0]}" cy="${p[1]}" r="5.5" fill="#FFFFFF" stroke="${INK}" stroke-width="1.6"/>`;
  }
  return `<svg class="pie-art" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="De cada $100 que cobras, $${Math.round(margin)} son ganancia" style="overflow:visible"><circle cx="100" cy="104" r="80" fill="${INK}" opacity=".08"/><path d="${pieRest}" fill="#F6DDB0" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="${pieSlice}" fill="#F2A7BB" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>${dots}</svg>`;
}

/* Etiqueta "$?" de la primera pantalla. */
const PRICE_TAG = `<svg class="price-tag" viewBox="0 0 92 78" aria-hidden="true" focusable="false" style="overflow:visible"><path d="M2 14 Q 16 30 32 32" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><g transform="rotate(12 58 44)"><path d="M32 32 L46 20 H84 Q88 20 88 24 V62 Q88 66 84 66 H46 L32 54 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="42" cy="43" r="3.4" fill="#FFE6EE" stroke="${INK}" stroke-width="1.6"/><text x="66" y="52" text-anchor="middle" font-family="Bagel Fat One, Georgia, serif" font-size="22" fill="#A82756">$?</text></g></svg>`;
const TAG_SMALL = `<svg viewBox="0 0 60 48" width="46" height="37" aria-hidden="true" focusable="false"><path d="M4 24 L18 8 H52 Q56 8 56 12 V36 Q56 40 52 40 H18 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="16" cy="24" r="3" fill="#FFE6EE" stroke="${INK}" stroke-width="1.6"/><text x="37" y="31" text-anchor="middle" font-family="Bagel Fat One, Georgia, serif" font-size="18" fill="#A82756">$</text></svg>`;

/* ======================= Iconos ======================= */
const ico = (d, { w = 2, s = 22 } = {}) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
const ICON_D = {
  inicio: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  tortas: 'M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7zM5 16c1.5 1.3 3 1.3 4.5 0s3-1.3 4.5 0 3 1.3 5 0M3 21h18M12 12V8.5M12 6.5c1-.9 1-2 0-3-1 1-1 2.1 0 3z',
  ingredientes: 'M8 3h8M7 6h10l1 2.5V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8.5zM9 12.5h6M9 16h4',
  ventas: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  ajustes: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M13 6a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  copy: 'M9 9h11v11H9zM5 15V5a1 1 0 0 1 1-1h10',
  down: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  up: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4',
  search: 'M17.5 11a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0zM16 16l4.5 4.5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01'
};
const I = {};
Object.keys(ICON_D).forEach((k) => { I[k] = ico(ICON_D[k]); });
I.plus = ico(ICON_D.plus, { w: 2.4, s: 20 });
I.arrow = ico(ICON_D.arrow, { w: 2.4, s: 20 });
I.check = ico(ICON_D.check, { w: 3.4, s: 13 });
I.close = ico(ICON_D.close, { w: 2.4, s: 18 });
I.trash = ico(ICON_D.trash, { s: 18 });
I.edit = ico(ICON_D.edit, { s: 18 });
I.back = ico(ICON_D.back, { w: 2.2, s: 22 });
I.search = ico(ICON_D.search, { w: 2.2, s: 18 });
I.alert = ico(ICON_D.alert, { s: 24 });
I.shield = ico(ICON_D.shield, { s: 24 });
I.tag = ico(ICON_D.tag, { s: 24 });
I.grid = ico(ICON_D.grid, { w: 2.2, s: 16 });
I.list = ico(ICON_D.list, { w: 2.2, s: 16 });
