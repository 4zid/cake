# Arma los 4 mails de la secuencia en HTML con el diseño de Cuánto Cobro, listos para pegar en MailerLite.
# Uso: python3 docs/mails/armar.py
# Campos de MailerLite: {$name}, {$codigo}, {$link_activar}, {$garantia_dias}; {$unsubscribe} es el enlace de baja.
from pathlib import Path

AQUI = Path(__file__).parent
SITIO = 'https://cuantocobro.app'
INK, INK2, BTN, ACC, GLAZE, STAGE, LINE, GREEN, GREENBG = '#3A2228', '#7A5860', '#C42F65', '#A82756', '#FFE6EE', '#FFF1F5', '#F5D5DF', '#2F6B40', '#E5F4E8'
FONT = "'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif"


def boton(texto, link):
    # Botón grueso del sitio: borde de tinta y sombra dura abajo (con borde, porque Gmail no muestra sombras).
    return f'''<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px">
  <tr><td align="center" bgcolor="{BTN}" style="border:2px solid {INK};border-bottom-width:6px;border-radius:16px">
    <a href="{link}" target="_blank" style="display:inline-block;padding:15px 30px;font-family:{FONT};font-size:17px;font-weight:800;line-height:1.2;color:#FFFFFF;text-decoration:none;border-radius:14px">{texto}</a>
  </td></tr>
</table>'''


def p(texto, extra=''):
    return f'<p style="margin:0 0 16px;font-family:{FONT};font-size:16px;line-height:1.6;color:{INK};{extra}">{texto}</p>'


def titulo(texto):
    return f'<h1 style="margin:0 0 18px;font-family:{FONT};font-size:27px;line-height:1.2;font-weight:800;color:{INK};letter-spacing:-0.3px">{texto}</h1>'


def caja(html, fondo=GLAZE, color=INK):
    return f'''<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px">
  <tr><td style="padding:18px 20px;background:{fondo};border-radius:18px;font-family:{FONT};font-size:16px;line-height:1.55;color:{color}">{html}</td></tr>
</table>'''


def lista(items, numerada=True):
    filas = ''
    for i, (fuerte, texto) in enumerate(items, 1):
        marca = f'<span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:50%;background:{BTN};color:#FFFFFF;font-weight:800;font-size:14px;text-align:center;font-family:{FONT}">{i}</span>' if numerada else f'<span style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:10px;background:{GLAZE};color:{ACC};font-weight:800;font-size:14px;text-align:center;font-family:{FONT}">{i}</span>'
        filas += f'''<tr><td valign="top" style="padding:0 12px 14px 0;width:28px">{marca}</td>
<td valign="top" style="padding:3px 0 14px;font-family:{FONT};font-size:16px;line-height:1.55;color:{INK}"><b>{fuerte}</b> {texto}</td></tr>'''
    return f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 8px">{filas}</table>'


def firma():
    return p('— Lautaro, de <b style="color:' + ACC + '">Cuánto Cobro</b>', 'margin-top:22px')


