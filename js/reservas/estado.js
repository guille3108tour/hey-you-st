/* =========================================================
   Hey You ST · Sistema de reservas · Estado + idioma + textos
   ---------------------------------------------------------
   Dueño del perfil del viajero (lo que responde en la encuesta), de las actividades
   que guarda (favoritos) y del idioma. Todo vive en el teléfono (localStorage): no hay
   servidor. El resto de los módulos lee con getPerfil()/favoritos() y cambia con las
   funciones de acá.
   ========================================================= */

const CLAVE = "hey-reservas-v1";
const CLAVE_IDIOMA = "hey-idioma"; // la misma que usa la guía, para recordar EN/ES entre páginas

// ---------- Idioma ----------
export const IDIOMAS = ["en", "es"];
let idioma = "en";
try {
  const g = localStorage.getItem(CLAVE_IDIOMA);
  if (IDIOMAS.includes(g)) idioma = g;
} catch { /* ventana privada: queda en inglés */ }
export const getIdioma = () => idioma;
export const enIngles = () => idioma === "en";
export function setIdioma(nuevo) {
  if (!IDIOMAS.includes(nuevo)) return;
  idioma = nuevo;
  try { localStorage.setItem(CLAVE_IDIOMA, nuevo); } catch { /* sin almacenamiento */ }
  document.documentElement.lang = nuevo;
}
// Un campo bilingüe {es,en} en el idioma elegido
export const t = (campo) => (campo ? (enIngles() ? (campo.en ?? campo.es) : (campo.es ?? campo.en)) : "");

// ---------- Estado persistente ----------
const vacio = () => ({ perfil: null, guardados: [], itinerario: null });
let estado = vacio();
try {
  const g = JSON.parse(localStorage.getItem(CLAVE));
  if (g && typeof g === "object") estado = { ...vacio(), ...g };
} catch { /* nada guardado todavía */ }

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* sin almacenamiento */ }
}

// ---------- Perfil ----------
// { tipo: "solo"|"pareja"|"familia"|"amigos", personas, transporte: bool,
//   dias, aventura: 0..100 (0 = puro relax, 100 = pura aventura) }
export const getPerfil = () => estado.perfil;
export const tienePerfil = () => !!estado.perfil && !!estado.perfil.tipo;
export function setPerfil(p) { estado.perfil = { ...estado.perfil, ...p }; guardar(); }
export function borrarPerfil() { estado = vacio(); guardar(); }

// ---------- Favoritos ----------
export const favoritos = () => estado.guardados.slice();
export const esFavorito = (id) => estado.guardados.includes(id);
export function alternarFavorito(id) {
  const i = estado.guardados.indexOf(id);
  if (i >= 0) estado.guardados.splice(i, 1);
  else estado.guardados.push(id);
  guardar();
  return esFavorito(id);
}

// ---------- Itinerario ----------
export const getItinerario = () => estado.itinerario;
export function setItinerario(it) { estado.itinerario = it; guardar(); }

// ---------- Categorías (etiquetas, color e ícono) ----------
export const CATEGORIAS = {
  surf:       { es: "Surf",       en: "Surf",       icono: "img/iconos/surf.png",       emoji: "🏄", color: "#0ea5e9" },
  playa:      { es: "Playas",     en: "Beaches",    icono: "img/iconos/playa.png",      emoji: "🏖️", color: "#eab308" },
  familia:    { es: "Con niños",  en: "With kids",  icono: "img/iconos/familia.png",    emoji: "👧", color: "#f59e0b" },
  atardecer:  { es: "Atardecer",  en: "Sunset",     icono: "img/iconos/atardecer.png",  emoji: "🌅", color: "#f97316" },
  cascada:    { es: "Cascadas",   en: "Waterfalls", icono: "img/iconos/cascada.png",    emoji: "💧", color: "#06b6d4" },
  naturaleza: { es: "Naturaleza", en: "Nature",     icono: "img/iconos/naturaleza.png", emoji: "🌿", color: "#22c55e" },
  bienestar:  { es: "Bienestar",  en: "Wellness",   icono: "img/iconos/bienestar.png",  emoji: "🧘", color: "#8b5cf6" },
  tours:      { es: "Tours",      en: "Tours",      icono: "img/iconos/tours.png",      emoji: "🚤", color: "#6366f1" },
};
export const rotuloCat = (id) => (enIngles() ? CATEGORIAS[id]?.en : CATEGORIAS[id]?.es) || id;
export const colorCat = (id) => CATEGORIAS[id]?.color || "#0f8a8f";

