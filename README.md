# Cuánto Cobro

**https://cuantocobro.app** · Microaplicación para quienes venden tortas: calcula cuánto cuesta hacer cada torta, a cuánto venderla y cuánto se gana de verdad.

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
| `app/` | El código fuente de la app: `shell.html` (estructura), `style.css`, `js/` (en orden: ilustraciones, datos y cálculos, pantallas, editor, hojas, bienvenida, arranque) y las páginas `landing.src.html`, `activar.src.html` y `gracias.src.html`. |
| `public/index.html` | La app armada en un solo archivo. **No se edita a mano**: se genera con `npm run build`. |
| `public/landing.html` | Landing de venta. Se muestra en `/` a quien no tiene la app activada; el Worker escribe el precio configurado en `/admin` (o "Próximamente" si la venta está cerrada). |
| `public/og.png` | Imagen de vista previa al compartir el enlace (WhatsApp, Instagram, Facebook). |
| `public/activar.html` | Página donde la compradora escribe su código (`/activar`). |
| `public/admin.html` | Tu panel para crear y gestionar códigos (`/admin`). |
| `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg` | Instalación como app y uso sin conexión. |
| `src/worker.js` | Servidor de Cloudflare: valida códigos y solo entrega la app a dispositivos activados. |
| `wrangler.jsonc` | Configuración de Cloudflare: producción (`cake`) y pruebas (`cake-staging`), cada una con su base de códigos. |

## Venta con Mercado Pago

1. La compradora toca el botón **Comprar** de tu landing (Framer o Webflow), que apunta a `https://TU-DOMINIO/comprar`.
2. Paga en Mercado Pago (Checkout Pro).
3. Vuelve a `/gracias`, que le muestra **su código** y un botón **Activar ahora**.
4. Mercado Pago también avisa al servidor (`/api/mp/webhook`). El código se crea aunque ella cierre la página antes de volver. Cada aviso se valida con la firma de Mercado Pago y el pago se confirma consultándolo a Mercado Pago, así que un aviso falso no crea códigos.
5. Si el pago se reembolsa o tiene un contracargo, el código se revoca solo.

Cada pago da siempre el mismo código, aunque el aviso y `/gracias` lleguen al mismo tiempo. En `/admin` ves cada compra con su número de pago y el monto.

### Configurar (una vez por Worker)

1. En **Mercado Pago Developers → Tus integraciones**, crea una aplicación de pagos online (Checkout Pro).
2. Copia el **Access Token** y guárdalo en Cloudflare como Secret `MP_ACCESS_TOKEN`:
   - en `cake`, las credenciales **de producción**;
   - en `cake-staging`, las **de prueba**, para probar con tarjetas de prueba sin cobrar de verdad.
3. En la aplicación de Mercado Pago, ve a **Webhooks → Configurar notificaciones**, pega la URL que muestra `/admin` (`https://TU-DOMINIO/api/mp/webhook`), marca el evento **Pagos** y guarda. Copia la **clave secreta** y guárdala como Secret `MP_WEBHOOK_SECRET`.
4. En `/admin` carga el precio. Cuando todo está en verde dice **Venta abierta**. La landing en `/` ya usa ese precio y el enlace de compra.
   - **En dólares** (recomendado): pones el precio en USD y se cobra en pesos al dólar del día (oficial, blue, MEP o tarjeta, según elijas), redondeado a un precio de vidriera como $22.900. La cotización sale de dolarapi.com y se actualiza cada 6 horas; si la consulta falla se usa la última conocida.
   - **En pesos**: precio fijo.
   - **Precio original tachado** (opcional): si es mayor que el precio que se cobra, la landing muestra "Precio de lanzamiento", el precio anterior tachado y el porcentaje de descuento. Para terminar el lanzamiento, borra el precio original o iguala los dos.
