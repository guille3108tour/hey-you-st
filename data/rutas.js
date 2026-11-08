/*
  Rutas a pie para los días libres del Itinerary laboratory (Juan, 27-oct: "diseñemos nuestra primera
  ruta para agregar en el laboratorio de itinerarios... una actividad low budget y es algo que las
  personas pueden disfrutar"). Una ruta son varias paradas gratis en orden, con cuánto se camina
  entre una y otra. En un día libre va como una opción más, antes que los lugares sueltos.

  Este archivo SÍ se publica (propuesta.html e itinerario.html lo leen): no lleva negocios ni
  contactos. Todo sale de lo que cuenta un local; "lugar" es el id de la parada en data/points.js.
  Una parada sin ficha en el mapa igual sale en la ruta, con lo que dice acá (27-oct: los lugares
  de los vídeos de Montezuma, ASVO incluido, los carga el agente de Juan desde la Bandeja de audios;
  Juan pidió armar la ruta sin tocar data/points.js).

  "marea": a qué hora conviene llegar a la parada que manda la marea. "ventana" son las horas
  antes y después de esa marea; "horas", las del día en que se puede llegar. El laboratorio cruza
  las dos con la marea del pronóstico y la propuesta dice a qué hora llegar ese día.

  "en": la misma ruta en inglés, tono de guía local pero siempre corporativo. Mismos hechos que
  el español: si cambia uno, cambiar el otro.
*/
const RUTAS = [
  {
    // Lo diseñó Juan el 27-oct con lo que contó en los vídeos de Montezuma: centro, ASVO, Piedra
    // Colorada y Playa Grande. Rediseño 8-nov (Juan): la reseña ya no repite las paradas de la
    // vuelta; va de corrido con un INICIO (Montezuma centro) y una META (Las Delicias Café, el
    // lugar para comer del cierre). ASVO: "gratis, entra libre". Marea: "llegar una hora antes de
    // la marea baja es lo más idóneo, hasta 2 después". "No hay nada cerca para comprar". Por el
    // sol, "recomendar en las mañanas o en las tardes".
    id: "montezuma-a-pie",
    nombre: "Montezuma a pie: ASVO, Piedra Colorada y Playa Grande",
    icono: "🥾",
    categorias: ["naturaleza", "playa", "cascada"],
    entrada: "Una caminata desde el centro de Montezuma con tortugas, un río con barro y una playa larguísima, sin pagar entrada en ninguna parada.",
    camino: "40 min a pie",
    marea: {
      lugar: "playa-grande",
      tipo: "baja",
      ventana: [-1, 2],
      horas: ["06:00-10:00", "14:00-16:00"],
      texto: "Llegá a Playa Grande con la marea baja: lo ideal es 1 h antes de la más baja, y sirve hasta 2 h después.",
      en: { texto: "Reach Playa Grande around low tide: ideally 1 hour before the lowest point, and up to 2 hours after." }
    },
    paradas: [
      {
        // INICIO de la ruta. Punto soloRuta en data/points.js (montezuma-centro).
        rol: "inicio",
        lugar: "montezuma-centro",
        nombre: "Montezuma centro",
        texto: "La salida. Comprá agua y algo de comer antes de arrancar: en el camino y en Playa Grande no hay nada cerca para comprar.",
        en: { nombre: "Downtown Montezuma", texto: "The starting point. Buy water and something to eat before you set off: there is nowhere to buy anything along the way or at Playa Grande." }
      },
      {
        // ASVO: punto soloRuta en data/points.js (asvo-montezuma).
        lugar: "asvo-montezuma",
        nombre: "ASVO",
        texto: "En el camino, el proyecto de conservación de tortugas. Pasá a ver los nidos (\"es como sembrar tortugas\"): es gratis y se entra libre.",
        en: { texto: "On the way, the sea turtle conservation project. Stop by to see the nests (\"it is like planting turtles\"): it is free and open to walk in." }
      },
      {
        lugar: "piedra-colorada",
        nombre: "Piedra Colorada",
        min: "20 min desde el centro",
        texto: "En el camino, antes de Playa Grande: pozas en el río, el barro de la roca arcillosa para embarrarse y lavarse en el río y, subiendo por la derecha, una catarata pequeña. En verano el agua baja cristalina; con las lluvias, un poco sucia.",
        en: { min: "20 min from downtown", texto: "Along the way, before Playa Grande: natural pools in the river, the clay rock for a mud scrub and a rinse in the river and, heading upstream along the right side, a small waterfall. In the dry season the water runs crystal-clear; in the rainy season, a bit murky." }
      },
      {
        // META de la ruta (Juan, 8-nov): Playa Grande es el final de la caminata.
        rol: "meta",
        lugar: "playa-grande",
        nombre: "Playa Grande",
        min: "15 a 20 min más",
        texto: "El final de la caminata. Por roca, con una subida, una bajada y vistas al mar. Es una playa muy extensa y plana. Cuando la marea sube, lo hace muy rápido y muy alto: dejá tus cosas lejos de la orilla.",
        en: { min: "15 to 20 more min", texto: "The end of the walk. Over the rocks, with one climb, one descent and ocean views. It is a very long, flat beach. When the tide comes in, it rises very fast and very high: keep your things away from the shoreline." }
      },
      {
        // La comida del cierre: punto soloRuta en data/points.js (las-delicias-cafe).
        rol: "comida",
        lugar: "las-delicias-cafe",
        nombre: "Las Delicias Café, Montezuma",
        min: "de vuelta en el pueblo",
        texto: "Para cerrar el día, de vuelta en Montezuma: caé a Las Delicias Café a comer algo rico después de la caminata.",
        en: { nombre: "Las Delicias Café, Montezuma", min: "back in town", texto: "To close out the day, back in Montezuma: stop by Las Delicias Café for something good to eat after the walk." }
      }
    ],
    notas: [
      "Por el sol, caminala en la mañana o en la tarde, no al mediodía.",
      "Mejor ir con compañía: es una caminata larga, también de vuelta.",
      "Llevate toda tu basura de vuelta."
    ],
    en: {
      nombre: "Montezuma on foot: ASVO, Piedra Colorada and Playa Grande",
      entrada: "A walk from downtown Montezuma with sea turtles, a river with natural mud and a very long beach, with no entrance fee at any stop.",
      camino: "40 min on foot",
      notas: [
        "Because of the sun, walk it in the morning or in the afternoon, not at midday.",
        "It is best not to go alone: it is a long walk, on the way back too.",
        "Please take all your trash back with you."
      ]
    }
  },
  {
    // Ruta en ATV o mula (Juan, 8-nov): de Santa Teresa a Cabuya y Montezuma. Es PAGADA: el
    // vehículo se alquila en Xtremecenter (precios del cartel, tarifa de 8 h aunque el tour dure
    // 4-5 h). Varias paradas dependen de la marea. El inicio y la vuelta (Santa Teresa /
    // Xtremecenter) todavía no tienen punto propio: falta la coordenada para el pin.
    id: "atv-cabuya-montezuma",
    nombre: "ATV o Mula: Santa Teresa, Cabuya y Montezuma",
    icono: "🏍️",
    modo: "atv-mula",
    camino: "4 a 5 h",
    categorias: ["naturaleza", "playa", "cascada"],
    entrada: "Una vuelta en ATV (cuadri) o mula por la costa sur: de Santa Teresa a Cabuya y Montezuma, con playas, el cementerio sobre el mar, una catarata y comida. Dura unas 4 a 5 horas.",
    pago: {
      operador: "Xtremecenter",
      // Precios del cartel: tarifa de 8 h y de 24 h. El tour dura 4-5 h (entra en la de 8 h),
      // pero también se puede alquilar por 24 h.
      opciones: [
        { v: "Mula · Side by Side 1000cc (5 pax)", p8: "$180", p24: "$230" },
        { v: "Mula · Side by Side 1000cc (4 pax)", p8: "$200", p24: "$250" },
        { v: "ATV Yamaha 450cc", p8: "$80", p24: "$90" },
        { v: "ATV Honda 420cc", p8: "$70", p24: "$80" },
        { v: "ATV Kymco 300cc", p8: "$60", p24: "$70" }
      ]
    },
    paradas: [
      { rol: "inicio", nombre: "Santa Teresa", texto: "La salida: retirás el ATV o la mula en Xtremecenter, en Santa Teresa.", en: { nombre: "Santa Teresa", texto: "The start: pick up your ATV or mule at Xtremecenter, in Santa Teresa." } },
      { lugar: "playa-suecos" },
      { lugar: "cementerio-cabuya", condicional: "marea" },
      { lugar: "playa-manchas", condicional: "marea" },
      { lugar: "catarata-montezuma" },
      { rol: "comida", lugar: "las-delicias-cafe" },
      { rol: "meta", nombre: "Santa Teresa", texto: "La vuelta: de regreso a Santa Teresa, a devolver el ATV o la mula.", en: { nombre: "Santa Teresa", texto: "The way back: back to Santa Teresa to drop off the ATV or mule." } }
    ],
    notas: [
      "El vehículo se alquila por 8 h aunque la vuelta dure 4 a 5 h.",
      "Varias paradas dependen de la marea: mirá el pronóstico antes de salir.",
      "Llevá protector solar y agua; en el ATV el sol pega fuerte."
    ],
    en: {
      nombre: "ATV or Mule: Santa Teresa, Cabuya and Montezuma",
      entrada: "A ride by ATV (quad) or mule along the south coast: from Santa Teresa to Cabuya and Montezuma, with beaches, the cemetery over the sea, a waterfall and food. It takes about 4 to 5 hours.",
      camino: "4 to 5 h",
      notas: [
        "The vehicle is rented for 8 h even though the ride takes 4 to 5 h.",
        "Several stops depend on the tide: check the forecast before you set off.",
        "Bring sunscreen and water; the sun is strong on the ATV."
      ]
    }
  }
];
