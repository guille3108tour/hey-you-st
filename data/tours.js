/*
  Tours que muestra la página: cada uno aparece en la pestaña "Tours" (la última) de los
  lugares que lista en "lugares" (el id del lugar en data/points.js). Este archivo SÍ se
  publica: por eso no lleva nombre del proveedor, teléfono, correo ni web. La reserva
  siempre pasa por Juan (regla de negocio, ver CLAUDE.md): el botón abre su WhatsApp.

  Los datos salen de las fichas de los aliados en data/points.js (big-tuna-cabuya,
  nato-surf-hermosa, zuma-tours-montezuma) y de lo que contó Guille en sus "voces".
  "precio" va solo si está cerrado con el aliado; si no, queda en null y la página dice
  que el precio se confirma por WhatsApp.
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
    texto: "Con un instructor que creció ahí mismo y tiene una energía increíble para enseñar. Habla español y también inglés nativo, así que si querés practicar tu español mientras aprendés a surfear, es la persona ideal.",
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
  },
  {
    id: "pesca-cabuya",
    titulo: "Pesca en bote desde Cabuya",
    lugares: ["cementerio-cabuya"],
    salida: "Cabuya",
    duracion: "4–5 horas o 8 horas",
    incluye: ["Capitán local", "Sashimi recién pescado"],
    precio: null,
    texto: "Con un capitán nacido y criado en Cabuya, pescando desde chiquito. El de 8 horas es para retarte con un atún grande (hasta unos 20 kg, a veces 20 minutos de pelea); el de 4 a 5 horas es más familiar, con peces más chicos y vistas increíbles. No hay mejor sashimi que el que se hace ahí mismo en el bote, con menos de 20 minutos de haberse pescado.",
  },
];
