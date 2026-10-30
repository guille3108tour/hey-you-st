/* =========================================================
   Hey You ST · Datos y configuración del mapa
   Categorías, lugares (desde POINTS), límites, paleta y estilos. Capa de datos:
   no toca el DOM del mapa, solo lo describe. La importan casi todos los módulos.
   ========================================================= */
import { enIngles } from "./i18n.js";

// Categorías disponibles. El ícono 3D y el color se usan en chips y marcadores.
// Los íconos se generan siempre con el mismo prompt de estilo: ver
// img/iconos/PROMPT-DE-ESTILO.md antes de agregar una categoría nueva.
// El emoji queda de respaldo por si la imagen no carga.
// "en" es el nombre en inglés; "enSeccion", cómo se titula esa sección de la ficha en inglés
// ("Surfing at Playa Hermosa"), cuando no es el mismo nombre.
export const CATEGORIAS = {
  surf:       { label: "Surf",        en: "Surf",       enSeccion: "Surfing",    icono: "img/iconos/surf.png",       emoji: "🏄", color: "#0ea5e9" },
  familia:    { label: "Con niños",   en: "With kids",                           icono: "img/iconos/familia.png",    emoji: "👧", color: "#f59e0b" },
  playa:      { label: "Playas",      en: "Beaches",    enSeccion: "Beach time", icono: "img/iconos/playa.png",      emoji: "🏖️", color: "#eab308" },
  atardecer:  { label: "Atardecer",   en: "Sunset",                              icono: "img/iconos/atardecer.png",  emoji: "🌅", color: "#f97316" },
  cascada:    { label: "Cascadas",    en: "Waterfalls", enSeccion: "Waterfall",  icono: "img/iconos/cascada.png",    emoji: "💧", color: "#06b6d4" },
  naturaleza: { label: "Naturaleza",  en: "Nature",                              icono: "img/iconos/naturaleza.png", emoji: "🌿", color: "#22c55e" },
  comida:     { label: "Comida",      en: "Food",                                icono: "img/iconos/comida.png",     emoji: "🍽️", color: "#ef4444" },
  bienestar:  { label: "Bienestar",   en: "Wellness",                            icono: "img/iconos/bienestar.png",  emoji: "🧘", color: "#8b5cf6" },
  tours:      { label: "Tours",       en: "Tours",                               icono: "img/iconos/tours.png",      emoji: "🚤", color: "#6366f1" },
  transporte: { label: "Transporte",  en: "Transport",                           icono: "img/iconos/transporte.png", emoji: "🚙", color: "#64748b" },
  hospedaje:  { label: "Hospedaje",   en: "Lodging",                             icono: "img/iconos/hospedaje.png",  emoji: "🏨", color: "#ec4899" },
};

// El nombre de una categoría (o de "Todas", o de "Meet a local") en el idioma elegido
export const rotulo = (cat) => (enIngles() && cat.en) || cat.label;

// Por ahora la guía arranca con lo local (decisión de Juan, 2026-09-28): estas
// categorías quedan en pausa. Sus lugares siguen guardados en data/points.js;
// para reactivar una categoría, sacala de esta lista.
const CATEGORIAS_EN_PAUSA = ["hospedaje", "comida", "bienestar", "transporte", "tours"];
// Hoteles, restaurantes y operadores de tours se ocultan del todo, aunque tengan otra
// categoría (ej: un hotel con vista al atardecer, o las clases de surf en Surf).
// Bienestar y transporte solo dejan de ser filtro: Villa Flor sigue como playa.
const NEGOCIOS_EN_PAUSA = ["hospedaje", "comida", "tours"];
for (const clave of CATEGORIAS_EN_PAUSA) delete CATEGORIAS[clave];

// Los lugares que muestra el mapa, cada uno solo con sus categorías activas
export const LUGARES = POINTS.features
  .filter(f => !f.properties.categorias.some(c => NEGOCIOS_EN_PAUSA.includes(c)))
  .map(f => ({ ...f, properties: { ...f.properties, categorias: f.properties.categorias.filter(c => CATEGORIAS[c]) } }))
  .filter(f => f.properties.categorias.length);

// Los tours se coordinan directamente con Juan, no con quien da el tour: el panel
// no muestra teléfonos, correos ni webs de proveedores y ofrece escribirle a él.
// Su número (CONTACTO_JUAN) vive en js/contacto.js, que comparte con la página de propuestas.

