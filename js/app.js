/* =========================================================
   Hey You ST · Península de Nicoya — lógica del mapa
   ========================================================= */

// Categorías disponibles. El ícono 3D y el color se usan en chips y marcadores.
// Los íconos se generan siempre con el mismo prompt de estilo: ver
// img/iconos/PROMPT-DE-ESTILO.md antes de agregar una categoría nueva.
// El emoji queda de respaldo por si la imagen no carga.
const CATEGORIAS = {
  surf:       { label: "Surf",        icono: "img/iconos/surf.png",       emoji: "🏄", color: "#0ea5e9" },
  familia:    { label: "Con niños",   icono: "img/iconos/familia.png",    emoji: "👧", color: "#f59e0b" },
  playa:      { label: "Playas",      icono: "img/iconos/playa.png",      emoji: "🏖️", color: "#eab308" },
  atardecer:  { label: "Atardecer",   icono: "img/iconos/atardecer.png",  emoji: "🌅", color: "#f97316" },
  cascada:    { label: "Cascadas",    icono: "img/iconos/cascada.png",    emoji: "💧", color: "#06b6d4" },
  naturaleza: { label: "Naturaleza",  icono: "img/iconos/naturaleza.png", emoji: "🌿", color: "#22c55e" },
  comida:     { label: "Comida",      icono: "img/iconos/comida.png",     emoji: "🍽️", color: "#ef4444" },
  bienestar:  { label: "Bienestar",   icono: "img/iconos/bienestar.png",  emoji: "🧘", color: "#8b5cf6" },
  tours:      { label: "Tours",       icono: "img/iconos/tours.png",      emoji: "🚤", color: "#6366f1" },
  transporte: { label: "Transporte",  icono: "img/iconos/transporte.png", emoji: "🚙", color: "#64748b" },
  hospedaje:  { label: "Hospedaje",   icono: "img/iconos/hospedaje.png",  emoji: "🏨", color: "#ec4899" },
};

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
const LUGARES = POINTS.features
  .filter(f => !f.properties.categorias.some(c => NEGOCIOS_EN_PAUSA.includes(c)))
  .map(f => ({ ...f, properties: { ...f.properties, categorias: f.properties.categorias.filter(c => CATEGORIAS[c]) } }))
  .filter(f => f.properties.categorias.length);

// Los tours se coordinan directamente con Juan, no con quien da el tour: el panel
// no muestra teléfonos, correos ni webs de proveedores y ofrece escribirle a él.
// Número de WhatsApp con código de país, sin + ni espacios (ej: "50688887777").
const CONTACTO_JUAN = { whatsapp: "50689889988" };

// La fila "Todas" del panel no es una categoría, pero usa el mismo set de íconos.
const CAT_TODAS = { label: "Todas", icono: "img/iconos/todas.png", emoji: "🗺️", color: "#0ea5e9" };

