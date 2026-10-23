// Arma public/index.html y public/activar.html a partir de las piezas de app/.
// Uso: npm run build
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (p) => readFileSync(join(here, p), 'utf8');

const jsFiles = readdirSync(join(here, 'js')).filter((f) => f.endsWith('.js')).sort();
const js = jsFiles.map((f) => read(join('js', f))).join('\n');
const app = read('shell.html').replace('/*CSS*/', () => read('style.css')).replace('//JS', () => js);
writeFileSync(join(root, 'public/index.html'), app);

// Las páginas de activación y de compra llevan la misma torta dibujada, generada con el código de la app.
const pre = `const clamp=(x,a,b)=>Math.min(Math.max(x,a),b);const esc=(s)=>String(s??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const reducedMotion=()=>true;const ingKind=()=>'otro';`;
const cakeHTML = new Function(pre + read('js/01-art-data.js') + read('js/03-art.js') + '\nreturn cakeHTML;')();
const cake = cakeHTML({ masa: 3, relleno: true, cobertura: 'rosa', sabor: 'vainilla', rellenoSabor: 'frutilla', frutillas: true, velas: true }, 'Torta con frutillas y velas');
for (const page of ['activar', 'gracias']) writeFileSync(join(root, `public/${page}.html`), read(`${page}.src.html`).replace('<!--CAKE-->', () => cake));

console.log(`index.html ${app.length} bytes · ${jsFiles.length} archivos JS`);