// La fila "Todas" del panel no es una categoría, pero usa el mismo set de íconos.
export const CAT_TODAS = { label: "Todas", en: "All", icono: "img/iconos/todas.png", emoji: "🗺️", color: "#0ea5e9" };

// Devuelve el <img> del ícono 3D de una categoría. Si la imagen no carga
// (ruta mala, sin conexión), cae al emoji para que la fila nunca quede vacía.
export function crearIcono(cat) {
  const img = document.createElement("img");
  img.className = "ico";
  img.src = cat.icono;
  img.alt = "";
  img.addEventListener("error", () => {
    const span = document.createElement("span");
    span.className = "ico-emoji";
    span.textContent = cat.emoji;
    img.replaceWith(span);
  }, { once: true });
  return img;
}

// Perfiles de viajero, usados para etiquetar las "voces" (historias locales) de cada punto.
const PERFILES = {
  nomada:     { label: "Nómada",     emoji: "🎒" },
  familia:    { label: "Familia",    emoji: "👨‍👩‍👧" },
  solo:       { label: "Solo",       emoji: "🚶" },
  explorador: { label: "Explorador", emoji: "🧭" },
};

// Recuadro que encierra la Península de Nicoya [[oeste, sur], [este, norte]]
const LIMITES_PENINSULA = [[-85.95, 9.50], [-84.70, 10.45]];

// El mapa abre enmarcando los lugares de la guía, no toda la península (Juan, 29-sep:
// "el mapa está muy lejos"). Se calcula con los lugares que se muestran, así se acomoda
// solo cuando se suman lugares nuevos.
export const LIMITES_LUGARES = LUGARES.length
  ? LUGARES.reduce(([[o, s], [e, n]], f) => {
      const [lng, lat] = f.geometry.coordinates;
      return [[Math.min(o, lng), Math.min(s, lat)], [Math.max(e, lng), Math.max(n, lat)]];
    }, [[180, 90], [-180, -90]])
  : LIMITES_PENINSULA;

// Celular: la ficha es una hoja que sube desde abajo y las categorías son una fila de íconos
export const anchoMovil = window.matchMedia("(max-width: 640px)");

// Para respetar "prefers-reduced-motion": apaga el giro de la vista 3D, el autogiro del 360, etc.
export const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// Márgenes del encuadre para que ningún lugar quede debajo de la barra de arriba, de la
// fila de íconos (celular) o de la barra de categorías (escritorio)
export function margenEncuadre() {
  return anchoMovil.matches
    ? { top: 90, bottom: 100, left: 30, right: 30 }
    : { top: 90, bottom: 50, left: 270, right: 50 };
}

// Fuentes gratuitas (sin API key). La imagen satelital ya no es una capa del mapa (Juan,
// 6-oct): solo se usa en la portada 3D de la ficha de cada lugar.
const OFM = "https://tiles.openfreemap.org/styles/";
export const TILES_SATELITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const TILES_TERRENO  = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

// Paleta propia: se aplica encima del estilo "bright" de OpenFreeMap.
// Cambiá cualquier color aquí y se refleja en el mapa.
export const PALETA_PURAVIDA = {
  fondo: "#f6f0e1", mar: "#79c4d8", selva: "#8fbf7f", pasto: "#d3e4bd", arena: "#f3e3ae",
  urbano: "#efe7d3", edificios: "#e6dcc6",
  viaBorde: "#d9c8a4", viaMenor: "#ffffff", viaMayor: "#f8e4b2", autopista: "#f1c98c", sendero: "#bdae90",
  limites: "#bfae8c", texto: "#33423a", textoAgua: "#1f6f83",
};

// Estilos del mapa. "url" es el estilo base de OpenFreeMap y "paleta" (opcional) lo recolorea.
// Juan (6-oct): Papel y Minimal se quitaron (quedan en el historial de git), y "de momento" el
// mapa va siempre en Noche, sin botón para elegir. Pura Vida queda guardado acá: para volver a
// usarlo, basta con cambiar ESTILO.
export const ESTILOS = {
  puravida: { url: OFM + "bright", paleta: PALETA_PURAVIDA },
  noche:    { url: OFM + "dark" },
};
export const ESTILO = "noche";
