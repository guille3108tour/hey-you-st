/*
  Propuesta de precios para las clases de surf en Playa Hermosa (surf.html).
  Es la estructura que Juan le muestra al instructor para armar los precios juntos: más
  personas en el grupo, más barato por cabeza, pero el total del grupo siempre sube.

  Estos son los precios PÚBLICOS (lo que paga el cliente, con IVA incluido). Cambialos acá y
  el simulador se actualiza solo. La COMISIÓN de Hey You no va en un número fijo: es un control
  que se mueve en vivo en la página (arranca en "comisionDefault"), porque es dato para conversar,
  no un trato cerrado que deba quedar escrito en el repositorio.
*/
const SURF = {
  lugar: "Playa Hermosa",
  // Datos de la clase base, para la ficha
  clase: {
    duracion: "2 horas",
    nivel: "Principiante e intermedio",
    incluye: ["Tabla", "Lycra", "Instructor local"],
  },

  // Eje 1 — precio por persona según cuánta gente va. El instructor es el mismo, así que
  // cuantos más alumnos comparten la clase, más barato por cabeza. El total del grupo (precio ×
  // personas) tiene que subir siempre, para que al operador le convenga el grupo grande.
  tramos: [
    { personas: 1, etiqueta: "Privada", ratio: "1:1", porPersona: 95 },
    { personas: 2, etiqueta: "Dúo",     ratio: "2:1", porPersona: 75 },
    { personas: 3, etiqueta: "Trío",    ratio: "3:1", porPersona: 65 },
    { personas: 4, etiqueta: "Grupo",   ratio: "4:1", porPersona: 55 },
  ],
  topeRatio: 4,   // máximo de alumnos por instructor (seguridad y calidad en una playa con corriente)
  piso: 55,       // precio por persona del tope en adelante: se suma otro instructor, el precio no baja más

  // Eje 2 — paquetes de varias clases (surfear se aprende en varias). Descuento sobre el precio
  // por persona; se combina con el tamaño del grupo.
  paquetes: [
    { clases: 1, etiqueta: "1 clase",            nota: "Para probar",              descuento: 0 },
    { clases: 3, etiqueta: "3 clases",           nota: "Agarrar la ola",           descuento: 0.10 },
    { clases: 5, etiqueta: "Curso completo (5)", nota: "De cero a surfear solo",   descuento: 0.18 },
  ],

  iva: 0.13,              // IVA incluido en el precio público (Costa Rica)
  comisionDefault: 0.18,  // comisión Hey You de arranque para el simulador (ajustable en la página)
  tope: 6,                // hasta cuántas personas deja elegir el simulador
};
