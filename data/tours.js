/*
  Tours que muestra la página: cada uno aparece en "Meet a local", al final de la ficha de los
  lugares que lista en "lugares" (el id del lugar en data/points.js). Este archivo SÍ se
  publica: no lleva correos, webs ni nada que el local no haya aceptado mostrar.

  Cambio de Juan (3-oct): "local" (nombre de pila) y "whatsapp" (con código de país, sin +
  ni espacios, ej. "50688887777") hacen que el botón le escriba directo a ese local. Llenarlos
  solo cuando Juan ya habló con esa persona: que aceptó la comisión de palabra y que su número
  salga en la página. Vacíos, el botón le escribe a Juan.

  Los datos salen de las fichas de los aliados en data/points.js (big-tuna-cabuya,
  nato-surf-hermosa, zuma-tours-montezuma) y de lo que contó Guille en sus "voces".
  "precio" va solo si está cerrado con el aliado; si no, queda en null y la página dice
  que el precio se confirma por WhatsApp.

  "en" (6-oct): el mismo tour en inglés, el idioma con que abre la página. Tono de guía local,
  pero siempre corporativo. Mismos hechos que el español: si cambia uno, cambiar el otro.
  Lo que falte en "en" sale en español.
*/
const TOURS = [
  {
    id: "surf-hermosa",
    titulo: "Clases de surf en Playa Hermosa",
    lugares: ["playa-hermosa"],
    salida: "Playa Hermosa",
    duracion: "2 horas",
    incluye: ["Tabla", "Instructor local", "Principiante e intermedio"],
    precio: "$100 clase individual · $75 por persona en grupo",
    local: "",
    whatsapp: "",
    texto: "Con un instructor que creció ahí mismo y tiene una energía increíble para enseñar. Habla español y también inglés nativo, así que si querés practicar tu español mientras aprendés a surfear, es la persona ideal.",
    en: {
      titulo: "Surf lessons at Playa Hermosa",
      duracion: "2 hours",
      incluye: ["Board", "Local instructor", "Beginner and intermediate"],
      precio: "$100 private lesson · $75 per person in a group",
      texto: "With an instructor who grew up right here and brings incredible energy to teaching. Fluent in Spanish and a native English speaker, so if you would like to practice your Spanish while learning to surf, this is the ideal person.",
    },
  },
  {
    // Precios: tarifario de agencias Zuma Tours 2027 (vigente del 1-nov-2026 al 31-oct-2027).
    // En la ficha va el precio PÚBLICO (TOTAL IVAI, con impuesto). La comisión de agencia es
    // dato interno de Hey You (no va acá; se usa en el dashboard de márgenes).
    id: "isla-tortuga",
    titulo: "Isla Tortuga: bote y snorkel (compartido)",
    lugares: ["catarata-montezuma"],
    salida: "Oficina en Montezuma (9:00) o pickup en hoteles de Santa Teresa y Mal País (7:45)",
    duracion: "Día completo, de 9 a.m. a 4:30–5 p.m.",
    incluye: ["Comida y bebidas", "Equipo de snorkel", "Transporte opcional"],
    precio: "Por persona, con impuestos. Desde Montezuma (9:00): $99 adulto, $62 niño (6–12). Con pickup en Santa Teresa y Mal País (7:45): $122 adulto, $73 niño. Menores de 6, gratis.",
    local: "",
    whatsapp: "",
    texto: "El trayecto en bote dura entre 45 minutos y una hora, y según la temporada se pueden ver ballenas, delfines y muchísimos peces en el camino. Hacen paradas para snorkelear antes de llegar a la isla, una playa increíble de agua cristalina donde se pueden ver corales. Lo pueden pedir sin transporte —el lugar es seguro para dejar el carro— o ir relajados en buseta si después van a estar cansados.",
    en: {
      titulo: "Isla Tortuga: boat trip and snorkeling (shared)",
      salida: "Office in Montezuma (9:00) or hotel pickup in Santa Teresa and Mal País (7:45)",
      duracion: "Full day, from 9 a.m. to 4:30–5 p.m.",
      incluye: ["Meals and drinks", "Snorkeling gear", "Optional transportation"],
      precio: "Per person, taxes included. From Montezuma (9:00): $99 adult, $62 child (6–12). With pickup in Santa Teresa and Mal País (7:45): $122 adult, $73 child. Under 6 free.",
      texto: "The boat ride takes between 45 minutes and an hour and, depending on the season, you may see whales, dolphins and plenty of fish along the way. There are snorkeling stops before reaching the island, an incredible beach with crystal-clear water where you can see coral. You can book it without transportation (the area is safe to leave your car) or travel relaxed by shuttle if you expect to be tired afterward.",
    },
  },
  {
    id: "isla-tortuga-privado",
    titulo: "Isla Tortuga: tour privado (bote exclusivo)",
    lugares: ["catarata-montezuma"],
    salida: "Playa Montezuma o bahía de Tambor",
    duracion: "Día completo, de 9 a.m. a 4 p.m.",
    incluye: ["Bote exclusivo para tu grupo", "Equipo de snorkel"],
    precio: "Precio por bote (no por persona), con impuestos. Bote 'Just for Fun' (32 pies): $1,526 hasta 5, $1,639 hasta 10. Bote 'La Dolce Vita / Campari Spritz' (42 pies, de primera): $1,955 (5), $2,192 (10), $2,486 (15), $2,746 (20), $2,995 (25). Traslado ida y vuelta desde Santa Teresa incluido hasta 5 personas.",
    local: "",
    whatsapp: "",
    texto: "El mismo paseo a Isla Tortuga, pero con el bote solo para tu grupo: salen a la hora que prefieran, paran donde quieran para snorkelear y el día va a su ritmo. Hay dos botes, el de 32 pies y el 'La Dolce Vita', de primera, para grupos más grandes. Si quieren, le suman la bioluminiscencia y el día termina de noche, cerca de las 8.",
    en: {
      titulo: "Isla Tortuga: private tour (exclusive boat)",
      salida: "Montezuma beach or Tambor Bay",
      duracion: "Full day, from 9 a.m. to 4 p.m.",
      incluye: ["Exclusive boat for your group", "Snorkeling gear"],
      precio: "Per boat (not per person), taxes included. 'Just for Fun' boat (32 ft): $1,526 up to 5, $1,639 up to 10. 'La Dolce Vita / Campari Spritz' boat (42 ft, premium): $1,955 (5), $2,192 (10), $2,486 (15), $2,746 (20), $2,995 (25). Round-trip shuttle from Santa Teresa included for up to 5 people.",
      texto: "The same trip to Isla Tortuga, but with the boat just for your group: leave when you prefer, stop wherever you like to snorkel, and set your own pace for the day. There are two boats, the 32-footer and the premium 'La Dolce Vita', for larger groups. If you like, add the bioluminescence tour and the day ends at night, around 8 p.m.",
    },
  },
  {
    id: "bioluminiscencia",
    titulo: "Bioluminiscencia: tour nocturno en bote",
    lugares: ["catarata-montezuma"],
    salida: "Shuttle desde Montezuma (13:20) o desde Santa Teresa y Mal País (12:45–13:00)",
    duracion: "De la tarde a la noche, hasta las 8 p.m.",
    incluye: ["Shuttle", "Bote", "Guía local"],
    precio: "Por persona, con impuestos. Desde Montezuma: $99 adulto, $62 niño (6–12). Con pickup en Santa Teresa y Mal País: $122 adulto, $73 niño. Menores de 6, gratis.",
    local: "",
    whatsapp: "",
    texto: "De noche, el mar se enciende: al mover el agua, el plancton brilla con una luz azul. Es un tour compartido que sale en bote al atardecer y vuelve ya de noche. Depende de la luna —se hace unos 20 días al mes, cuando el cielo está más oscuro—, así que conviene confirmar la fecha antes.",
    en: {
      titulo: "Bioluminescence: night boat tour",
      salida: "Shuttle from Montezuma (13:20) or from Santa Teresa and Mal País (12:45–13:00)",
      duracion: "From afternoon into the night, until 8 p.m.",
      incluye: ["Shuttle", "Boat", "Local guide"],
      precio: "Per person, taxes included. From Montezuma: $99 adult, $62 child (6–12). With pickup in Santa Teresa and Mal País: $122 adult, $73 child. Under 6 free.",
      texto: "At night, the sea lights up: as you move the water, the plankton glows with a blue light. It is a shared tour that heads out by boat at sunset and comes back after dark. It depends on the moon — it runs about 20 days a month, when the sky is darkest — so it is best to confirm the date beforehand.",
    },
  },
  {
    id: "buceo-zuma",
    titulo: "Buceo: scuba y discovery",
    lugares: ["catarata-montezuma"],
    salida: "Montezuma (9:00) o con transporte desde Santa Teresa (7:45)",
    duracion: "Mañana",
    incluye: ["Equipo de buceo", "Guía / instructor"],
    precio: "Con impuestos. Con licencia (1 inmersión): $170. Discovery, sin licencia (introducción + 1 inmersión): $204. Con transporte desde Santa Teresa: $193 con licencia / $215 discovery.",
    local: "",
    whatsapp: "",
    texto: "Para quien ya tiene licencia, una inmersión en los puntos de buceo de la zona. Y para quien nunca buceó, el 'discovery': una introducción con instructor y una inmersión, sin necesidad de certificación. Se puede salir desde Montezuma o que te pasen buscando por Santa Teresa.",
    en: {
      titulo: "Diving: scuba and discovery",
      salida: "Montezuma (9:00) or with transportation from Santa Teresa (7:45)",
      duracion: "Morning",
      incluye: ["Diving gear", "Guide / instructor"],
      precio: "Taxes included. With license (1 dive): $170. Discovery, no license (intro + 1 dive): $204. With transportation from Santa Teresa: $193 with license / $215 discovery.",
      texto: "For those who already have a license, one dive at the area's dive sites. And for those who have never dived, the 'discovery': an introduction with an instructor and one dive, no certification needed. You can depart from Montezuma or get picked up in Santa Teresa.",
    },
  },
  {
    id: "pesca-cabuya",
    titulo: "Pesca en bote desde Cabuya",
    lugares: ["cementerio-cabuya"],
    salida: "Cabuya",
    duracion: "4–5 horas o 8 horas",
    incluye: ["Capitán local", "Sashimi recién pescado"],
    precio: null,
    local: "",
    whatsapp: "",
    texto: "Con un capitán nacido y criado en Cabuya, pescando desde chiquito. El de 8 horas es para retarte con un atún grande (hasta unos 20 kg, a veces 20 minutos de pelea); el de 4 a 5 horas es más familiar, con peces más chicos y vistas increíbles. No hay mejor sashimi que el que se hace ahí mismo en el bote, con menos de 20 minutos de haberse pescado.",
    en: {
      titulo: "Boat fishing from Cabuya",
      duracion: "4–5 hours or 8 hours",
      incluye: ["Local captain", "Fresh-caught sashimi"],
      texto: "With a captain born and raised in Cabuya, who has been fishing since childhood. The 8-hour trip is for taking on the challenge of a big tuna (up to about 20 kg, sometimes a 20-minute fight); the 4-to-5-hour trip is more family-friendly, with smaller fish and incredible views. There is no better sashimi than the one prepared right there on the boat, less than 20 minutes after the catch.",
    },
  },
];