5. **Mail automático con el código (opcional):** necesita un dominio propio verificado en [Resend](https://resend.com). Guarda los Secrets `RESEND_API_KEY` y `MAIL_FROM` (por ejemplo `Cuánto Cobro <hola@cuantocobro.app>`). Sin esto, el código se ve en `/gracias` y puedes reenviarlo desde `/admin` con **Copiar mail**.

## Mails a las compradoras (MailerLite)

Con el Secret `MAILERLITE_API_KEY`, cada compra aprobada (y cada código creado a mano en `/admin` con un mail) agrega a la compradora al grupo "Compradores Cuánto Cobro" de MailerLite (se crea solo; `MAILERLITE_GROUP_ID` fija otro), con los campos `codigo`, `link_activar`, `garantia_dias` y `estado`. La automatización de MailerLite manda los 4 mails: entrega, primeros pasos, opinión y próxima app. Si devuelve la compra, sale del grupo y `estado` pasa a `reembolso`. Los textos, las pausas y los campos están en [`docs/mails-mailerlite.md`](docs/mails-mailerlite.md), y los 4 mails en HTML con el diseño del sitio, en [`docs/mails/`](docs/mails/) (las imágenes salen de `public/email/`). Sin MailerLite, el código igual se ve en `/gracias` (y se manda con Resend si está configurado).

## Garantía y arrepentimiento

- **Botón de arrepentimiento** en `/arrepentimiento` (enlazado al pie de la landing), como pide la Resolución 424/2020: sin registrarse, con el mail de la compra y el código o el número de operación. Siempre da un número de trámite. Dentro del plazo devuelve solo; si no puede, queda como "Pidió devolución" en el panel.
- El plazo para devolver nunca es menor a **10 días corridos** (Ley 24.240, art. 34), aunque en el panel se elija menos.
- Páginas `/terminos` y `/privacidad` (fuentes en `app/legal/`). Falta sumar la razón social o el nombre del titular y el CUIT, y el formulario de Data Fiscal de ARCA, si corresponde.


En `/admin` eliges los días de garantía (7 por defecto; 0 la apaga). La landing, la página de gracias y los Ajustes de la app lo muestran.

- Dentro del plazo, la compradora entra a **Ajustes → Pedir devolución**. El Worker pide el reembolso completo a Mercado Pago y revoca el código: la app deja de abrir en todos sus dispositivos.
- Si Mercado Pago no acepta la devolución (por ejemplo, falta saldo disponible), el pedido queda marcado como **Pidió devolución** en `/admin` y lo haces con el botón **Devolver dinero**.
- **Devolver dinero** en `/admin` sirve para cualquier compra con Mercado Pago, dentro o fuera del plazo.
- Si devuelves el pago desde tu cuenta de Mercado Pago, el aviso también revoca el código.

## Estadísticas

`/admin` muestra el embudo de la venta: visitas, quiénes probaron la demo, vieron el precio, tocaron comprar, llegaron a Mercado Pago y pagaron. También ingresos, devoluciones, de dónde vienen las visitas, el dispositivo, qué botón tocaron, el país y cuántas personas usaron la app en la última semana.

- Se guarda en Cloudflare D1 (`cake-analytics` en producción y `cake-staging-analytics` en pruebas), sin cookies ni datos personales. Cada visita es una pestaña.
- **De dónde vienen**: agrega `?utm_source=instagram` (o `tiktok`, `whatsapp`, `facebook`…) al enlace que compartes, y `&utm_campaign=nombre` si quieres separar campañas. Sin eso se usa el sitio anterior, y si no hay, "directo".
- **Cloudflare Web Analytics** (velocidad de carga, páginas vistas, navegadores) está activo en todas las páginas salvo `/admin`. Se ve en el panel de Cloudflare → Web Analytics.
- **Meta Pixel y Google Analytics 4** (opcionales, para medir anuncios): agrega en `wrangler.jsonc`, dentro de `vars`, `"META_PIXEL_ID": "123456789012345"` o `"GA4_ID": "G-XXXXXXX"`. La landing envía PageView, la demo (`ProboDemo`), el clic en comprar (`InitiateCheckout` / `begin_checkout`) y la página de gracias la compra (`Purchase` / `purchase`) con el monto en pesos.

## Cómo funcionan los códigos

1. Alguien te compra la app.
2. Entras a `https://TU-DOMINIO/admin`, escribes su mail y tocas **Crear código**. Se genera un código como `DULCE-7K3P-Q9XM-R2TD` y un mail listo para copiar o abrir en tu correo.
3. La compradora abre el enlace del mail (`/activar?codigo=…`) y toca **Activar**. Queda activada en ese dispositivo y la app funciona incluso sin conexión.
4. Cada código sirve para **3 dispositivos** (lo puedes cambiar al crearlo). Desde el panel puedes:
   - **Revocar** un código (por ejemplo, si hubo un reembolso): la app deja de abrirse en todos sus dispositivos.
   - **Liberar** los dispositivos de un código: sirve si alguien cambió de teléfono.
   - **Copiar mail**: vuelve a copiar el texto para reenviárselo.

   La compradora también puede liberar un lugar desde **Ajustes → Desactivar este dispositivo**.

El servidor guarda los códigos en Cloudflare KV. La app solo se entrega a dispositivos con una cookie firmada de un código válido. Sin código, quien entra a `/` ve la landing de venta; `/activar` sigue disponible para cargar un código.

## Ramas y ambientes

| Rama | Worker en Cloudflare | Dirección | Base de códigos | Para qué |
| --- | --- | --- | --- | --- |
| `prod` | `cake` | https://cuantocobro.app | `cake-licencias` | La app que usan tus clientas. |
| `staging` | `cake-staging` | https://staging.cuantocobro.app | `cake-staging-licencias` | Probar cambios antes de publicarlos. |

`www.cuantocobro.app` y las direcciones `*.workers.dev` redirigen al dominio (variable `CANONICAL_HOST`), salvo `/api/`, para no cortar avisos de Mercado Pago. La app se llamaba **Dulce Cuenta**: los códigos viejos `DULCE-…` siguen funcionando y los nuevos empiezan con `COBRO-`.

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

Los cambios se hacen en `app/` y después se arma con `npm run build`, que regenera `public/index.html`, `public/landing.html`, `public/activar.html` y `public/gracias.html`. Hay que subir los dos (fuente y armado), porque Cloudflare publica `public/` tal cual.

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