// Devuelve el <img> del ícono 3D de una categoría. Si la imagen no carga
// (ruta mala, sin conexión), cae al emoji para que la fila nunca quede vacía.
function crearIcono(cat) {
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
const LIMITES_LUGARES = LUGARES.length
  ? LUGARES.reduce(([[o, s], [e, n]], f) => {
      const [lng, lat] = f.geometry.coordinates;
      return [[Math.min(o, lng), Math.min(s, lat)], [Math.max(e, lng), Math.max(n, lat)]];
    }, [[180, 90], [-180, -90]])
  : LIMITES_PENINSULA;

// Celular: la ficha es una hoja que sube desde abajo y las categorías son una fila de íconos
const anchoMovil = window.matchMedia("(max-width: 640px)");

// Márgenes del encuadre para que ningún lugar quede debajo de la barra de arriba, de la
// fila de íconos (celular) o de la barra de categorías (escritorio)
function margenEncuadre() {
  return anchoMovil.matches
    ? { top: 90, bottom: 100, left: 30, right: 30 }
    : { top: 90, bottom: 50, left: 270, right: 50 };
}

// Fuentes gratuitas (sin API key)
const OFM = "https://tiles.openfreemap.org/styles/";
const TILES_SATELITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TILES_TERRENO  = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

// Paletas propias: se aplican encima del estilo "bright" de OpenFreeMap.
// Cambiá cualquier color aquí y se refleja en el mapa.
const PALETA_PURAVIDA = {
  fondo: "#f6f0e1", mar: "#79c4d8", selva: "#8fbf7f", pasto: "#d3e4bd", arena: "#f3e3ae",
  urbano: "#efe7d3", edificios: "#e6dcc6",
  viaBorde: "#d9c8a4", viaMenor: "#ffffff", viaMayor: "#f8e4b2", autopista: "#f1c98c", sendero: "#bdae90",
  limites: "#bfae8c", texto: "#33423a", textoAgua: "#1f6f83",
};

const PALETA_PAPEL = {
  fondo: "#efe6cf", mar: "#a7c8c6", selva: "#a9b98a", pasto: "#d8d9b4", arena: "#e8dcb4",
  urbano: "#e9dfc4", edificios: "#dccfb0",
  viaBorde: "#b59a72", viaMenor: "#f7efdc", viaMayor: "#e8cf9d", autopista: "#d9b077", sendero: "#a89673",
  limites: "#a08d6a", texto: "#4a3f2f", textoAgua: "#3f6b6d",
};

// Estilos disponibles en el selector. "url" es el estilo base de OpenFreeMap
// y "paleta" (opcional) lo recolorea.
const ESTILOS = {
  puravida: { nombre: "🌴 Pura Vida", url: OFM + "bright", paleta: PALETA_PURAVIDA },
  papel:    { nombre: "🗺️ Papel",     url: OFM + "bright", paleta: PALETA_PAPEL },
  minimal:  { nombre: "⚪ Minimal",   url: OFM + "positron" },
  noche:    { nombre: "🌙 Noche",     url: OFM + "dark" },
};
const ESTILO_INICIAL = "puravida";

// ---------- Mapa ----------
const map = new maplibregl.Map({
  container: "map",
  style: ESTILOS[ESTILO_INICIAL].url,
  bounds: LIMITES_LUGARES,
  fitBoundsOptions: { padding: margenEncuadre(), maxZoom: 13 },
  attributionControl: { compact: true },
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "top-right");
map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

// El encuadre inicial se calcula al crear el mapa, cuando el contenedor todavía
// puede no tener su tamaño final (el layout no terminó de acomodarse, o la ventana
// recién se está abriendo). Si no se rehace, el mapa abre mostrando media Costa Rica
// en vez de los lugares. Lo rehacemos en cada cambio de tamaño, pero solo mientras
// el visitante no haya movido el mapa él mismo: a partir de ahí, la vista es suya.
let encuadreLibre = true;

function encuadrarLugares() {
  map.fitBounds(LIMITES_LUGARES, { padding: margenEncuadre(), maxZoom: 13, duration: 0 });
}

// MapLibre no detecta solo los cambios de tamaño de su contenedor (ej: la ventana
// cambia de tamaño, el celular rota, o el layout termina de acomodarse después de
// cargar) — sin esto el mapa se queda pegado en el tamaño que tenía al crearse.
new ResizeObserver(() => {
  map.resize();
  if (encuadreLibre) encuadrarLugares();
}).observe(document.getElementById("map"));

// originalEvent solo existe cuando el movimiento lo hizo una persona (arrastrar,
// rueda, pellizcar); los movimientos nuestros (flyTo al abrir un punto) no lo traen.
map.on("movestart", (e) => { if (e.originalEvent) encuadreLibre = false; });

// ---------- Filtros (barra lateral de categorías) ----------
// Un Set vacío significa "todas": es el estado inicial y al que vuelve el botón
// "Todas". Se pueden tener varias categorías prendidas al mismo tiempo.
const listaCapasEl = document.getElementById("capas-lista");
const conteoEl = document.getElementById("capas-conteo");
const categoriasActivas = new Set();

function crearFilaCapa(clave, cat, extraClase = "") {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "capa" + (extraClase ? " " + extraClase : "");
  b.dataset.cat = clave;
  b.setAttribute("aria-pressed", "false");
  b.setAttribute("aria-label", cat.label); // en celular se ve solo el ícono
  if (cat.color) b.style.setProperty("--cat", cat.color);
  b.innerHTML =
    '<span class="capa-icono"></span><span class="capa-label"></span><span class="capa-switch"></span>';
  b.querySelector(".capa-icono").appendChild(crearIcono(cat));
  b.querySelector(".capa-label").textContent = cat.label;
  b.addEventListener("click", () => alternarCategoria(clave));
  return b;
}

// Regla de Juan: una categoría a la vez. Prender una apaga la que estaba;
// tocar la que ya está prendida la apaga y el mapa vuelve a "Todas".
function alternarCategoria(clave) {
  const yaEstaba = categoriasActivas.has(clave);
  categoriasActivas.clear();
  if (clave !== "todos" && !yaEstaba) categoriasActivas.add(clave);
  renderMarcadores();
  // Otra regla de Juan (29-sep): si hay un lugar abierto que tiene esa categoría, el
  // panel se queda quieto (nombre, portada, vista 3D) y solo cambia el texto a esa
  // pestaña. Si el lugar no la tiene, desaparece del mapa y el panel se cierra.
  const filtro = [...categoriasActivas][0];
  if (lugarAbierto && (!filtro || lugarAbierto.categorias.includes(filtro))) {
    lugarAbierto.pintarVista(filtro || null);
  } else {
    cerrarPanel();
  }
}

listaCapasEl.appendChild(crearFilaCapa("todos", CAT_TODAS, "capa-todas"));
for (const [clave, cat] of Object.entries(CATEGORIAS)) {
  listaCapasEl.appendChild(crearFilaCapa(clave, cat));
}

// Refleja el estado de los interruptores y el conteo de lugares visibles.
function sincronizarCapas(visibles) {
  const todas = categoriasActivas.size === 0;
  for (const b of listaCapasEl.querySelectorAll(".capa")) {
    const clave = b.dataset.cat;
    const prendida = clave === "todos" ? todas : categoriasActivas.has(clave);
    b.setAttribute("aria-pressed", String(prendida));
  }
  conteoEl.textContent = visibles === 1 ? "1 lugar en el mapa" : `${visibles} lugares en el mapa`;
  // En la fila de íconos del celular: sin filtro van todos a color; con uno elegido,
  // ese resalta y el resto se apaga
  capasEl.classList.toggle("filtrando", !todas);
}

// Colapsar/expandir la lista (escritorio). En celular la barra es una fila de íconos
// sin nombres que no tapa el mapa (css → "Móvil"), así que no se colapsa.
const capasEl = document.getElementById("capas");
const capasToggle = document.getElementById("capas-toggle");
function colapsarCapas(colapsada) {
  capasEl.classList.toggle("colapsada", colapsada);
  capasToggle.setAttribute("aria-expanded", String(!colapsada));
}
capasToggle.addEventListener("click", () => {
  colapsarCapas(!capasEl.classList.contains("colapsada"));
});

// ---------- Marcadores ----------
const marcadores = []; // { feature, marker, el }

for (const feature of LUGARES) {
  const el = document.createElement("div");
  el.className = "marker";
  el.title = feature.properties.nombre;

  el.addEventListener("click", (e) => {
    e.stopPropagation();
    abrirLugar(feature, el);
  });

  // opacityWhenCovered: en modo 3D MapLibre atenúa los marcadores "tapados" por el terreno;
  // para una guía preferimos que siempre se vean.
  const marker = new maplibregl.Marker({ element: el, anchor: "center", opacityWhenCovered: "0.9" })
    .setLngLat(feature.geometry.coordinates);

  marcadores.push({ feature, marker, el });
}

// Pinta el marcador con el ícono 3D y el color de una categoría.
// Sólo rehace la imagen si cambió de categoría, para que al filtrar no parpadee.
function pintarMarcador(el, clave) {
  const cat = CATEGORIAS[clave] || CATEGORIAS.playa;
  el.style.setProperty("--cat", cat.color);
  if (el.dataset.cat === clave) return;
  el.dataset.cat = clave;
  el.replaceChildren(crearIcono(cat));
}

function renderMarcadores() {
  const todas = categoriasActivas.size === 0;
  let visibles = 0;
  for (const m of marcadores) {
    const cats = m.feature.properties.categorias;
    // Con filtros activos, el ícono muestra la PRIMERA categoría buscada que el
    // lugar cumple (un lugar con surf y niños se ve como "niños" cuando el
    // visitante está buscando lugares para niños).
    const coincide = todas ? null : cats.find(c => categoriasActivas.has(c));
    if (!todas && !coincide) { m.marker.remove(); continue; }
    pintarMarcador(m.el, coincide || cats[0]);
    m.marker.addTo(map);
    visibles++;
  }
  sincronizarCapas(visibles);
}
renderMarcadores();

// ---------- Panel de detalle ----------
const panel = document.getElementById("panel");
const panelBody = document.getElementById("panel-body");
let lugarAbierto = null; // { categorias, pintarVista } del lugar que muestra el panel
document.getElementById("panel-close").addEventListener("click", cerrarPanel);

// Escapa texto para meterlo en HTML sin riesgo
function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Portada de respaldo mientras un lugar no tenga foto propia: la vista satelital
// real del punto, de Esri World Imagery (la misma fuente gratis de la capa Satélite).
function fotoSatelital(lng, lat) {
  const dx = 0.0037, dy = 0.0019; // unos 800 × 420 m alrededor del punto
  const bbox = [lng - dx, lat - dy, lng + dx, lat + dy].join(",");
  return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export" +
    `?bbox=${bbox}&bboxSR=4326&imageSR=3857&size=720,380&format=jpg&f=image`;
}

// ---------- Vista 3D del lugar (portada del panel) ----------
// Un mini mapa aparte: la imagen satelital sobre el relieve real, inclinado y
// girando despacito alrededor del punto. Mientras carga se ve la foto satelital
// plana; si el navegador no puede con 3D, se queda esa foto.
// Es el primer paso: cuando un lugar tenga su propia captura 3D, va en este mismo espacio.
let mapa3d = null;
let giro3d = null;
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

function montarVista3D(contenedor, lng, lat, cat) {
  desmontarVista3D();
  try {
    mapa3d = new maplibregl.Map({
      container: contenedor,
      style: {
        version: 8,
        sources: {
          satelite: { type: "raster", tiles: [TILES_SATELITE], tileSize: 256, maxzoom: 19 },
          relieve: { type: "raster-dem", tiles: [TILES_TERRENO], encoding: "terrarium", tileSize: 256, maxzoom: 15 },
        },
        layers: [{ id: "satelite", type: "raster", source: "satelite" }],
        terrain: { source: "relieve", exaggeration: 1.8 },
        sky: {
          "sky-color": "#6fb7d6",
          "horizon-color": "#dff1f7",
          "fog-color": "#dff1f7",
          "sky-horizon-blend": 0.6,
          "horizon-fog-blend": 0.6,
          "fog-ground-blend": 0.9,
        },
      },
      center: [lng, lat],
      zoom: 14.9,
      pitch: 70,
      bearing: -20,
      attributionControl: false,
      scrollZoom: false,      // la rueda sigue bajando el panel
      touchPitch: false,
      pitchWithRotate: false,
    });
  } catch {
    mapa3d = null; // sin WebGL: queda la foto satelital plana
    return;
  }

  // El nombre del lugar tapa la parte de abajo: el punto se muestra más arriba
  mapa3d.setPadding({ top: 0, bottom: 80, left: 0, right: 0 });

  // El punto exacto, con el ícono de su categoría
  if (cat) {
    const ico = crearIcono(cat);
    ico.classList.add("mini-marcador");
    new maplibregl.Marker({ element: ico, anchor: "bottom" }).setLngLat([lng, lat]).addTo(mapa3d);
  }

  mapa3d.once("idle", () => contenedor.classList.add("lista"));

  // Gira solo, salvo que la persona lo esté moviendo o prefiera sin animaciones
  let tocando = false;
  mapa3d.on("mousedown", () => { tocando = true; });
  mapa3d.on("touchstart", () => { tocando = true; });
  mapa3d.on("mouseup", () => { tocando = false; });
  mapa3d.on("touchend", () => { tocando = false; });
  const girar = () => {
    if (!mapa3d) return;
    if (!tocando && !sinMovimiento.matches) mapa3d.setBearing(mapa3d.getBearing() + 0.08);
    giro3d = requestAnimationFrame(girar);
  };
  giro3d = requestAnimationFrame(girar);
}

function desmontarVista3D() {
  if (giro3d) cancelAnimationFrame(giro3d);
  giro3d = null;
  if (mapa3d) mapa3d.remove(); // libera la memoria de video del mini mapa
  mapa3d = null;
}

// ---------- Foto 360° propia del lugar ----------
// Cuando un lugar tiene su toma 360° ("foto360" en data/points.js), la portada la
// muestra con un visor libre (Pannellum). El visor se descarga solo la primera vez
// que hace falta, así el mapa no carga nada extra para los lugares sin 360°.
let visor360 = null;
let pannellumListo = null;

function cargarPannellum() {
  if (!pannellumListo) {
    pannellumListo = new Promise((ok, mal) => {
      const base = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/";
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = base + "pannellum.css";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = base + "pannellum.js";
      js.onload = ok;
      js.onerror = () => { pannellumListo = null; mal(); };
      document.head.appendChild(js);
    });
  }
  return pannellumListo;
}

// "foto360" puede ser solo la ruta, o { src, yaw, minPitch, maxPitch } para ajustar la toma.
// "ajustes" cambia opciones del visor (la pantalla completa no usa las mismas que la portada).
async function crearVisor360(contenedor, foto360, ajustes = {}) {
  try { await cargarPannellum(); } catch { return null; }
  // Mientras se descargaba el visor, la persona pudo abrir otro lugar o pasar a 3D
  if (!contenedor.isConnected || !contenedor.getClientRects().length) return null;
  const toma = typeof foto360 === "string" ? { src: foto360 } : foto360;
  return pannellum.viewer(contenedor, {
    type: "equirectangular",
    panorama: toma.src,
    yaw: toma.yaw ?? 0,
    minPitch: toma.minPitch ?? -90,
    maxPitch: toma.maxPitch ?? 90,
    autoLoad: true,
    autoRotate: sinMovimiento.matches ? 0 : -2,
    hfov: 100,
    compass: false,
    showZoomCtrl: false,
    showFullscreenCtrl: true, // para verla en pantalla completa
    mouseZoom: false,         // la rueda sigue bajando el panel
    ...ajustes,
  });
}

async function montarVista360(contenedor, foto360) {
  desmontarVista360();
  visor360 = await crearVisor360(contenedor, foto360);
}

function desmontarVista360() {
  if (visor360) visor360.destroy();
  visor360 = null;
}

// ---------- Texto breve según la pestaña elegida ----------
// Primero manda el texto de esa categoría; si falta, usamos la entrada corta.
// No convertimos los campos técnicos en una ficha estática dentro del panel.
function textoDeCategoria(p, cat) {
  return p.porCategoria?.[cat] || textoGeneral(p);
}

// Sin entrada todavía (ej. Villa Flor), la ficha muestra la descripción armada con lo que
// contó el local, antes que una frase genérica
function textoGeneral(p) {
  return p.entrada || p.descripcion || "Conocé este lugar con la guía local.";
}

// Una sección es un texto corto o, desde el 2-oct (pedido de Juan: más detalle por categoría),
// una sección completa { texto, bloques } — ver data/points.js. Las pastillas de datos se
// quitaron el 3-oct (pedido de Juan): repetían lo que ya cuentan los bloques.
// "extra" va entre la entrada y los bloques (ahí va el "Best time to go" de la marea).
function htmlSeccion(sec, extra = "") {
  if (typeof sec === "string") return `<p class="resumen abierto">${esc(sec)}</p>${extra}`;
  const bloques = (sec.bloques || [])
    .map(b => `<div class="bloque"><h4>${esc(b.titulo)}</h4><p>${esc(b.texto)}</p></div>`).join("");
  return `<p class="seccion-intro">${esc(sec.texto)}</p>${extra}${bloques}`;
}

// ---------- Tours del lugar ----------
// Pedido de Juan (2-oct): los tours van como la última pestaña de cada lugar, no como un
// botón aparte. La pestaña cuenta el tour completo y, si lo quieren, se reserva con Juan por
// WhatsApp. Nunca se muestra quién da el tour ni su contacto. Los tours y en qué lugares
// aparecen están en data/tours.js ("lugares").
const TAB_TOURS = { label: "Tours", icono: "img/iconos/tours.png" };

function toursDelLugar(p) {
  return TOURS.filter(t => t.lugares?.includes(p.id));
}

function botonWhatsApp(mensaje, etiqueta) {
  if (!CONTACTO_JUAN.whatsapp) return `<span class="reservar reservar-pronto">Reservas por WhatsApp muy pronto</span>`;
  const url = `https://wa.me/${CONTACTO_JUAN.whatsapp}?text=${encodeURIComponent(mensaje)}`;
  return `<a class="reservar" href="${esc(url)}" target="_blank" rel="noopener">${esc(etiqueta)}</a>`;
}

// El mensaje ya trae los huecos de cuántos son y qué día: es lo primero que Juan necesita
function htmlTour(t) {
  return `
    <article class="tour">
      <h3>${esc(t.titulo)}</h3>
      <p class="tour-meta">📍 ${esc(t.salida)}<br>⏱ ${esc(t.duracion)}</p>
      <div class="datos">${t.incluye.map(i => `<span class="dato">${esc(i)}</span>`).join("")}</div>
      <p class="tour-texto">${esc(t.texto)}</p>
      <p class="tour-precio${t.precio ? "" : " a-confirmar"}">${esc(t.precio || "Precio según la fecha y el grupo: te lo confirmamos por WhatsApp.")}</p>
      ${botonWhatsApp(`Hola Juan 👋 Vi en Hey You ST el tour "${t.titulo}" y me interesa. Somos ___ personas y nos gustaría ir el ___.`, "Quiero este tour: escribile a Juan")}
    </article>`;
}

// ---------- Ideal para ir hoy ----------
// Pedido de Juan (3-oct): cruzar las horas buenas de cada lugar ("horasIdeales", lo que cuenta
// un local) con la tabla de mareas. Marea baja = de 2 h antes a 2 h después de la más baja
// (criterio de Juan). La marea viene de Open-Meteo: gratis, sin clave, pide que se le cite.
// Todo se calcula en hora de Costa Rica, aunque el visitante tenga el teléfono en otra zona:
// las horas se guardan como milisegundos "de reloj tico" (la hora local leída como UTC).
const TZ_CR = "America/Costa_Rica";
const HORA = 3600e3, DIA = 24 * HORA;
const mareasCache = new Map();

function cargarMareas(lng, lat) {
  const clave = `${lat.toFixed(1)},${lng.toFixed(1)}`;
  if (!mareasCache.has(clave)) {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
      `&minutely_15=sea_level_height_msl&timezone=${encodeURIComponent(TZ_CR)}&forecast_days=8`;
    mareasCache.set(clave, fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`Open-Meteo ${r.status}`)))
      .then(j => ({ t: j.minutely_15.time.map(s => Date.parse(s + "Z")), h: j.minutely_15.sea_level_height_msl }))
      .catch(e => { mareasCache.delete(clave); throw e; }));
  }
  return mareasCache.get(clave);
}

