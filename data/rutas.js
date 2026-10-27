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
    // Colorada y Playa Grande. Piedra Colorada se pasa de largo a la ida y la parada larga es a la
    // vuelta ("si venís de allá con calor, caé acá"). ASVO: "gratis, entra libre". Marea: "llegar una
    // hora antes de la marea baja es lo más idóneo, hasta 2 después". "No hay nada cerca para comprar".
    // Por el sol, "recomendar en las mañanas o en las tardes": las horas para llegar a Playa Grande
    // (de 6 a 10 a.m. y de 2 a 4 p.m., para volver con luz) las propuso Claude; falta que Juan las confirme.
    id: "montezuma-a-pie",
    nombre: "Montezuma a pie: ASVO, Piedra Colorada y Playa Grande",
    icono: "🥾",
    categorias: ["naturaleza", "playa", "cascada"],
    entrada: "Una caminata desde el centro de Montezuma con tortugas, un río con barro y una playa larguísima, sin pagar entrada en ninguna parada.",
    camino: "35 a 40 min caminando de ida, y lo mismo de vuelta",
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
        nombre: "Montezuma centro",
        texto: "La salida. Comprá agua y algo de comer antes de arrancar: en el camino y en Playa Grande no hay nada cerca para comprar.",
        en: { nombre: "Downtown Montezuma", texto: "The starting point. Buy water and something to eat before you set off: there is nowhere to buy anything along the way or at Playa Grande." }
      },
      {
        lugar: "asvo-montezuma",
        nombre: "ASVO",
        texto: "En el camino, el proyecto de conservación de tortugas. Pasá a ver los nidos (\"es como sembrar tortugas\"): es gratis y se entra libre.",
        en: { texto: "On the way, the sea turtle conservation project. Stop by to see the nests (\"it is like planting turtles\"): it is free and open to walk in." }
      },
      {
        lugar: "piedra-colorada",
        nombre: "Piedra Colorada",
        min: "20 min desde el centro",
        texto: "A la ida, de pasada: la parada larga es a la vuelta.",
        en: { min: "20 min from downtown", texto: "On the way out, just pass through: the long stop is on the way back." }
      },
      {
        lugar: "playa-grande",
        nombre: "Playa Grande",
        min: "15 a 20 min más",
        texto: "Por roca, con una subida, una bajada y vistas al mar. Es una playa muy extensa y plana. Cuando la marea sube, lo hace muy rápido y muy alto: dejá tus cosas lejos de la orilla.",
        en: { min: "15 to 20 more min", texto: "Over the rocks, with one climb, one descent and ocean views. It is a very long, flat beach. When the tide comes in, it rises very fast and very high: keep your things away from the shoreline." }
      },
      {
        lugar: "piedra-colorada",
        nombre: "Piedra Colorada, a la vuelta",
        min: "15 a 20 min",
        texto: "Si venís con calor, caé acá: pozas en el río, el barro de la roca arcillosa para embarrarse y lavarse en el río y, subiendo por la derecha, una catarata pequeña. En verano el agua baja cristalina; con las lluvias, un poco sucia.",
        en: { nombre: "Piedra Colorada, on the way back", min: "15 to 20 min", texto: "If you are feeling the heat, stop here: natural pools in the river, the clay rock for a mud scrub and a rinse in the river and, heading upstream along the right side, a small waterfall. In the dry season the water runs crystal-clear; in the rainy season, a bit murky." }
      },
      {
        nombre: "Montezuma centro",
        min: "20 min",
        texto: "De vuelta al pueblo.",
        en: { nombre: "Downtown Montezuma", texto: "Back to town." }
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
      camino: "35 to 40 min on foot each way",
      notas: [
        "Because of the sun, walk it in the morning or in the afternoon, not at midday.",
        "It is best not to go alone: it is a long walk, on the way back too.",
        "Please take all your trash back with you."
      ]
    }
  }
];