// ---------- Textos de la interfaz ----------
// Cada texto es {es, en}. Los que llevan datos son funciones.
const TEXTOS = {
  marca:            { es: "Hey You ST", en: "Hey You ST" },
  marcaSub:         { es: "Reservá tu aventura en Santa Teresa", en: "Book your Santa Teresa adventure" },

  // Encuesta
  bienvenida:       { es: "Bienvenido a Santa Teresa", en: "Welcome to Santa Teresa" },
  bienvenidaSub:    { es: "Respondé 4 preguntas rápidas y armamos una guía de actividades hecha para vos.", en: "Answer 4 quick questions and we'll build an activity guide made just for you." },
  empezar:          { es: "Empezar", en: "Get started" },
  paso:             { es: (a, b) => `Paso ${a} de ${b}`, en: (a, b) => `Step ${a} of ${b}` },
  siguiente:        { es: "Siguiente", en: "Next" },
  atras:            { es: "Atrás", en: "Back" },
  verActividades:   { es: "Ver mis actividades", en: "See my activities" },

  q1:               { es: "¿Con quién viajás?", en: "Who are you traveling with?" },
  q2:               { es: "¿Cuántas personas son?", en: "How many of you are there?" },
  q2sub:            { es: "Incluite a vos.", en: "Count yourself in." },
  q3:               { es: "¿Tenés transporte propio?", en: "Do you have your own transport?" },
  q3sub:            { es: "Carro, cuadraciclo o moto alquilados. Nos ayuda a saber qué lugares te quedan cómodos.", en: "A rented car, quad or scooter. It helps us know which places are easy for you to reach." },
  si:               { es: "Sí", en: "Yes" },
  no:               { es: "No", en: "No" },
  q4:               { es: "¿Cuántos días estás por acá?", en: "How many days are you here?" },
  q4b:              { es: "¿Cómo querés que sea tu viaje?", en: "What kind of trip do you want?" },
  relax:            { es: "Relax", en: "Relax" },
  aventura:         { es: "Aventura", en: "Adventure" },
  equilibrio:       { es: "Equilibrado", en: "Balanced" },
  personas:         { es: (n) => `${n} ${n === 1 ? "persona" : "personas"}`, en: (n) => `${n} ${n === 1 ? "person" : "people"}` },
  dias:             { es: (n) => `${n} ${n === 1 ? "día" : "días"}`, en: (n) => `${n} ${n === 1 ? "day" : "days"}` },

  // Explorar
  paraVos:          { es: "Hecho para vos", en: "Made for you" },
  paraVosSub:       { es: (p) => `${p.emoji} ${p.etiqueta} · ${p.dias} · ${p.ambiente}`, en: (p) => `${p.emoji} ${p.etiqueta} · ${p.dias} · ${p.ambiente}` },
  todas:            { es: "Todas", en: "All" },
  gratis:           { es: "Gratis", en: "Free" },
  pago:             { es: "Tour", en: "Tour" },
  recomendado:      { es: "Recomendado para vos", en: "Recommended for you" },
  sinResultados:    { es: "No hay actividades en esta categoría todavía.", en: "No activities in this category yet." },
  verDetalle:       { es: "Ver detalle", en: "See details" },
  guardar:          { es: "Guardar", en: "Save" },
  guardado:         { es: "Guardado", en: "Saved" },
  necesitaTransporte:{ es: "Necesita transporte", en: "Needs transport" },
  mejorTransporte:  { es: "Mejor con transporte", en: "Better with transport" },
  aPie:             { es: "A pie desde Montezuma", en: "On foot from Montezuma" },

  // Navegación
  navExplorar:      { es: "Explorar", en: "Explore" },
  navGuardados:     { es: "Guardados", en: "Saved" },
  navItinerario:    { es: "Itinerario", en: "Itinerary" },

  // Detalle
  volver:           { es: "Volver", en: "Back" },
  laHistoria:       { es: "La historia", en: "The story" },
  incluye:          { es: "Incluye", en: "Includes" },
  duracion:         { es: "Duración", en: "Duration" },
  salida:           { es: "Salida", en: "Departure" },
  precio:           { es: "Precio", en: "Price" },
  precioWhats:      { es: "Se confirma por WhatsApp", en: "Confirmed on WhatsApp" },
  elRecorrido:      { es: "El recorrido en el mapa", en: "The route on the map" },
  elRecorridoSub:   { es: (p) => `Puntos del tour pensados para ${p}. Tocá cada punto en el mapa.`, en: (p) => `Tour points tailored for ${p}. Tap each point on the map.` },
  dondeEsta:        { es: "Dónde queda", en: "Where it is" },
  tipLocal:         { es: "Consejo de un local", en: "Local tip" },
  meInteresa:       { es: "Me interesa este tour", en: "I'm interested in this tour" },
  reservarWhats:    { es: "Reservar por WhatsApp", en: "Book on WhatsApp" },
  agregarItin:      { es: "Agregar al itinerario", en: "Add to itinerary" },
  notas:            { es: "Buenos saber", en: "Good to know" },
  paradaDe:         { es: (a, b) => `Parada ${a} de ${b}`, en: (a, b) => `Stop ${a} of ${b}` },

  // Guardados
  guardadosTitulo:  { es: "Tus actividades guardadas", en: "Your saved activities" },
  guardadosVacio:   { es: "Todavía no guardaste nada. Tocá el corazón de una actividad para guardarla acá.", en: "You haven't saved anything yet. Tap the heart on an activity to save it here." },
  guardadosArmar:   { es: "Armar mi itinerario", en: "Build my itinerary" },

  // Itinerario
  itinTitulo:       { es: "Armemos tu itinerario", en: "Let's build your itinerary" },
  itinSub:          { es: "Repartimos tus días entre aventura y relax, con un tour por día. Vos elegís el día para revisar disponibilidad.", en: "We'll split your days between adventure and relax, with one tour per day. You pick the day to check availability." },
  itinDias:         { es: "¿Cuántos días?", en: "How many days?" },
  itinBalance:      { es: "Días de aventura vs. relax", en: "Adventure vs. relax days" },
  itinDiasAventura: { es: (n) => `${n} de aventura`, en: (n) => `${n} adventure` },
  itinDiasRelax:    { es: (n) => `${n} de relax`, en: (n) => `${n} relax` },
  itinGenerar:      { es: "Generar itinerario", en: "Generate itinerary" },
  itinRehacer:      { es: "Rehacer con otras opciones", en: "Shuffle again" },
  itinDia:          { es: (n) => `Día ${n}`, en: (n) => `Day ${n}` },
  itinAventura:     { es: "Día de aventura", en: "Adventure day" },
  itinRelax:        { es: "Día de relax", en: "Relax day" },
  itinTourDia:      { es: "Tour del día", en: "Tour of the day" },
  itinPlanDia:      { es: "Plan del día", en: "Plan of the day" },
  itinPlanB:        { es: "Plan gratis del día", en: "Free plan of the day" },
  itinTambien:      { es: "También gratis", en: "Also free" },
  itinElegirDia:    { es: "Elegí un día para ver disponibilidad y reservar.", en: "Pick a day to check availability and book." },
  itinFecha:        { es: "¿Para qué fecha?", en: "For what date?" },
  itinVerDisp:      { es: "Revisar disponibilidad", en: "Check availability" },
  itinDisponible:   { es: "Hay cupo ese día 🎉 Confirmá con un mensaje.", en: "Seats available that day 🎉 Confirm with a message." },
  itinConsultar:    { es: "Consultá el cupo por WhatsApp para esa fecha.", en: "Check availability on WhatsApp for that date." },
  itinReservar:     { es: "Reservar este día", en: "Book this day" },
  itinVacio:        { es: "Elegí tus días arriba y generamos el plan.", en: "Choose your days above and we'll generate the plan." },

  // WhatsApp
  waInteres:        { es: (n) => `Hola Juan 👋 Vi "${n}" en Hey You ST y me interesa. ¿Me contás más?`, en: (n) => `Hi Juan 👋 I saw "${n}" on Hey You ST and I'm interested. Can you tell me more?` },
  waReserva:        { es: (n, f, p) => `Hola Juan 👋 Quiero reservar "${n}"${f ? ` para el ${f}` : ""}. Somos ${p}. ¿Hay cupo?`, en: (n, f, p) => `Hi Juan 👋 I'd like to book "${n}"${f ? ` for ${f}` : ""}. We are ${p}. Any availability?` },
};

export function txt(clave, ...datos) {
  const v = TEXTOS[clave]?.[enIngles() ? "en" : "es"];
  if (v == null) return clave;
  return typeof v === "function" ? v(...datos) : v;
}

// Etiqueta corta del ambiente según el deslizador aventura
export function ambiente(aventura) {
  if (aventura >= 66) return txt("aventura");
  if (aventura <= 33) return txt("relax");
  return txt("equilibrio");
}

const esc0 = (s) => String(s ?? "");
export const esc = (s) => esc0(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
