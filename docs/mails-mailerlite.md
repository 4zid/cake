# Secuencia de mails · MailerLite

La app agrega sola a cada compradora al **grupo de compradores** de MailerLite apenas se aprueba el pago.
No hace falta Zapier ni systeme.io. Si devuelve la compra, sale del grupo y su campo `estado` pasa a `reembolso`.

Campos que completa la app (en el editor: **Personalizar → campo**):

| Campo | Ejemplo | En el mail |
| --- | --- | --- |
| Nombre | Ana | `{$name}` |
| `codigo` | COBRO-AB12-CD34-EF56 | `{$codigo}` |
| `link_activar` | https://cuantocobro.app/activar?codigo=… | `{$link_activar}` |
| `garantia_dias` | 7 | `{$garantia_dias}` |
| `estado` | activo / reembolso | (para filtros) |

Si la compradora no dejó su nombre en Mercado Pago, `{$name}` llega vacío. Al insertar el campo Nombre en el editor de MailerLite, ponle un valor por defecto (por ejemplo "pastelera") para que el saludo nunca quede "¡Hola !".

## Automatización

Disparador: **cuando un suscriptor se une al grupo** "Compradores Cuánto Cobro".

| Orden | Paso | Configuración |
| --- | --- | --- |
| 1 | Mail 1 · Entrega | Sin pausa |
| 2 | Pausa | 1 día |
| 3 | Mail 2 · Primeros pasos | |
| 4 | Pausa | 4 días (llega el día 5, antes de que termine la garantía) |
| 5 | Mail 3 · Tu opinión | |
| 6 | Pausa | 4 días (llega el día 9, ya pasada la garantía de 7 días) |
| 7 | Condición | `estado` es igual a `activo` → sigue; si no, termina |
| 8 | Mail 4 · Próxima app | |

Remitente: **Cuánto Cobro** · `hola@cuantocobro.app` (hay que autenticar el dominio en MailerLite; los registros se cargan en Cloudflare).

---

## Mail 1 · Entrega (apenas compra)

**Asunto:** Tu acceso a Cuánto Cobro 🎂
**Vista previa:** Tu código y el link para empezar ahora mismo.

> ¡Hola {$name}!
>
> Gracias por comprar **Cuánto Cobro**. Ya tienes tu acceso:
>
> **Tu código:** {$codigo}
>
> **[Activar mi app]({$link_activar})**
>
> Ábrelo desde el celular o la computadora: el código ya viene cargado, solo tocas **Activar**. Puedes usarlo en hasta 3 dispositivos.
>
> Un consejo: agrega este mail a tus contactos para que los próximos no se vayan a spam. Te voy a mandar un par de ideas para sacarle el jugo.
>
> Si algo no funciona, responde este mail y te ayudo.
>
> ¡Que vendas muchas tortas!
> — Lautaro, de Cuánto Cobro

---

## Mail 2 · Primeros pasos (1 día después)

**Asunto:** Tu primera torta con precio justo (5 minutos)
**Vista previa:** Tres pasos para saber cuánto cobrar tu próxima torta.

> ¡Hola {$name}!
>
> La mejor forma de empezar es con una torta que ya vendes. En 5 minutos tienes su precio real:
>
> 1. **Carga lo que pagas.** En Ingredientes, pon el precio de la harina, los huevos, la manteca… lo que uses de verdad.
> 2. **Arma la torta.** Suma ingredientes, la caja o bandeja y las horas que te lleva.
> 3. **Mira el precio sugerido.** Compáralo con lo que cobras hoy. Muchas se sorprenden.
>
> **[Abrir Cuánto Cobro](https://cuantocobro.app)**
>
> Tip: cuando suba algo (y va a subir), cambia el precio una vez en Ingredientes y todas tus tortas se recalculan solas.
>
> ¿Te trabaste en algún paso? Responde este mail.
> — Lautaro

---

## Mail 3 · Tu opinión (día 5)

**Asunto:** ¿Te sirvió? (me ayuda muchísimo)
**Vista previa:** Dos líneas tuyas ayudan a otras pasteleras a cobrar mejor.

> ¡Hola {$name}!
>
> Ya llevas unos días con Cuánto Cobro y me encantaría saber cómo te va.
>
> **Responde este mail con dos líneas:**
> - ¿Qué descubriste sobre tus precios?
> - ¿Qué mejorarías?
>
> Si me dejas, publico tu comentario (solo tu nombre y tu ciudad) para que otras pasteleras se animen a cobrar lo justo. Si prefieres que no, también está perfecto: dímelo y queda entre nosotros.
>
> Y si algo no te convence, también quiero saberlo. Recuerda que tienes {$garantia_dias} días de garantía desde la compra: desde **Ajustes → Pedir devolución** te devolvemos todo.
>
> ¡Gracias!
> — Lautaro

---

## Mail 4 · Próxima app (día 9, pasada la garantía)

**Asunto:** ¿Qué te gustaría que haga ahora?
**Vista previa:** Estoy armando la próxima herramienta y quiero que la elijas tú.

> ¡Hola {$name}!
>
> Gracias por confiar en Cuánto Cobro. Ya estoy pensando en la próxima herramienta para quienes viven de la pastelería, y quiero que la elijas tú.
>
> **Responde este mail con el número que más te sirva:**
>
> 1. **Presupuestos para eventos:** mesas dulces y catering con precio por invitado, listos para mandar por WhatsApp.
> 2. **Agenda de pedidos:** fechas de entrega, señas cobradas y lo que falta pagar.
> 3. **Recetas que se escalan:** pasa una receta de 12 a 30 porciones y te dice qué comprar.
> 4. **Otra:** cuéntame cuál.
>
> Quienes respondan entran a la lista de espera y la reciben primero, con un precio especial para clientas.
>
> — Lautaro, de Cuánto Cobro
