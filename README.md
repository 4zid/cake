# Dulce Cuenta

Microaplicación para quienes venden tortas: calcula cuánto cuesta hacer cada torta, a cuánto venderla y cuánto se gana de verdad.

Funciona en el navegador, sin cuentas. Cada compradora recibe por mail un **código de acceso** que activa la app en sus dispositivos. Sus datos se guardan en su propio navegador.

## Qué hace

- **Bienvenida en 5 pasos**: qué hace la app, nombre de la pastelería (se ve en el cartel del local), valor de la hora y margen (con gráfico de torta), precios de los 10 ingredientes más comunes y elegir entre armar la primera torta o ver una de ejemplo. También permite recuperar un respaldo.
- **Armar torta en 3 pasos**:
  1. **Ingredientes**: estantes por parte de la torta (masa, relleno, cobertura, decoración) o vista de lista. Cada ingrediente abre una hoja "¿Cuánto usas?" con cantidades rápidas y muestra cuánto suma. La torta se dibuja y crece con animación.
  2. **Extras y trabajo**: caja, bandeja, velas y cartelito aparecen en el dibujo. También se cargan extras propios, horas de trabajo, gastos de cocina, porciones y notas.
  3. **Precio**: sugerido según el margen, o tu propio precio. Muestra la ganancia, el costo, el precio por porción, de dónde sale el precio y los ingredientes que más pesan.
- **Despensa**: ingredientes en estantes con etiqueta de precio, o en lista para editar precios rápido. Al cambiar un precio, las tortas se recalculan. Los precios de ejemplo y los de más de un mes quedan marcados.
- **Ventas**: resumen del mes (ganancia, cobrado, costos), cada venta y lo que más se vendió.
- **Ajustes**: datos de la pastelería, valores por defecto, licencia del dispositivo, respaldo (archivo o texto), copias automáticas diarias y borrar datos.
- **Avisos en el inicio**: tortas que se venden por debajo del costo, precios de ejemplo, precios viejos y respaldo pendiente.
- **Instalable y sin conexión** (PWA) una vez activada.
- Celular (menú abajo, "Armar torta" a pantalla completa con la torta siempre a la vista) y escritorio (menú lateral).
- **Accesibilidad**: navegable con teclado, foco visible, textos alternativos en las ilustraciones y contraste AA. Las animaciones se apagan si el sistema pide "reducir movimiento".

## Archivos

| Archivo | Para qué |
| --- | --- |
| `public/index.html` | La app completa (HTML, CSS y JS en un archivo). |
| `public/activar.html` | Página donde la compradora escribe su código (`/activar`). |
| `public/admin.html` | Tu panel para crear y gestionar códigos (`/admin`). |
| `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg` | Instalación como app y uso sin conexión. |
| `src/worker.js` | Servidor de Cloudflare: valida códigos y solo entrega la app a dispositivos activados. |
| `wrangler.jsonc` | Configuración de Cloudflare: producción (`cake`) y pruebas (`cake-staging`), cada una con su base de códigos. |

## Cómo funcionan los códigos

1. Alguien te compra la app.
2. Entras a `https://TU-DOMINIO/admin`, escribes su mail y tocas **Crear código**. Se genera un código como `DULCE-7K3P-Q9XM-R2TD` y un mail listo para copiar o abrir en tu correo.
3. La compradora abre el enlace del mail (`/activar?codigo=…`) y toca **Activar**. Queda activada en ese dispositivo y la app funciona incluso sin conexión.
4. Cada código sirve para **3 dispositivos** (lo puedes cambiar al crearlo). Desde el panel puedes:
   - **Revocar** un código (por ejemplo, si hubo un reembolso): la app deja de abrirse en todos sus dispositivos.
   - **Liberar** los dispositivos de un código: sirve si alguien cambió de teléfono.
   - **Copiar mail**: vuelve a copiar el texto para reenviárselo.

   La compradora también puede liberar un lugar desde **Ajustes → Desactivar este dispositivo**.

