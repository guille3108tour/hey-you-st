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
        // INICIO de la ruta (Juan, 8-nov), con las coordenadas del centro de Montezuma: sale como
        // pin de inicio en el mapa.
        rol: "inicio",
        nombre: "Montezuma centro",
        coords: [-85.066523, 9.655513],
        texto: "La salida. Comprá agua y algo de comer antes de arrancar: en el camino y en Playa Grande no hay nada cerca para comprar.",
        en: { nombre: "Downtown Montezuma", texto: "The starting point. Buy water and something to eat before you set off: there is nowhere to buy anything along the way or at Playa Grande." }
      },
      {
        // ASVO no es un punto de data/points.js; con sus coordenadas (Juan, 8-nov) sale como
        // parada 2 en el mapa.
        lugar: "asvo-montezuma",
        coords: [-85.062634, 9.658697],
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
        // La comida del cierre (Juan, 8-nov): de vuelta en el pueblo. Restaurantes es una categoría
        // en pausa en el mapa, así que no tiene ficha propia: lleva sus coordenadas y sale como pin.
        rol: "comida",
        nombre: "Las Delicias Café, Montezuma",
        coords: [-85.068005, 9.654672],
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
  }
];
