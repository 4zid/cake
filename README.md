# Dulce Cuenta

Microaplicación para quienes venden tortas: calcula cuánto cuesta hacer cada torta, a cuánto venderla y cuánto se gana de verdad.

Es un solo archivo HTML, sin servidor ni cuentas. Los datos se guardan en el navegador de cada persona.

## Qué hace

- **Onboarding de 4 pasos**: qué hace la app, datos de la cocina (nombre, moneda, valor de la hora, margen), precios de los 10 ingredientes más comunes y elegir entre armar la primera torta o ver un ejemplo.
- **Armar torta (interactivo)**: la torta se dibuja en pantalla y crece con cada ingrediente (bizcocho, relleno, cobertura, decoración). Los extras también se ven: velas, topper, caja, bandeja y perlas. Los colores cambian según los ingredientes (cacao, dulce de leche, frutillas…). Es una ilustración orientativa.
- **Agregar ingrediente paso a paso**: eliges de tu lista o de los comunes, ves de dónde sale el precio ("Compras 1 kg a $1.200"), y pones cuánto usas con botones rápidos (50 g, 100 g, 250 g…). Muestra cuánto suma en la torta antes de agregarlo.
- **Precio de venta**: selector "Sugerido / Mi precio". El sugerido sale del margen que elijas con un deslizador; "Mi precio" te deja poner el tuyo y ver al instante cuánto ganas, el margen real y el precio por porción.
- **¿De dónde sale el precio?**: barra con ingredientes, extras, tu trabajo, gastos y ganancia, más los tres ingredientes que más pesan.
- **Tu lista de ingredientes**: tabla con lo que compras, lo que pagaste y a cuánto te sale (por kg, litro o unidad). El precio se edita directo y las tortas se recalculan solas. Los precios de ejemplo quedan marcados en amarillo.
- **Avisos**: tortas por debajo del costo, precios de ejemplo, precios con más de 30 días y respaldo pendiente.
- **Ventas**: registro de cada torta vendida y resumen mensual de ganancia, ingresos y costos.
- **Respaldo**:
  - Descargar un archivo `.json` con todos los datos y restaurarlo después.
  - Copiar/pegar el respaldo como texto (útil en el teléfono: se pega en una nota o mail).
  - Copias automáticas: una por día de uso (últimas 7) y otra antes de restaurar o borrar.
  - Recordatorio en el inicio si pasaron más de 7 días sin descargar un respaldo.
- **Menú**: barra de botones fija abajo en el celular (siempre visible) y menú lateral en escritorio.
- **Instalable y sin conexión** (PWA) cuando se publica en un sitio con `https`.
- Estética clara en blanco y rosa (igual en todos los dispositivos), responsive y navegable con teclado.

## Archivos

| Archivo | Para qué |
| --- | --- |
| `index.html` | La app completa (HTML, CSS y JS en un archivo). |
| `manifest.webmanifest` | Permite "Agregar a pantalla de inicio" como app. |
| `sw.js` | Modo sin conexión. Opcional. |
| `icon.svg` | Ícono de la app. |

`index.html` funciona solo, incluso abriéndolo con doble clic. Los otros tres archivos suman la instalación como app y el uso sin conexión cuando está publicado en un dominio.

## Publicarla

Cualquier hosting estático sirve:

- **Netlify Drop**: arrastra la carpeta a https://app.netlify.com/drop.
- **Vercel** o **GitHub Pages**: publica la carpeta tal cual, sin build.
- **Framer / Webflow**: publica la app en un hosting estático y embébela con un `iframe`, o enlaza a ella desde tu landing de venta. Los datos de cada clienta quedan en su navegador, asociados al dominio donde está publicada la app; si cambias el dominio, tendrán que usar el respaldo para pasar sus datos.

## Personalizar

- **Colores**: están como variables al principio del `<style>` en `index.html` (`--accent`, `--frosting`, `--bg`…).
- **Tipografías**: Bagel Fat One (títulos) y DM Sans (texto), desde Google Fonts.
- **Nombre**: busca "Dulce Cuenta" en `index.html` y `manifest.webmanifest`.
- **Monedas**: lista `CURRENCIES` en el script.

## Cómo calcula

- Costo de un ingrediente en la receta = cantidad usada × (precio del paquete ÷ tamaño del paquete).
- Costo total = ingredientes + extras + (horas × tarifa) + gastos de cocina.
- Precio sugerido = costo ÷ (1 − margen), redondeado hacia arriba a un número cómodo de cobrar.
- El margen es sobre el precio de venta: con 40%, de cada $100 que cobras, $40 son ganancia.

## Video promocional

`promo/dulce-cuenta-promo.mp4`: video vertical 1080×1920 (Reels, TikTok, Stories) de 44 segundos, sin audio para que le pongas la música de la plataforma.

Se genera con la app real dentro de un celular:

- `promo/promo.html`: las escenas (la pregunta, la demo, beneficios y cierre). Los textos se editan acá.
- `promo/render.mjs`: el guion de la demo (qué se toca y cuándo) y la grabación. Para volver a generarlo:

```bash
npx http-server -p 8765 -c-1 .   # en una terminal
node promo/render.mjs            # en otra; necesita playwright y ffmpeg
```
