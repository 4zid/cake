# Dulce Cuenta

Microaplicación para quienes venden tortas: calcula cuánto cuesta hacer cada torta, a cuánto venderla y cuánto se gana de verdad.

Es un solo archivo HTML, sin servidor ni cuentas. Los datos se guardan en el navegador de cada persona.

## Qué hace

- **Onboarding de 4 pasos**: bienvenida, cómo funciona, datos de la cocina (nombre, moneda, tarifa por hora, margen) y elección entre torta de ejemplo o empezar de cero.
- **Ingredientes (despensa)**: cada ingrediente se carga como se compra (paquete de 1 kg, 200 g, 1 docena, 1 litro…) con su precio. La app calcula el precio por kg, litro o unidad. El precio se edita directo en la lista, y las tortas que lo usan se recalculan solas.
- **Calculadora de tortas** en 4 pasos:
  1. Ingredientes con cantidad y unidad (g/kg, ml/l, unidades/docenas, con conversión automática).
  2. Extras: caja, base, decoración, velas, topper, envío…
  3. Horas de trabajo × tarifa por hora, más gas, luz y otros gastos.
  4. Margen de ganancia → precio sugerido (redondeado), precio propio, ganancia, margen real, precio y costo por porción.
- **Avisos**: tortas vendidas por debajo del costo, margen bajo, ingredientes sin precio y precios con más de 30 días sin actualizar.
- **Ventas**: registro de cada torta vendida con lo cobrado y lo que costó; resumen mensual de ingresos, costos y ganancia.
- **Respaldo**:
  - Descargar un archivo `.json` con todos los datos y restaurarlo después.
  - Copiar/pegar el respaldo como texto (útil en el teléfono: se pega en una nota o mail).
  - Copias automáticas: una por día de uso (últimas 7) y otra antes de restaurar o borrar.
  - Recordatorio en el inicio si pasaron más de 7 días sin descargar un respaldo.
- **Instalable y sin conexión** (PWA) cuando se publica en un sitio con `https`.
- Responsive (móvil, tablet, escritorio), modo claro y oscuro automático, navegable con teclado.

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

- **Colores**: están como variables al principio del `<style>` en `index.html` (`--accent`, `--frosting`, `--bg`…), con su versión oscura justo debajo.
- **Tipografías**: Bagel Fat One (títulos) y DM Sans (texto), desde Google Fonts.
- **Nombre**: busca "Dulce Cuenta" en `index.html` y `manifest.webmanifest`.
- **Monedas**: lista `CURRENCIES` en el script.

## Cómo calcula

- Costo de un ingrediente en la receta = cantidad usada × (precio del paquete ÷ tamaño del paquete).
- Costo total = ingredientes + extras + (horas × tarifa) + gastos de cocina.
- Precio sugerido = costo ÷ (1 − margen), redondeado hacia arriba a un número cómodo de cobrar.
- El margen es sobre el precio de venta: con 40%, de cada $100 que cobras, $40 son ganancia.