function ahoraCR() {
  const f = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ_CR, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date());
  return Date.parse(f.replace(" ", "T") + "Z");
}

// Momentos de marea más baja (o más alta) de la serie
function extremosMarea({ t, h }, tipo) {
  const out = [];
  for (let i = 1; i < h.length - 1; i++) {
    if (h[i] == null || h[i - 1] == null || h[i + 1] == null) continue;
    const baja = h[i] <= h[i - 1] && h[i] < h[i + 1];
    const alta = h[i] >= h[i - 1] && h[i] > h[i + 1];
    if (tipo === "alta" ? alta : baja) out.push(t[i]);
  }
  return out;
}

// Ventanas donde coinciden las horas buenas del lugar con la marea que conviene
function ventanasIdeales(ideal, mareas) {
  const rangos = ideal.horas.map(r => r.split("-").map(s => {
    const [hh, mm] = s.split(":").map(Number);
    return hh * HORA + mm * 60e3;
  }));
  const out = [];
  for (const m of extremosMarea(mareas, ideal.marea)) {
    const dia = Math.floor(m / DIA) * DIA;
    for (const [a, b] of rangos) {
      // Las 2 h alrededor de la marea pueden cruzar la medianoche
      for (const d of [dia - DIA, dia, dia + DIA]) {
        const ini = Math.max(m - 2 * HORA, d + a), fin = Math.min(m + 2 * HORA, d + b);
        if (fin - ini >= 30 * 60e3) out.push({ ini, fin, marea: m });
      }
    }
  }
  return out.sort((x, y) => x.ini - y.ini);
}

