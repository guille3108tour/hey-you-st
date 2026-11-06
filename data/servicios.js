/*
  Servicios a domicilio de Hey You ST: lo que un nómada pide y nosotros le resolvemos
  (limpieza, y después lo que vaya pidiendo la gente). Mismo espíritu que data/tours.js:
  un aliado de confianza + botón de WhatsApp. La diferencia es que un servicio NO va en el
  mapa: es a domicilio, no un lugar.

  OJO (Juan): este archivo todavía NO se carga en index.html. Por ahora solo guardamos el
  perfil; cuando queramos mostrarlo en la página se agrega el <script> y la vista.

  Qué se publica y qué no (igual que en tours.js):
  - "local" (nombre de pila) y "whatsapp" (código de país sin + ni espacios, ej. "50688887777")
    hacen que el botón le escriba directo a esa persona. Llenarlos solo cuando ya aceptó salir
    en la página. Vacíos, el botón le escribe a Juan para coordinar.
  - "precio" va solo si ya está cerrado. Si es null, la página dice que se confirma por WhatsApp.
  - La tarifa interna y los márgenes NO van en campos publicables: van en comentarios, como acá.

  "en": el mismo servicio en inglés (idioma con que abre la página). Mismos hechos que el
  español: si cambia uno, cambiar el otro.
*/
const SERVICIOS = [
  {
    // Limpieza a domicilio con Jossmayling.
    //
    // Perfil (interno, Juan): Jossmayling fue sous chef cuando Juan era su manager, así que es
    // gente de confianza, no una desconocida. Joven, con transporte propio (llega sola a Santa
    // Teresa, Mal País y la zona). Quiere turnos en la mañana. Tiene una hermana que también
    // trabaja en limpieza y la mamá es veterana en el oficio: para el "deep cleaning" van las
    // dos hermanas.
    //
    // TARIFA (interna):
    //   1) Deep cleaning inicial (precio cerrado). Van las dos hermanas, llevan y compran los
    //      productos, dejan la casa a punto para que después solo sean repasos.
    //        costo de las dos hermanas (productos incl.) ... ₡40.000  (≈ $78–80)
    //        precio al cliente ............................. ₡60.000  (≈ $120)
    //        margen Hey You ................................ ₡20.000  (≈ $40)
    //   2) Mantenimiento por hora (después del deep cleaning):
    //        base de la limpiadora ..... ₡4.000/h  (≈ $8)
    //        comisión Hey You ........... ₡2.500/h  (≈ $5)
    //        total al cliente ........... ₡6.500/h  (≈ $13)
    //   Nota (Juan): el deep cleaning ya deja margen (~$40) y además es la puerta de entrada al
    //   mantenimiento recurrente por hora, que es lo que suma a largo plazo.
    //   (tipo de cambio aprox. ₡500–510/$1, a afinar al cerrar la tarifa pública.)
    id: "limpieza-jossmayling",
    categoria: "limpieza",
    titulo: "Limpieza a domicilio",
    equipo: "Jossmayling",
    disponibilidad: "Mañanas",
    zona: "Santa Teresa, Mal País y alrededores (transporte propio)",
    incluye: [
      "Productos incluidos (los lleva y compra ella)",
      "Gente de confianza, no un desconocido en tu casa",
      "Disponible por las mañanas",
    ],
    modalidades: [
      {
        nombre: "Deep cleaning inicial",
        precio: "$120",
        texto: "Una limpieza profunda de arranque, van las dos hermanas con todos los productos. Deja la casa a punto para que de ahí en adelante solo sean repasos.",
      },
      {
        nombre: "Mantenimiento por hora",
        precio: "$13/hora",
        texto: "Después del deep cleaning, los repasos se cobran por hora.",
      },
    ],
    // Sin precio único: cada modalidad trae el suyo (ver "modalidades"). El margen interno va
    // en el bloque TARIFA de arriba, no acá.
    precio: null,
    local: "",
    whatsapp: "",
    texto: "Jossmayling trabajó conmigo en cocina —yo era su manager y ella la sous chef—, así que respondo por ella: no es una persona cualquiera entrando a tu casa. Llega con su propio transporte a Santa Teresa, Mal País y la zona, y lleva ella misma los productos. Arrancamos con una limpieza profunda (van ella y su hermana) para dejar la casa impecable, y después mantenemos con repasos por hora. Disponible por las mañanas.",
    en: {
      titulo: "Home cleaning",
      disponibilidad: "Mornings",
      zona: "Santa Teresa, Mal País and nearby (own transportation)",
      incluye: [
        "Products included (she brings and buys them)",
        "Someone you can trust, not a stranger in your home",
        "Available in the mornings",
      ],
      modalidades: [
        {
          nombre: "Initial deep cleaning",
          precio: "$120",
          texto: "A thorough first clean — both sisters come with all the products. Leaves the house in shape so from then on it's just touch-ups.",
        },
        {
          nombre: "Hourly upkeep",
          precio: "$13/hour",
          texto: "After the deep cleaning, touch-ups are charged by the hour.",
        },
      ],
      texto: "Jossmayling worked with me in the kitchen —I was her manager and she was the sous chef— so I vouch for her: she's not just anyone walking into your home. She arrives with her own transportation to Santa Teresa, Mal País and the area, and brings the cleaning products herself. We start with a deep clean (she and her sister come) to leave the house spotless, then keep it up with hourly touch-ups. Available in the mornings.",
    },
  },
];
