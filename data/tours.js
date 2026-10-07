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
    id: "isla-tortuga",
    titulo: "Isla Tortuga: bote y snorkel",
    lugares: ["catarata-montezuma"],
    salida: "Montezuma (o con transporte desde Santa Teresa y Mal País)",
    duracion: "Día completo, de 9 a.m. a 4:30–5 p.m.",
    incluye: ["Comida y bebidas", "Equipo de snorkel", "Transporte opcional"],
    precio: null,
    texto: "El trayecto en bote dura entre 45 minutos y una hora, y según la temporada se pueden ver ballenas, delfines y muchísimos peces en el camino. Hacen paradas para snorkelear antes de llegar a la isla, una playa increíble de agua cristalina donde se pueden ver corales. Lo pueden pedir sin transporte —el lugar es seguro para dejar el carro— o ir relajados en buseta si después van a estar cansados.",
    en: {
      titulo: "Isla Tortuga: boat trip and snorkeling",
      salida: "Montezuma (or with transportation from Santa Teresa and Mal País)",
      duracion: "Full day, from 9 a.m. to 4:30–5 p.m.",
      incluye: ["Meals and drinks", "Snorkeling gear", "Optional transportation"],
      texto: "The boat ride takes between 45 minutes and an hour and, depending on the season, you may see whales, dolphins and plenty of fish along the way. There are snorkeling stops before reaching the island, an incredible beach with crystal-clear water where you can see coral. You can book it without transportation (the area is safe to leave your car) or travel relaxed by shuttle if you expect to be tired afterward.",
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