def mail(vista_previa, cuerpo, con_torta=False):
    torta = f'<tr><td align="center" style="padding:0 0 6px"><img src="{SITIO}/email/torta.png" width="190" alt="" style="display:block;width:190px;max-width:60%;height:auto;border:0"></td></tr>' if con_torta else ''
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Cuánto Cobro</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800&display=swap">
<style>
  body {{ margin:0; padding:0; background:{STAGE}; }}
  a {{ color:{ACC}; }}
  @media (max-width: 600px) {{
    .card {{ border-radius:0 !important; }}
    .pad {{ padding-left:22px !important; padding-right:22px !important; }}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:{STAGE}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{STAGE}">{vista_previa}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{STAGE}" style="background:{STAGE}">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" class="card" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#FFFFFF;border-radius:28px;overflow:hidden;border:1.5px solid {LINE}">
    <tr><td align="center" bgcolor="{GLAZE}" style="background:{GLAZE};padding:26px 24px 22px">
      <a href="{SITIO}" target="_blank" style="text-decoration:none"><img src="{SITIO}/email/logo.png" width="190" alt="Cuánto Cobro" style="display:block;width:190px;height:auto;border:0;font-family:{FONT};font-size:24px;font-weight:800;color:{ACC}"></a>
    </td></tr>
    <tr><td style="background:{GLAZE};line-height:0;font-size:0"><div style="height:14px;background:radial-gradient(circle at 12px 0, {GLAZE} 11px, #FFFFFF 12px) 0 0 / 24px 14px repeat-x"></div></td></tr>
    {torta}
    <tr><td class="pad" style="padding:22px 40px 30px">
{cuerpo}
    </td></tr>
  </table>
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px">
    <tr><td class="pad" align="center" style="padding:20px 40px 8px;font-family:{FONT};font-size:12.5px;line-height:1.6;color:{INK2}">
      Recibes este mail porque compraste Cuánto Cobro. Si tienes dudas, responde este mail o escríbenos a <a href="mailto:hola@cuantocobro.app" style="color:{ACC}">hola@cuantocobro.app</a>.<br>
      <a href="{SITIO}" style="color:{INK2}">cuantocobro.app</a> · <a href="{{$unsubscribe}}" style="color:{INK2}">Darme de baja</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
'''


MAILS = {
    '1-entrega': {
        'asunto': 'Tu acceso a Cuánto Cobro 🎂',
        'vista': 'Tu código y el link para empezar ahora mismo.',
        'torta': True,
        'cuerpo': '\n'.join([
            titulo('¡Hola {$name}! Ya tienes tu acceso'),
            p('Gracias por comprar <b>Cuánto Cobro</b>. Con esto entras a la app:'),
            caja(f'<span style="display:block;font-size:13px;font-weight:700;color:{INK2};letter-spacing:.5px;text-transform:uppercase">Tu código</span>'
                 f'<span style="display:block;margin-top:4px;font-family:Menlo,Consolas,monospace;font-size:24px;font-weight:800;letter-spacing:2px;color:{INK}">{{$codigo}}</span>'),
            boton('Activar mi app', '{$link_activar}'),
            p('Ábrelo desde el celular o la computadora: el código ya viene cargado, solo tocas <b>Activar</b>. Puedes usarlo en hasta 3 dispositivos.', f'font-size:15px;color:{INK2}'),
            caja('<b>Un consejo:</b> agrega <b>hola@cuantocobro.app</b> a tus contactos para que los próximos mails no se vayan a spam. Te voy a mandar un par de ideas para sacarle el jugo.', fondo=STAGE),
            p('Si algo no funciona, responde este mail y te ayudo.'),
            p('¡Que vendas muchas tortas!'),
            firma(),
        ]),
    },
    '2-primeros-pasos': {
        'asunto': 'Tu primera torta con precio justo (5 minutos)',
        'vista': 'Tres pasos para saber cuánto cobrar tu próxima torta.',
        'cuerpo': '\n'.join([
            titulo('Tu primera torta con precio justo'),
            p('¡Hola {$name}! La mejor forma de empezar es con una torta que ya vendes. En 5 minutos tienes su precio real:'),
            lista([
                ('Carga lo que pagas.', 'En Ingredientes, pon el precio de la harina, los huevos, la manteca… lo que uses de verdad.'),
                ('Arma la torta.', 'Suma ingredientes, la caja o bandeja y las horas que te lleva.'),
                ('Mira el precio sugerido.', 'Compáralo con lo que cobras hoy. Muchas se sorprenden.'),
            ]),
            boton('Abrir Cuánto Cobro', SITIO),
            caja('<b>Tip:</b> cuando suba algo (y va a subir), cambia el precio una vez en Ingredientes y todas tus tortas se recalculan solas.', fondo=GREENBG, color=GREEN),
            p('¿Te trabaste en algún paso? Responde este mail.'),
            firma(),
        ]),
    },
    '3-tu-opinion': {
        'asunto': '¿Te sirvió? (me ayuda muchísimo)',
        'vista': 'Dos líneas tuyas ayudan a otras pasteleras a cobrar mejor.',
        'cuerpo': '\n'.join([
            titulo('¿Cómo te va con tus precios?'),
            p('¡Hola {$name}! Ya llevas unos días con Cuánto Cobro y me encantaría saber cómo te va.'),
            caja('<b>Responde este mail con dos líneas:</b><br>· ¿Qué descubriste sobre tus precios?<br>· ¿Qué mejorarías?'),
            p('Si me dejas, publico tu comentario (solo tu nombre y tu ciudad) para que otras pasteleras se animen a cobrar lo justo. Si prefieres que no, también está perfecto: dímelo y queda entre nosotros.'),
            p(f'Y si algo no te convence, también quiero saberlo. Tienes {{$garantia_dias}} días de garantía desde la compra: en la app, <b>Ajustes → Pedir devolución</b> y te devolvemos todo.', f'font-size:15px;color:{INK2}'),
            p('¡Gracias!'),
            firma(),
        ]),
    },
    '4-proxima-app': {
        'asunto': '¿Qué te gustaría que haga ahora?',
        'vista': 'Estoy armando la próxima herramienta y quiero que la elijas tú.',
        'cuerpo': '\n'.join([
            titulo('Elige la próxima herramienta'),
            p('¡Hola {$name}! Gracias por confiar en Cuánto Cobro. Ya estoy pensando en la próxima herramienta para quienes viven de la pastelería, y quiero que la elijas tú.'),
            p('<b>Responde este mail con el número que más te sirva:</b>'),
            lista([
                ('Presupuestos para eventos:', 'mesas dulces y catering con precio por invitado, listos para mandar por WhatsApp.'),
                ('Agenda de pedidos:', 'fechas de entrega, señas cobradas y lo que falta pagar.'),
                ('Recetas que se escalan:', 'pasa una receta de 12 a 30 porciones y te dice qué comprar.'),
                ('Otra:', 'cuéntame cuál.'),
            ], numerada=False),
            caja('Quienes respondan entran a la lista de espera y la reciben primero, con un <b>precio especial para clientas</b>.', fondo=GREENBG, color=GREEN),
            firma(),
        ]),
    },
}

if __name__ == '__main__':
    indice = []
    for nombre, m in MAILS.items():
        (AQUI / f'{nombre}.html').write_text(mail(m['vista'], m['cuerpo'], m.get('torta', False)), encoding='utf-8')
        indice.append(f'| `{nombre}.html` | {m["asunto"]} | {m["vista"]} |')
    (AQUI / 'README.md').write_text(
        '# Mails en HTML\n\nCódigo listo para pegar en MailerLite (editor de HTML personalizado). '
        'Las imágenes salen de https://cuantocobro.app/email/. Para cambiar textos, edita `armar.py` y corre `python3 docs/mails/armar.py`.\n\n'
        '| Archivo | Asunto | Vista previa |\n| --- | --- | --- |\n' + '\n'.join(indice) + '\n', encoding='utf-8')
    print('listo:', ', '.join(MAILS))
