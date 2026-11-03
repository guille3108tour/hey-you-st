// Catálogo del Itinerary laboratory: solo empresas locales con precio cerrado, sin nombres ni contactos.
// Normalmente lo genera scripts/exportar-laboratorio.js desde el sistema de reservas (no editar a mano).
//
// Prototipo (Guille/Juan, 3-nov-2026): mientras el sistema de reservas se pone al día, esta versión se
// extendió A MANO para solidificar el sistema de reservaciones enfocado en grupos. Cambios:
//  - Precios en DOS tramos: "pp" = precio por ADULTO, "pn" = precio por NIÑO (6–12). Si un tour no trae
//    "pn", el niño paga como adulto. El laboratorio mezcla: (adultos·pp + niños·pn) / personas.
//  - "soloAdultos": true en el catamarán (no entra con niños en el grupo).
//  - Catálogo con los tours reales (Isla Tortuga, bioluminiscencia, buceo, pesca), los nuevos (catamarán,
//    masajes) y los guiados del "amigo de logística" (día en Montezuma, Cabuya, Cabo Blanco).
//  - "transporte": el shuttle Santa Teresa–Montezuma (compartido, puerta a puerta, mucho más económico).
// Cuando el sistema de reservas vuelva a exportar, esta forma (pp/pn/soloAdultos/transporte) debe respetarse.
//
// pp[n - 1][k - 1] = lo que paga cada ADULTO, todo incluido, en un grupo de n con k tours en el paquete.
// pn[n - 1][k - 1] = lo mismo por NIÑO (6–12). Las matrices se recortan solas: si hay menos filas/columnas
// que n o k, se usa la última (así basta con [1 persona, 2 personas, 3+] × [1 tour, 2, 3+]).
// Precios de prototipo: los cerrados salen del tarifario real; la pesca va con precio provisional.
const LABORATORIO = {
  "generado": "2026-11-03",
  "proto": true,
  "tours": [
    {
      "t": "ta0ij47", "es": "Clase de surf en Playa Hermosa", "en": "Surf lessons at Playa Hermosa",
      "du": "2 horas", "sa": "Playa Hermosa", "inc": "Tabla e instructor local · principiante e intermedio",
      "dc": 0, "g": ["surf", "playa"],
      "pp": [[100, 98, 96, 94], [75, 73, 71, 69], [75, 73, 71, 69]]
    },
    {
      "t": "isla-tortuga", "es": "Isla Tortuga: bote y snorkel", "en": "Isla Tortuga: boat trip and snorkeling",
      "du": "Día completo", "sa": "Montezuma", "inc": "Comida, bebidas y equipo de snorkel",
      "dc": 1, "g": ["playa", "naturaleza"],
      "pp": [[99, 96, 94], [95, 92, 90], [89, 86, 84]],
      "pn": [[62, 60, 59], [60, 58, 57], [56, 54, 53]]
    },
    {
      "t": "bioluminiscencia", "es": "Bioluminiscencia: tour nocturno en bote", "en": "Bioluminescence: night boat tour",
      "du": "Tarde y noche", "sa": "Montezuma", "inc": "Shuttle, bote y guía local",
      "dc": 0, "g": ["naturaleza"],
      "pp": [[99, 96, 94], [95, 92, 90], [89, 86, 84]],
      "pn": [[62, 60, 59], [60, 58, 57], [56, 54, 53]]
    },
    {
      "t": "buceo", "es": "Buceo: scuba o discovery", "en": "Diving: scuba or discovery",
      "du": "Medio día", "sa": "Montezuma", "inc": "Equipo e instructor · con o sin licencia",
      "dc": 0, "g": ["naturaleza"],
      "pp": [[170, 166, 163], [165, 161, 158], [158, 154, 151]]
    },
    {
      "t": "pesca", "es": "Pesca en bote desde Cabuya", "en": "Boat fishing from Cabuya",
      "du": "4 a 5 horas", "sa": "Cabuya", "inc": "Capitán local y sashimi recién pescado · precio provisional",
      "dc": 0, "g": ["naturaleza", "familia"],
      "pp": [[90, 87, 85], [85, 82, 80], [79, 76, 74]],
      "pn": [[70, 68, 66], [66, 64, 62], [61, 59, 57]]
    },
    {
      "t": "catamaran", "es": "Catamarán al atardecer (solo adultos)", "en": "Sunset catamaran (adults only)",
      "du": "Tarde", "sa": "Montezuma", "inc": "Bebidas y bocas a bordo · mayores de 18",
      "dc": 0, "g": ["atardecer"], "soloAdultos": true,
      "pp": [[89, 86, 84], [84, 81, 79], [78, 75, 73]]
    },
    {
      "t": "masajes", "es": "Masaje de relajación", "en": "Relaxation massage",
      "du": "1 hora", "sa": "Santa Teresa", "inc": "Terapeuta local · a domicilio o en spa",
      "dc": 0, "g": ["bienestar"],
      "pp": [[65, 63, 62], [62, 60, 59], [58, 56, 55]],
      "pn": [[45, 44, 43], [43, 42, 41], [40, 39, 38]]
    },
    {
      "t": "dia-montezuma", "es": "Día guiado en Montezuma", "en": "Guided day in Montezuma",
      "du": "Día completo", "sa": "Montezuma", "inc": "Guía local · catarata, centro y playas",
      "dc": 1, "g": ["playa", "cascada", "naturaleza"],
      "pp": [[55, 53, 51], [52, 50, 48], [48, 46, 44]],
      "pn": [[35, 34, 33], [33, 32, 31], [30, 29, 28]]
    },
    {
      "t": "cabuya-isla", "es": "Cruce a la Isla Cementerio de Cabuya", "en": "Crossing to Cabuya Cemetery Island",
      "du": "Medio día", "sa": "Cabuya", "inc": "Guía local · se cruza en marea baja",
      "dc": 0, "g": ["playa", "naturaleza"],
      "pp": [[45, 43, 42], [42, 40, 39], [38, 36, 35]],
      "pn": [[30, 29, 28], [28, 27, 26], [25, 24, 23]]
    },
    {
      "t": "cabo-blanco", "es": "Cabo Blanco: reserva natural guiada", "en": "Cabo Blanco: guided nature reserve",
      "du": "Día completo", "sa": "Cabo Blanco", "inc": "Guía local · caminata a la playa virgen",
      "dc": 1, "g": ["naturaleza"],
      "pp": [[60, 58, 56], [57, 55, 53], [52, 50, 48]],
      "pn": [[40, 39, 38], [38, 37, 36], [35, 34, 33]]
    }
  ],
  // Transporte: no es una actividad, no ocupa días; entra en el precio del paquete.
  // "traslado" con cap:1 y pq por persona por viaje → el shuttle compartido cobra por persona.
  "transporte": [
    {
      "t": "shuttle-st-mz", "es": "Shuttle Santa Teresa–Montezuma", "en": "Santa Teresa–Montezuma shuttle",
      "tipo": "traslado", "cap": 1, "pq": [12], "sa": "Compartido · puerta a puerta"
    }
  ]
};