function horaCR(ms) {
  const d = new Date(ms), h = d.getUTCHours();
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`;
}
function rangoCR(ini, fin) {
  const [a, b] = [horaCR(ini), horaCR(fin)];
  return a.slice(-4) === b.slice(-4) ? `${a.slice(0, -5)} – ${b}` : `${a} – ${b}`;
}

// Juan (3-oct): dos líneas, hoy y mañana, arriba de los bloques, y en inglés como él las
// escribió ("Best time to go today at xxx" / "Best time to go tomorrow xxx").
const DIAS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function llenarIdealHoy(el, ideal, lng, lat) {
  let ventanas;
  try { ventanas = ventanasIdeales(ideal, await cargarMareas(lng, lat)); }
  catch (e) { console.warn("Sin datos de marea:", e); return; }
  if (!el.isConnected) return; // la persona ya cambió de pestaña o de lugar
  const ahora = ahoraCR();
  const hoy = Math.floor(ahora / DIA);
  const proximas = ventanas.filter(v => v.fin > ahora);
  if (!proximas.length) return;
  const delDia = (n) => proximas.filter(v => Math.floor(v.ini / DIA) === hoy + n);
  const horas = (vs) => vs.length
    ? vs.map(v => v.ini <= ahora ? `now, until ${horaCR(v.fin)}` : rangoCR(v.ini, v.fin)).join(" and ")
    : "no good window";
  const linea = (texto, valor) => `<span class="ideal-linea">🕐 ${texto}: <strong>${esc(valor)}</strong></span>`;
  const [vHoy, vManana] = [delDia(0), delDia(1)];
  // Si ni hoy ni mañana hay ventana, se avisa cuál es la próxima
  const proxima = !vHoy.length && !vManana.length
    ? linea(`Next good time: ${DIAS_EN[new Date(proximas[0].ini).getUTCDay()]}`, rangoCR(proximas[0].ini, proximas[0].fin))
    : "";
  el.innerHTML = `
    ${linea("Best time to go today", horas(vHoy))}
    ${linea("Best time to go tomorrow", horas(vManana))}
    ${proxima}
    <span class="ideal-detalle">With ${ideal.marea === "alta" ? "high" : "low"} tide · Tide data:
      <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></span>`;
  el.hidden = false;
}

// Pedido de Juan (3-oct): que la gente pueda irse directo a Waze o Google Maps desde el lugar.
// Si el lugar trae "llegada" (dónde dejar el carro o dónde arranca el sendero), se navega ahí.
function htmlComoLlegar(p, [lng, lat]) {
  const [dLng, dLat] = p.llegada || [lng, lat];
  const destino = `${dLat},${dLng}`;
  return `
    <div class="como-llegar">
      <span>Cómo llegar</span>
      <a href="https://waze.com/ul?ll=${destino}&navigate=yes" target="_blank" rel="noopener">Waze</a>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${destino}" target="_blank" rel="noopener">Google Maps</a>
    </div>`;
}

// opciones.sobre360: la ficha se abre encima de la foto 360° a pantalla completa (ver
// "Modo inmersivo"), así que no lleva portada; opciones.cat: la pestaña con que abre.
function abrirPanel(feature, el, opciones = {}) {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const sobre360 = !!opciones.sobre360;
  panel.classList.toggle("sobre-360", sobre360);

  document.querySelectorAll(".marker.activo").forEach(m => m.classList.remove("activo"));
  el.classList.add("activo");

  // Las categorías del lugar son pestañas: tocar "Surf" cuenta cómo es el surf ahí.
  // Si el lugar tiene tours, "Tours" va de última.
  const tours = toursDelLugar(p);
  const pestana = (clave, { icono, label }) => `<button type="button" class="tag" data-cat="${clave}" aria-pressed="false">` +
    `<img class="tag-ico" src="${esc(icono)}" alt="">${esc(label)}</button>`;
  const tags = p.categorias
    .filter(c => CATEGORIAS[c])
    .map(c => pestana(c, CATEGORIAS[c]))
    .join("") + (tours.length ? pestana("tours", TAB_TOURS) : "");

  // Portada: la foto del lugar si la hay; si no, su vista 3D (y mientras carga,
  // la foto satelital plana del mismo punto)
  const portada = p.foto || fotoSatelital(lng, lat);
  const con3d = !p.foto;
  const con360 = !!p.foto360;
  const CREDITO_3D = "Vista 3D · Esri · AWS Terrain";
  const CREDITO_360 = "Foto 360° · tomada por un local";
  const credito = p.foto && !con360 ? "" : `<span class="hero-credito">${con360 ? CREDITO_360 : CREDITO_3D}</span>`;
  // Con foto 360° la portada tiene dos modos: la toma propia y la vista del mapa
  const modos = con360 ? `
      <div class="hero-modos" role="group" aria-label="Cómo ver el lugar">
        <button type="button" data-modo="360">360°</button>
        <button type="button" data-modo="mapa">${con3d ? "3D" : "Foto"}</button>
      </div>` : "";

  // Las vistas del lugar anterior se van con el HTML viejo
  desmontarVista3D();
  desmontarVista360();
  const textoHero = `
      <div class="hero-texto">
        <h2>${esc(p.nombre)}</h2>
        <div class="tags">${tags}</div>
      </div>`;
  panelBody.innerHTML = `
    ${sobre360 ? `<div class="hero">${textoHero}</div>` : `
    <div class="hero">
      <img class="hero-foto" src="${esc(portada)}" alt="${esc(p.nombre)}">
      ${con3d ? `<div class="hero-3d"></div>` : ""}
      ${con360 ? `<div class="hero-360"></div>` : ""}
      ${modos}
      ${credito}
      ${textoHero}
    </div>`}
    <div class="panel-contenido">
      ${htmlComoLlegar(p, [lng, lat])}
      <div class="vista"></div>
    </div>`;

  const heroFoto = panelBody.querySelector(".hero-foto");
  const mostrarFoto = () => heroFoto.classList.add("lista");
  if (!heroFoto) { /* encima de la 360°: sin portada */ }
  else if (heroFoto.complete && heroFoto.naturalWidth) mostrarFoto();
  else heroFoto.addEventListener("load", mostrarFoto, { once: true });
  const heroEl = panelBody.querySelector(".hero");
  const mostrarMapa3D = () => {
    if (con3d) montarVista3D(panelBody.querySelector(".hero-3d"), lng, lat, CATEGORIAS[p.categorias[0]]);
  };
  if (sobre360) {
    // La foto ya está detrás, a pantalla completa: la ficha no monta otra vista
  } else if (con360) {
    // Arranca en la toma propia (lo más real que tenemos del lugar); un toque pasa al 3D
    const creditoEl = heroEl.querySelector(".hero-credito");
    const ponerModo = (modo) => {
      heroEl.dataset.modo = modo;
      heroEl.querySelectorAll(".hero-modos button")
        .forEach(b => b.setAttribute("aria-pressed", String(b.dataset.modo === modo)));
      creditoEl.textContent = modo === "360" ? CREDITO_360 : (con3d ? CREDITO_3D : "");
      if (modo === "360") {
        desmontarVista3D();
        montarVista360(heroEl.querySelector(".hero-360"), p.foto360);
      } else {
        desmontarVista360();
        mostrarMapa3D();
      }
    };
    heroEl.querySelectorAll(".hero-modos button")
      .forEach(b => b.addEventListener("click", () => ponerModo(b.dataset.modo)));
    ponerModo("360");
  } else {
    mostrarMapa3D();
  }

  // El panel muestra el texto breve de la sección elegida. "Preguntale al local" se quitó
  // el 2-oct (pedido de Juan): la ficha ya da buena información por sí sola.
  const vistaEl = panelBody.querySelector(".vista");
  const tagsEl = [...panelBody.querySelectorAll(".tag")];
  const pintarVista = (cat) => {
    tagsEl.forEach(t => t.setAttribute("aria-pressed", String(t.dataset.cat === cat)));
    if (cat === "tours") {
      vistaEl.innerHTML = `
        <p class="vista-titulo"><img src="${esc(TAB_TOURS.icono)}" alt="">Tours en ${esc(p.nombre)}</p>
        ${tours.map(htmlTour).join("")}`;
      return;
    }
    const c = CATEGORIAS[cat];
    const conIdeal = p.horasIdeales && (!c || p.horasIdeales.secciones?.includes(cat));
    vistaEl.innerHTML = `
      ${c ? `<p class="vista-titulo"><img src="${esc(c.icono)}" alt="">${esc(c.label)} en ${esc(p.nombre)}</p>` : ""}
      ${htmlSeccion(c ? textoDeCategoria(p, cat) : textoGeneral(p),
        conIdeal ? `<div class="ideal-hoy" hidden></div>` : "")}`;
    if (conIdeal) llenarIdealHoy(vistaEl.querySelector(".ideal-hoy"), p.horasIdeales, lng, lat);
  };
  tagsEl.forEach(t => t.addEventListener("click", () => {
    // Tocar la pestaña que ya está elegida vuelve a la vista general
    pintarVista(t.getAttribute("aria-pressed") === "true" ? null : t.dataset.cat);
  }));
  // Abre en la pestaña que tocaron sobre la 360°; si no, en la categoría con que la persona
  // venía filtrando el mapa
  const filtro = [...categoriasActivas][0];
  pintarVista(opciones.cat || (p.categorias.includes(filtro) ? filtro : null));
  lugarAbierto = { categorias: p.categorias, pintarVista };

  panel.hidden = false;
  panel.scrollTop = 0;
  asaNombre.textContent = p.nombre;
  // Al tocar una sección sobre la 360°, la ficha sube hasta arriba (pedido de Juan, 3-oct);
  // su ✕ devuelve a la foto. Mientras tanto la foto se queda quieta.
  if (sobre360) congelarFoto(true);
  if (anchoMovil.matches) ponerAltura(sobre360 ? "alta" : "media");
  encuadreLibre = false; // ya estamos viendo un lugar: no volver al encuadre general
  if (sobre360) return; // el mapa está detrás de la foto; ya se movió al abrirla

  // En móvil el panel tapa la parte de abajo; en escritorio tapa la derecha.
  // Desplazamos el centro para que el punto quede visible.
  const movil = window.innerWidth <= 640;
  map.flyTo({
    center: [lng, lat],
    zoom: Math.max(map.getZoom(), 13),
    offset: movil ? [0, -120] : [-180, 0],
    duration: 900,
  });
}

function cerrarPanel() {
  panel.hidden = true;
  panel.classList.remove("sobre-360");
  lugarAbierto = null;
  soltarAltura();
  desmontarVista3D();
  desmontarVista360();
  // Encima de la 360°, cerrar la ficha vuelve a la foto (que vuelve a moverse); el lugar sigue marcado
  congelarFoto(false);
  if (inmersivo.hidden) document.querySelectorAll(".marker.activo").forEach(m => m.classList.remove("activo"));
}

// ---------- Modo inmersivo ----------
// Idea de Juan (3-oct): al tocar un lugar con foto 360°, la foto llena la pantalla; abajo
// flotan los íconos de sus secciones, y al tocar uno sube la ficha con esa sección encima de
// la foto. Cerrar la ficha vuelve a la foto; la ✕ de arriba vuelve al mapa. Por ahora solo
// lo usan los lugares con "foto360" (Villa Flor); los demás abren la ficha de siempre.
const inmersivo = document.getElementById("inmersivo");
let visorInmersivo = null;
let sincronizarGiro = null; // actualiza el botón del giroscopio (ver prepararGiroscopio)
let fotoCongelada = null;   // { giro } mientras la ficha tapa la foto

// Pedido de Juan (3-oct): mientras se lee una sección, la foto de atrás se queda quieta (sin
// girar sola ni seguir el teléfono) para no distraer del texto; al cerrar o bajar la ficha,
// vuelve a moverse como estaba.
function congelarFoto(congelar) {
  const v = visorInmersivo;
  if (!v) return;
  if (congelar && !fotoCongelada) {
    fotoCongelada = { giro: v.isOrientationActive() };
    v.stopAutoRotate();
    if (fotoCongelada.giro) v.stopOrientation();
  } else if (!congelar && fotoCongelada) {
    if (fotoCongelada.giro) v.startOrientation();
    else if (!sinMovimiento.matches) v.startAutoRotate(-2);
    fotoCongelada = null;
    sincronizarGiro?.();
  }
}

function abrirLugar(feature, el) {
  if (feature.properties.foto360) abrirInmersivo(feature, el);
  else abrirPanel(feature, el);
}

function abrirInmersivo(feature, el) {
  const p = feature.properties;
  cerrarPanel();
  cerrarInmersivo();
  document.querySelectorAll(".marker.activo").forEach(m => m.classList.remove("activo"));
  el.classList.add("activo");

  const secciones = p.categorias.filter(c => CATEGORIAS[c]).map(c => [c, CATEGORIAS[c]]);
  if (toursDelLugar(p).length) secciones.push(["tours", TAB_TOURS]);
  inmersivo.innerHTML = `
    <div class="inm-360"></div>
    <div class="inm-arriba">
      <h2>${esc(p.nombre)}</h2>
      <button type="button" class="inm-cerrar" aria-label="Volver al mapa">✕</button>
    </div>
    <span class="inm-credito">Foto 360° · tomada por un local</span>
    <div class="inm-abajo">
      <button type="button" class="inm-giro" aria-pressed="false" hidden></button>
      <nav class="inm-secciones" aria-label="Secciones de ${esc(p.nombre)}">
        ${secciones.map(([clave, { icono, label }]) => `
          <button type="button" data-cat="${clave}">
            <img src="${esc(icono)}" alt=""><span>${esc(label)}</span>
          </button>`).join("")}
      </nav>
    </div>`;
  inmersivo.hidden = false;
  document.body.classList.add("con-inmersivo");

  inmersivo.querySelector(".inm-cerrar").addEventListener("click", cerrarInmersivo);
  inmersivo.querySelectorAll(".inm-secciones button").forEach(b => b.addEventListener("click", () =>
    abrirPanel(feature, el, { sobre360: true, cat: b.dataset.cat })));

  // A pantalla completa la rueda y el pellizco sí acercan, y no hace falta el botón de
  // pantalla completa. Si el teléfono lo permite, el visor muestra el botón para mirar
  // alrededor moviendo el teléfono.
  // En el celular parado la pantalla es angosta y alta: si se abre tan ancho como en la
  // portada, se ve casi puro cielo deformado (y el tope de "minPitch" obliga a mirar hacia
  // arriba). Se encuadra como la cámara del teléfono: unos 75° de alto como máximo.
  const cont = inmersivo.querySelector(".inm-360");
  const rad = Math.PI / 180;
  const hfov = Math.min(100, 2 * Math.atan(Math.tan(37.5 * rad) * cont.clientWidth / cont.clientHeight) / rad);
  crearVisor360(cont, p.foto360, { showFullscreenCtrl: false, mouseZoom: true, hfov, minHfov: 30 }).then((v) => {
    if (!cont.isConnected) { v?.destroy(); return; }
    visorInmersivo = v;
    if (v) prepararGiroscopio(v);
  });

  // Detrás, el mapa ya se acerca al lugar: al volver, la persona está ahí
  map.flyTo({ center: feature.geometry.coordinates, zoom: Math.max(map.getZoom(), 13), duration: 0 });
}

// Pedido de Juan (3-oct): mirar alrededor moviendo el teléfono, para que la foto se sienta
// viva. El visor ya lo trae, pero solo en celulares y con https (la página pública sí; el
// localhost no). Donde se puede arranca solo; en el iPhone hay que tocar el botón, porque el
// teléfono pide permiso y solo deja pedirlo después de un toque.
function prepararGiroscopio(v) {
  if (!v.isOrientationSupported()) return;
  const btn = inmersivo.querySelector(".inm-giro");
  const sincronizar = () => {
    const activo = v.isOrientationActive();
    btn.setAttribute("aria-pressed", String(activo));
    btn.textContent = activo ? "📱 Siguiendo tu teléfono · tocá para soltar" : "📱 Mirá alrededor moviendo el teléfono";
  };
  const encender = () => {
    v.stopAutoRotate();
    v.startOrientation(); // en el iPhone, aquí sale el permiso
    setTimeout(sincronizar, 600); // el permiso tarda: se revisa después
  };
  btn.addEventListener("click", () => {
    if (v.isOrientationActive()) v.stopOrientation();
    else encender();
    sincronizar();
  });
  // Arrastrar la foto con el dedo apaga el giroscopio (así lo hace el visor): el botón lo refleja
  inmersivo.querySelector(".inm-360").addEventListener("touchend", () => setTimeout(sincronizar, 0));
  sincronizarGiro = sincronizar;
  btn.hidden = false;
  sincronizar();
  // Se intenta prender solo: en Android el permiso no hace falta o se da sin preguntar; en el
  // iPhone el pedido sin toque falla callado y queda el botón esperando
  const pedir = DeviceOrientationEvent.requestPermission?.bind(DeviceOrientationEvent);
  (pedir ? pedir() : Promise.resolve("granted"))
    .then((r) => { if (r === "granted" && btn.isConnected) encender(); })
    .catch(() => {});
}

function cerrarInmersivo() {
  if (inmersivo.hidden) return;
  if (!panel.hidden) cerrarPanel();
  if (visorInmersivo) visorInmersivo.destroy();
  visorInmersivo = null;
  sincronizarGiro = null;
  fotoCongelada = null;
  inmersivo.hidden = true;
  inmersivo.innerHTML = "";
  document.body.classList.remove("con-inmersivo");
  document.querySelectorAll(".marker.activo").forEach(m => m.classList.remove("activo"));
}

// Escape: primero cierra la ficha; si no hay ficha, sale de la foto
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || inmersivo.hidden) return;
  if (!panel.hidden) cerrarPanel();
  else cerrarInmersivo();
});

// ---------- Hoja deslizable (solo celular) ----------
// Pedido de Juan (29-sep): la ficha se baja y se sube como las hojas del iPhone. Tiene tres
// alturas: "baja" (una barrita con el nombre, para seguir explorando el mapa), "media" (al
// abrir un lugar) y "alta" (para leer todo). Se arrastra desde la agarradera, o desde el
// contenido cuando está arriba del todo; al soltar se acomoda en la altura más cercana, o
// en la siguiente si el gesto fue rápido. Un toque en la agarradera baja o sube la hoja.
const panelAsa = document.getElementById("panel-asa");
const asaNombre = document.getElementById("panel-asa-nombre");
const ALTURAS = ["baja", "media", "alta"];
let alturaActual = "media";
let alturaAntesDeBajar = "media"; // a dónde vuelve la hoja cuando la suben con un toque

function pxDeAltura(nombre) {
  const alto = panel.parentElement.clientHeight;
  const barra = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--topbar-alto")) || 62;
  const media = Math.round(alto * 0.62);
  if (nombre === "baja") return 60;
  if (nombre === "media") return media;
  // Encima de la 360° la ficha sube casi hasta arriba, dejando una franja de la foto (Juan, 3-oct)
  if (panel.classList.contains("sobre-360")) return alto - 56;
  return Math.max(media, alto - barra - 84); // alta: justo debajo de "Explorá el mapa"
}

function ponerAltura(nombre) {
  if (nombre === "baja" && alturaActual !== "baja") alturaAntesDeBajar = alturaActual;
  alturaActual = nombre;
  panel.style.height = pxDeAltura(nombre) + "px";
  panel.classList.toggle("baja", nombre === "baja");
  if (nombre === "baja") panel.scrollTop = 0;
  // Sobre la 360°: con la ficha bajada la foto vuelve a moverse; al subirla, se queda quieta
  if (panel.classList.contains("sobre-360") && !panel.hidden) congelarFoto(nombre !== "baja");
  panelAsa.setAttribute("aria-label", nombre === "baja" ? "Subir la ficha" : "Bajar la ficha para ver el mapa");
}

// En escritorio (o al cerrar) la ficha vuelve a medirse sola con el CSS
function soltarAltura() {
  panel.style.height = "";
  panel.classList.remove("baja", "arrastrando");
  alturaActual = "media";
}

// Si cambia el alto de la pantalla (girar el celular, abrirse el teclado) la hoja se
// reacomoda a la misma altura con los px nuevos; si ya no es celular, suelta la altura.
window.addEventListener("resize", () => {
  if (panel.hidden) return;
  if (anchoMovil.matches) ponerAltura(alturaActual);
  else soltarAltura();
});

let arrastre = null; // { y0, h0, muestras: [[tiempo, y], ...] }

function empezarArrastre(y) {
  arrastre = { y0: y, h0: panel.getBoundingClientRect().height, muestras: [[performance.now(), y]] };
  panel.classList.add("arrastrando");
}

function moverArrastre(y) {
  let h = arrastre.h0 - (y - arrastre.y0);
  const min = pxDeAltura("baja");
  const max = pxDeAltura("alta");
  // Pasado el tope, la hoja cede de a poco, como una liga
  if (h > max) h = max + (h - max) / 3;
  if (h < min) h = min - (min - h) / 3;
  panel.style.height = h + "px";
  panel.classList.toggle("baja", h < min + 24);
  arrastre.muestras.push([performance.now(), y]);
  if (arrastre.muestras.length > 6) arrastre.muestras.shift();
}

function soltarArrastre() {
  const [t1, y1] = arrastre.muestras[arrastre.muestras.length - 1];
  const [t0, y0] = arrastre.muestras[0];
  const velocidad = (y1 - y0) / Math.max(1, t1 - t0); // px/ms, positiva = hacia abajo
  const h = panel.getBoundingClientRect().height;
  let destino;
  if (Math.abs(velocidad) > 0.45) {
    // Gesto rápido: la siguiente altura en esa dirección
    destino = velocidad > 0
      ? [...ALTURAS].reverse().find(n => pxDeAltura(n) < h - 10) || "baja"
      : ALTURAS.find(n => pxDeAltura(n) > h + 10) || "alta";
  } else {
    destino = ALTURAS.reduce((a, b) => Math.abs(pxDeAltura(b) - h) < Math.abs(pxDeAltura(a) - h) ? b : a);
  }
  arrastre = null;
  panel.classList.remove("arrastrando");
  ponerAltura(destino);
}

function alternarHoja() {
  ponerAltura(alturaActual === "baja" ? alturaAntesDeBajar : "baja");
}

// La agarradera: se arrastra con dedo o mouse; un toque sin arrastrar baja o sube la hoja
panelAsa.addEventListener("pointerdown", (e) => {
  if (!anchoMovil.matches) return;
  panelAsa.setPointerCapture(e.pointerId);
  empezarArrastre(e.clientY);
});
panelAsa.addEventListener("pointermove", (e) => { if (arrastre) moverArrastre(e.clientY); });
panelAsa.addEventListener("pointerup", (e) => {
  if (!arrastre) return;
  if (Math.abs(e.clientY - arrastre.y0) < 6) {
    arrastre = null;
    panel.classList.remove("arrastrando");
    alternarHoja();
  } else {
    soltarArrastre();
  }
});
panelAsa.addEventListener("pointercancel", () => { if (arrastre) soltarArrastre(); });
// Con teclado (Enter o espacio) el click llega sin puntero: también baja o sube
panelAsa.addEventListener("click", (e) => { if (e.detail === 0) alternarHoja(); });

// Desde el contenido, como en el iPhone: si la ficha está arriba del todo, deslizar hacia
// abajo baja la hoja; si todavía no está en su altura máxima, deslizar hacia arriba la
// sube antes de ponerse a leer. En cualquier otro caso el dedo hace scroll normal. Se
// decide en el primer movimiento, que es el único en que el navegador deja frenar el scroll.
// La vista 3D y la 360° se quedan con el dedo (ahí se gira el lugar), y el campo de texto también.
let gestoHoja = null; // null = sin decidir, "hoja" o "scroll"
panel.addEventListener("touchstart", (e) => {
  gestoHoja = null;
  if (!anchoMovil.matches || e.touches.length !== 1) return;
  if (e.target.closest(".panel-asa, .hero-3d, .hero-360, input")) return;
  gestoHoja = { y0: e.touches[0].clientY, x0: e.touches[0].clientX, modo: null };
}, { passive: true });

panel.addEventListener("touchmove", (e) => {
  if (!gestoHoja) return;
  const { clientX, clientY } = e.touches[0];
  if (!gestoHoja.modo) {
    const dy = clientY - gestoHoja.y0;
    const dx = clientX - gestoHoja.x0;
    const haciaArriba = dy < 0;
    const baja = !haciaArriba && panel.scrollTop <= 0;
    const sube = haciaArriba && alturaActual !== "alta";
    gestoHoja.modo = Math.abs(dy) >= Math.abs(dx) && (baja || sube) ? "hoja" : "scroll";
    if (gestoHoja.modo === "hoja") empezarArrastre(gestoHoja.y0);
  }
  if (gestoHoja.modo !== "hoja") return;
  e.preventDefault();
  moverArrastre(clientY);
}, { passive: false });

const terminarGestoHoja = () => {
  if (gestoHoja?.modo === "hoja" && arrastre) soltarArrastre();
  gestoHoja = null;
};
panel.addEventListener("touchend", terminarGestoHoja);
panel.addEventListener("touchcancel", terminarGestoHoja);

// ---------- Utilidades para recolorear el estilo base ----------
function pintar(id, prop, valor) {
  if (map.getLayer(id)) map.setPaintProperty(id, prop, valor);
}
function ocultar(id) {
  if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
}
function capasQueContienen(...fragmentos) {
  return map.getStyle().layers.filter(l => fragmentos.some(f => l.id.includes(f)));
}
// Devuelve el id de la primera capa de etiquetas: lo que se inserte "antes" de
// ella queda debajo de los nombres de lugares.
function primeraEtiqueta() {
  return map.getStyle().layers.find(l => l.type === "symbol")?.id;
}

// Recolorea el estilo "bright" con una de las paletas de arriba.
function aplicarPaleta(p) {
  pintar("background", "background-color", p.fondo);
  ["water", "water-intermittent"].forEach(id => pintar(id, "fill-color", p.mar));
  capasQueContienen("waterway").filter(l => l.type === "line").forEach(l => pintar(l.id, "line-color", p.mar));

  pintar("landcover-wood", "fill-color", p.selva);
  pintar("landcover-wood", "fill-opacity", 0.55);
  ["landcover-grass", "landcover-grass-park", "park"].forEach(id => pintar(id, "fill-color", p.pasto));
  pintar("landcover-sand", "fill-color", p.arena);

  // Zonas de uso de suelo: casi invisibles (son lo que da el look "ciudad" de Google)
  ["landuse-residential", "landuse-suburb"].forEach(id => pintar(id, "fill-color", p.urbano));
  ["landuse-commercial", "landuse-industrial", "landuse-hospital", "landuse-school",
   "landuse-cemetery", "landuse-railway"].forEach(ocultar);
  ["building", "building-top"].forEach(id => pintar(id, "fill-color", p.edificios));

  // Carreteras
  for (const l of capasQueContienen("highway", "tunnel", "bridge")) {
    if (l.type !== "line") continue;
    const id = l.id;
    if (id.includes("casing"))         pintar(id, "line-color", p.viaBorde);
    else if (id.includes("path"))      pintar(id, "line-color", p.sendero);
    else if (id.includes("minor"))     pintar(id, "line-color", p.viaMenor);
    else if (id.includes("motorway"))  pintar(id, "line-color", p.autopista);
    else                               pintar(id, "line-color", p.viaMayor);
  }
  capasQueContienen("boundary").forEach(l => pintar(l.id, "line-color", p.limites));

  // Fuera los íconos de negocios y las flechas de sentido de vía
  ["poi_r1", "poi_r7", "poi_r20", "poi_transit", "road_oneway", "road_oneway_opposite"].forEach(ocultar);

  // Etiquetas
  for (const l of capasQueContienen("label_", "highway-name", "water_name", "waterway_line_label")) {
    const esAgua = l.id.includes("water");
    pintar(l.id, "text-color", esAgua ? p.textoAgua : p.texto);
    pintar(l.id, "text-halo-color", esAgua ? "rgba(255,255,255,0.7)" : p.fondo);
  }
}

// ---------- Menú de capas (celular) ----------
// En el teléfono la barra de arriba muestra solo un botón; al tocarlo se abre el menú
// con el estilo, el satélite, el 3D y las curvas. Se queda abierto mientras la persona
// prende y apaga cosas, y se cierra al tocar afuera o con Escape. En compu no se usa.
const accionesEl = document.getElementById("topbar-acciones");
const btnCapas = document.getElementById("btn-capas");

function abrirMenuCapas(abierto) {
  accionesEl.classList.toggle("abierta", abierto);
  btnCapas.setAttribute("aria-expanded", String(abierto));
}
btnCapas.addEventListener("click", () => abrirMenuCapas(!accionesEl.classList.contains("abierta")));
document.addEventListener("click", (e) => { if (!accionesEl.contains(e.target)) abrirMenuCapas(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") abrirMenuCapas(false); });

// ---------- Selector de estilo ----------
const selEstilo = document.getElementById("sel-estilo");
let estiloActual = ESTILO_INICIAL;

for (const [clave, e] of Object.entries(ESTILOS)) {
  const op = document.createElement("option");
  op.value = clave;
  op.textContent = e.nombre;
  op.selected = clave === ESTILO_INICIAL;
  selEstilo.appendChild(op);
}

selEstilo.addEventListener("change", () => {
  estiloActual = selEstilo.value;
  // Frenamos animaciones y quitamos el terreno antes de cambiar: MapLibre no
  // tolera renderizar terreno mientras el estilo nuevo todavía está cargando.
  map.stop();
  if (map.getTerrain()) map.setTerrain(null);
  map.setStyle(ESTILOS[estiloActual].url, { diff: false });
  // Al cambiar de estilo se pierden las capas agregadas: se reponen en "style.load"
});

// En Noche los nombres de lugares van en blanco pleno, con borde oscuro, para que
// se lean bien presentes por encima del brillo de las curvas (pedido de Juan).
function nombresEnBlanco() {
  for (const l of map.getStyle().layers) {
    if (l.type !== "symbol" || !l.layout?.["text-field"] || l.id.startsWith("curvas")) continue;
    map.setPaintProperty(l.id, "text-color", "#ffffff");
    map.setPaintProperty(l.id, "text-halo-color", "rgba(4, 12, 20, 0.92)");
    map.setPaintProperty(l.id, "text-halo-width", 1.6);
    map.setPaintProperty(l.id, "text-opacity", 1);
  }
}

// Cada vez que carga un estilo (al inicio y al cambiar) aplicamos ajustes y reponemos capas
map.on("style.load", () => {
  const e = ESTILOS[estiloActual];
  if (e.paleta) aplicarPaleta(e.paleta);
  if (estiloActual === "noche") nombresEnBlanco();
  if (sateliteActivo) agregarSatelite();
  if (terrenoActivo) agregarTerreno();
  if (curvasActivas) agregarCurvas();
});

// ---------- Satélite ----------
const btnSat = document.getElementById("btn-sat");
let sateliteActivo = false;

function agregarSatelite() {
  if (!map.getSource("satelite")) {
    map.addSource("satelite", {
      type: "raster",
      tiles: [TILES_SATELITE],
      tileSize: 256,
      attribution: "Imagen: Esri, Maxar, Earthstar Geographics",
    });
  }
  // Debajo de las curvas y de las etiquetas, para que sigan visibles encima
  if (!map.getLayer("satelite")) {
    const antes = map.getLayer("curvas-brillo") ? "curvas-brillo" : primeraEtiqueta();
    map.addLayer({ id: "satelite", type: "raster", source: "satelite" }, antes);
  }
}

btnSat.addEventListener("click", () => {
  sateliteActivo = !sateliteActivo;
  btnSat.classList.toggle("activo", sateliteActivo);
  if (sateliteActivo) agregarSatelite();
  else if (map.getLayer("satelite")) map.removeLayer("satelite");
  pintarCurvas();
});

// ---------- Terreno 3D ----------
const btn3d = document.getElementById("btn-3d");
let terrenoActivo = false;

function agregarTerreno() {
  if (!map.getSource("terreno")) {
    map.addSource("terreno", {
      type: "raster-dem",
      tiles: [TILES_TERRENO],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 15,
      attribution: "Terreno: Mapzen / AWS Terrain Tiles",
    });
  }
  map.setTerrain({ source: "terreno", exaggeration: 1.4 });
}

btn3d.addEventListener("click", () => {
  terrenoActivo = !terrenoActivo;
  btn3d.classList.toggle("activo", terrenoActivo);

  if (terrenoActivo) {
    agregarTerreno();
    map.easeTo({ pitch: 60, duration: 900 });
  } else {
    map.setTerrain(null);
    map.easeTo({ pitch: 0, bearing: 0, duration: 900 });
  }
});

// ---------- Curvas de nivel (neón) ----------
// Se generan en el navegador a partir de las mismas alturas del modo 3D
// (AWS Terrain Tiles), con el plugin libre maplibre-contour. Mientras más cerca,
// más apretadas: cada zoom tiene su propia separación entre curvas.
const btnCurvas = document.getElementById("btn-curvas");
let curvasActivas = true;

// Si el plugin no cargó (sin conexión al CDN), el mapa sigue funcionando sin curvas
const demCurvas = window.mlcontour
  ? new mlcontour.DemSource({ url: TILES_TERRENO, encoding: "terrarium", maxzoom: 13, worker: true })
  : null;
if (demCurvas) demCurvas.setupMaplibre(maplibregl);
else btnCurvas.hidden = true;

// Metros entre curvas según el zoom: [curva fina, curva maestra]
const SEPARACION_CURVAS = {
  9:  [100, 500],
  11: [50, 250],
  13: [25, 100],
  14: [10, 50],
  15: [5, 25],
};
const CAPAS_CURVAS = ["curvas-brillo", "curvas-linea", "curvas-etiquetas"];

function agregarCurvas() {
  if (!demCurvas) return;
  if (!map.getSource("curvas")) {
    map.addSource("curvas", {
      type: "vector",
      tiles: [demCurvas.contourProtocolUrl({
        thresholds: SEPARACION_CURVAS,
        contourLayer: "curvas",
        elevationKey: "ele",
        levelKey: "level",
      })],
      maxzoom: 15,
      attribution: "Curvas: AWS Terrain Tiles",
    });
  }
  // Debajo de los nombres del mapa; sin batimetría (en el mar no hay curvas)
  const antes = primeraEtiqueta();
  const enTierra = [">", ["get", "ele"], 0];
  const base = { source: "curvas", "source-layer": "curvas" };
  if (!map.getLayer("curvas-brillo")) {
    map.addLayer({ id: "curvas-brillo", type: "line", ...base, filter: enTierra,
      layout: { "line-join": "round", "line-cap": "round" } }, antes);
  }
  if (!map.getLayer("curvas-linea")) {
    map.addLayer({ id: "curvas-linea", type: "line", ...base, filter: enTierra,
      layout: { "line-join": "round", "line-cap": "round" } }, antes);
  }
  if (!map.getLayer("curvas-etiquetas")) {
    map.addLayer({ id: "curvas-etiquetas", type: "symbol", ...base, minzoom: 12,
      filter: ["all", enTierra, [">", ["get", "level"], 0]],
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 320,
        "text-field": ["concat", ["to-string", ["get", "ele"]], " m"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
        "text-letter-spacing": 0.05,
      } }, antes);
  }
  pintarCurvas();
}

function quitarCurvas() {
  for (const id of CAPAS_CURVAS) if (map.getLayer(id)) map.removeLayer(id);
}

// Neón con brillo sobre fondos oscuros (Noche y Satélite); en los estilos claros,
// turquesa sobrio sin brillo, porque sobre arena el resplandor se ve sucio.
function pintarCurvas() {
  if (!map.getLayer("curvas-linea")) return;
  const neon = estiloActual === "noche" || sateliteActivo;
  const maestra = [">", ["get", "level"], 0];
  const porZoom = (...paradas) => ["interpolate", ["linear"], ["zoom"], ...paradas];

  map.setLayoutProperty("curvas-brillo", "visibility", neon ? "visible" : "none");
  map.setPaintProperty("curvas-brillo", "line-color", "#00f0ff");
  map.setPaintProperty("curvas-brillo", "line-width",
    porZoom(9, ["case", maestra, 3, 2], 14, ["case", maestra, 8, 4]));
  map.setPaintProperty("curvas-brillo", "line-blur", porZoom(9, 2, 14, 5));
  // El brillo es sobre todo de las maestras; las finas apenas resplandecen
  map.setPaintProperty("curvas-brillo", "line-opacity",
    porZoom(9, ["case", maestra, 0.14, 0.03], 13, ["case", maestra, 0.4, 0.1]));

  map.setPaintProperty("curvas-linea", "line-color", neon
    ? ["case", maestra, "#8ffff6", "#22e6df"]
    : ["case", maestra, "#0b7f86", "#1a9aa1"]);
  map.setPaintProperty("curvas-linea", "line-width",
    porZoom(9, ["case", maestra, 0.8, 0.4], 14, ["case", maestra, 1.6, 0.8]));
  // Lejos casi no se notan; al acercarse se encienden. Las finas siempre más tenues.
  map.setPaintProperty("curvas-linea", "line-opacity", neon
    ? porZoom(9, ["case", maestra, 0.45, 0.15], 12, ["case", maestra, 0.85, 0.35], 15, ["case", maestra, 1, 0.6])
    : porZoom(9, ["case", maestra, 0.3, 0.1], 12, ["case", maestra, 0.55, 0.25], 15, ["case", maestra, 0.75, 0.45]));

  map.setPaintProperty("curvas-etiquetas", "text-color", neon ? "#8ffff6" : "#0b6f75");
  map.setPaintProperty("curvas-etiquetas", "text-halo-color",
    neon ? "rgba(3, 14, 22, 0.85)" : "rgba(255, 255, 255, 0.85)");
  map.setPaintProperty("curvas-etiquetas", "text-halo-width", 1.2);
}

btnCurvas.classList.toggle("activo", curvasActivas);
btnCurvas.addEventListener("click", () => {
  curvasActivas = !curvasActivas;
  btnCurvas.classList.toggle("activo", curvasActivas);
  if (curvasActivas) agregarCurvas();
  else quitarCurvas();
});

// ---------- Ayudante de coordenadas (para agregar puntos nuevos) ----------
const coordsText = document.getElementById("coords-text");
const coordsCopy = document.getElementById("coords-copy");
let ultimaCoord = null;

map.on("click", (e) => {
  const lng = +e.lngLat.lng.toFixed(5);
  const lat = +e.lngLat.lat.toFixed(5);
  ultimaCoord = `[${lng}, ${lat}]`;
  coordsText.innerHTML = `Lat <code>${lat}</code> · Lng <code>${lng}</code> · GeoJSON: <code>${ultimaCoord}</code>`;
  coordsCopy.hidden = false;
  coordsCopy.textContent = "Copiar";
});

coordsCopy.addEventListener("click", async () => {
  if (!ultimaCoord) return;
  try {
    await navigator.clipboard.writeText(ultimaCoord);
    coordsCopy.textContent = "¡Copiado!";
  } catch {
    coordsCopy.textContent = "Seleccioná y copiá";
  }
});