El servidor guarda los códigos en Cloudflare KV. La app solo se entrega a dispositivos con una cookie firmada de un código válido. Sin código, cualquier visita a la app va a `/activar`.

## Ramas y ambientes

| Rama | Worker en Cloudflare | Base de códigos | Para qué |
| --- | --- | --- | --- |
| `prod` | `cake` | `dulce-cuenta-licencias` | La app que usan tus clientas. |
| `staging` | `cake-staging` | `dulce-cuenta-licencias-staging` | Probar cambios antes de publicarlos. |

Para publicar: los cambios se suben primero a `staging` y, cuando están probados, se pasan a `prod` (merge de `staging` en `prod`). Los códigos de prueba viven en la base de staging y no sirven en producción.

## Puesta en marcha (una sola vez)

**Producción (Worker `cake`)**, en Workers & Pages → `cake` → Settings:

1. **Builds** → rama de producción `prod`, comando de deploy `npx wrangler deploy`. Desactiva "Builds for non-production branches" para que la rama `staging` no se publique acá.
2. Espera el primer deploy. Recién entonces Cloudflare deja agregar variables.
3. **Variables and Secrets** → Add → tipo **Secret**, nombre `ADMIN_TOKEN`, con una clave larga que solo tú conozcas. Es la clave para entrar a `/admin`.
4. **Domains & Routes** → activa `workers.dev` o agrega tu dominio. Si cambias de dominio más adelante, las compradoras tendrán que activar de nuevo y pasar sus datos con el respaldo, porque el navegador los guarda por dominio.

**Pruebas (Worker `cake-staging`)**:

1. Workers & Pages → Create → Import a repository → `4zid/cake`. Nombre del proyecto: `cake-staging`.
2. Comando de deploy: `npx wrangler deploy --env staging`, sin build command. Rama de producción: `staging`.
3. Cuando termine el primer deploy, agrega su propio secreto `ADMIN_TOKEN`, que puede ser distinto al de producción.

## Desarrollo local

```bash
npm install
echo "ADMIN_TOKEN=una-clave-de-prueba" > .dev.vars   # no se sube al repo
npm run dev                                        # http://localhost:8787
```

`npx wrangler dev --env staging` prueba con la configuración de staging. `npm run deploy` publica producción desde tu computadora (necesita `npx wrangler login`). Con el repo conectado a Cloudflare, cada push a la rama de producción se publica solo.

## Personalizar

- **Colores**: variables al principio del `<style>` de `public/index.html` (`--btn`, `--accent`, `--glaze`…).
- **Tipografías**: Bagel Fat One (títulos y precios) y DM Sans (texto), desde Google Fonts.
- **Monedas**: lista `CURRENCIES` en el script.
- **Ingredientes comunes**: lista `COMMON` (nombre, paquete, unidad, parte de la torta e ilustración).
- **Dispositivos por código**: `DEFAULT_DEVICES` en `src/worker.js`, o al crear cada código.
- **Texto del mail**: función `mailBody` en `public/admin.html`.

## Cómo calcula

- Costo de un ingrediente en la receta = cantidad usada × (precio del paquete ÷ tamaño del paquete).
- Costo total = ingredientes + extras + (horas × valor de la hora) + gastos de cocina.
- Precio sugerido = costo ÷ (1 − margen), redondeado hacia arriba a un número cómodo de cobrar.
- El margen es sobre el precio de venta: con 40%, de cada $100 que cobras, $40 son ganancia.

## Video promocional

`promo/dulce-cuenta-promo.mp4` es un video vertical 1080×1920 (Reels, TikTok, Stories) de 44 segundos. **Muestra el diseño anterior de la app.** `promo/promo.html` y `promo/render.mjs` lo generaban tocando la app vieja, así que hay que adaptarlos a las pantallas nuevas antes de volver a grabarlo.
