/* =========================================================
   Hey You ST · Península de Nicoya — lógica del mapa
   ========================================================= */

import { getIdioma, setIdioma, enIngles, ETAPAS_EN, txt, traducido } from "./i18n.js";
import { esc, usd, primeraFrase } from "./util.js";
import {
  CATEGORIAS, rotulo, CAT_TODAS, crearIcono, LUGARES, LIMITES_LUGARES,
  anchoMovil, margenEncuadre, sinMovimiento, TILES_SATELITE, TILES_TERRENO, ESTILOS, ESTILO,
} from "./config.js";

// ---------- Mapa ----------
const map = new maplibregl.Map({
  container: "map",
  style: ESTILOS[ESTILO].url,
  bounds: LIMITES_LUGARES,
  fitBoundsOptions: { padding: margenEncuadre(), maxZoom: 13 },
  attributionControl: { compact: true },
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "top-right");
// Juan (6-oct): abajo no va nada, ni la escala. Los créditos de los mapas sí tienen que estar
// (la licencia de OpenStreetMap lo pide), pero quedan recogidos en el botoncito ⓘ: se leen
// al tocarlo. MapLibre los abre solos al cargar; acá se cierran apenas el mapa termina.
map.once("idle", () => {
  map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
});

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
  if (cat.color) b.style.setProperty("--cat", cat.color);
  b.innerHTML =
    '<span class="capa-icono"></span><span class="capa-label"></span><span class="capa-switch"></span>';
  b.querySelector(".capa-icono").appendChild(crearIcono(cat));
  nombrarFilaCapa(b, cat);
  b.addEventListener("click", () => alternarCategoria(clave));
  return b;
}

// El nombre de la fila, en el idioma elegido (se vuelve a poner al cambiar de idioma)
function nombrarFilaCapa(b, cat) {
  b.setAttribute("aria-label", rotulo(cat)); // se ve solo el ícono (desde el 3-oct también en compu)
  b.title = rotulo(cat); // en compu, el nombre aparece al pasar el mouse
  b.querySelector(".capa-label").textContent = rotulo(cat);
}

// Deja prendida solo esa categoría, sin alternar: la usa la ficha cuando la persona cambia de
// sección, para que al salir el mapa muestre los lugares de la sección que dejó (Juan, 4-oct)
function ponerCategoria(clave) {
  if (categoriasActivas.size === 1 && categoriasActivas.has(clave)) return;
  categoriasActivas.clear();
  categoriasActivas.add(clave);
  renderMarcadores();
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
  } else if (!panel.hidden) {
    cerrarPanel();
  }
}

listaCapasEl.appendChild(crearFilaCapa("todos", CAT_TODAS, "capa-todas"));
Object.entries(CATEGORIAS).forEach(([clave, cat], i) => {
  const fila = crearFilaCapa(clave, cat);
  fila.style.setProperty("--i", i); // al abrir el mapa saltan una detrás de otra
  listaCapasEl.appendChild(fila);
});

// Refleja el estado de los interruptores y el conteo de lugares visibles.
function sincronizarCapas(visibles) {
  const todas = categoriasActivas.size === 0;
  for (const b of listaCapasEl.querySelectorAll(".capa")) {
    const clave = b.dataset.cat;
    const prendida = clave === "todos" ? todas : categoriasActivas.has(clave);
    b.setAttribute("aria-pressed", String(prendida));
  }
  conteoEl.textContent = txt("conteo", visibles);
  // Sin filtro van todos a color; con uno elegido, ese resalta y el resto se apaga
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
  nombrarMarcador(el, feature);

  el.addEventListener("click", (e) => {
    e.stopPropagation();
    abrirLugar(feature, el);
  });
  el.addEventListener("animationend", () => el.classList.remove("aparece"));

  // opacityWhenCovered: en modo 3D MapLibre atenúa los marcadores "tapados" por el terreno;
  // para una guía preferimos que siempre se vean.
  const marker = new maplibregl.Marker({ element: el, anchor: "center", opacityWhenCovered: "0.9" })
    .setLngLat(feature.geometry.coordinates);

  marcadores.push({ feature, marker, el });
}

// El nombre del lugar en el idioma elegido: al pasar el mouse, y la etiqueta del lugar
// marcado (css: .marker.marcado)
function nombrarMarcador(el, feature) {
  el.title = el.dataset.nombre = traducido(feature.properties).nombre;
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

// Juan (3-oct): al abrir no se ve ningún lugar, solo la barra de categorías. Al elegir una,
// sus lugares aparecen saltando ("pop"), uno detrás de otro de norte a sur.
function renderMarcadores() {
  const nuevos = [];
  let visibles = 0;
  for (const m of marcadores) {
    const cats = m.feature.properties.categorias;
    // El ícono muestra la PRIMERA categoría buscada que el lugar cumple (un lugar con surf
    // y niños se ve como "niños" cuando el visitante está buscando lugares para niños).
    const coincide = cats.find(c => categoriasActivas.has(c));
    // El lugar abierto o marcado (el que parpadea) se queda aunque no sea de la categoría
    // elegida: es la referencia de dónde venía la persona (Juan, 3-oct)
    const referencia = m.el.classList.contains("activo") || m.el.classList.contains("marcado");
    if (!coincide && !referencia) {
      m.marker.remove();
      m.enMapa = false;
      continue;
    }
    pintarMarcador(m.el, coincide || cats[0]);
    if (!m.enMapa) {
      m.marker.addTo(map);
      m.enMapa = true;
      nuevos.push(m);
    }
    visibles++;
  }
  nuevos.sort((a, b) => b.feature.geometry.coordinates[1] - a.feature.geometry.coordinates[1])
    .forEach((m, i) => {
      m.el.style.setProperty("--aparece-espera", `${i * 70}ms`);
      m.el.classList.add("aparece");
    });
  sincronizarCapas(visibles);
}
renderMarcadores();

// ---------- Panel de detalle ----------
const panel = document.getElementById("panel");
const panelBody = document.getElementById("panel-body");
let lugarAbierto = null; // { categorias, pintarVista } del lugar que muestra el panel
document.getElementById("panel-close").addEventListener("click", cerrarPanel);

// Portada de respaldo mientras un lugar no tenga foto propia: la vista satelital
// real del punto, de Esri World Imagery (gratis, sin API key).
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
// Cuando un lugar tiene su toma 360° ("foto360" en data/points.js), el botón "Ver foto 360°"
// de la ficha la abre a pantalla completa con un visor libre (Pannellum, ver "Modo inmersivo").
// El visor se descarga solo la primera vez que hace falta, así el mapa no carga nada extra
// para los lugares sin 360°.
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

// ---------- Texto breve según la pestaña elegida ----------
// Primero manda el texto de esa categoría; si falta, usamos la entrada corta.
// No convertimos los campos técnicos en una ficha estática dentro del panel.
function textoDeCategoria(p, cat) {
  return p.porCategoria?.[cat] || textoGeneral(p);
}

// Sin entrada todavía (ej. Villa Flor), la ficha muestra la descripción armada con lo que
// contó el local, antes que una frase genérica
function textoGeneral(p) {
  return p.entrada || p.descripcion || txt("textoGeneral");
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
// botón aparte. La pestaña cuenta el tour completo y, si lo quieren, se escribe por WhatsApp.
// Cambio de Juan (3-oct): al inicio él no va a tener tiempo de contestar, así que si el tour
// trae "local" y "whatsapp" el botón le escribe directo a ese local (comisión de palabra con
// Juan; por eso son pocos y de confianza). Si no, le escribe a Juan. Los tours y en qué
// lugares aparecen están en data/tours.js ("lugares").
// Pacto con Juan (3-oct): la pestaña se llama "Meet a local", no "Tours". La idea nace para
// hacer comunidad: lo que se ofrece es conocer a un local, no comprar un tour.
const TAB_TOURS = { label: "Meet a local", icono: "img/iconos/tours.png" };

function toursDelLugar(p) {
  return TOURS.filter(tour => tour.lugares?.includes(p.id));
}

function botonWhatsApp(mensaje, etiqueta, numero = CONTACTO_JUAN.whatsapp) {
  if (!numero) return `<span class="reservar reservar-pronto">${esc(txt("reservasPronto"))}</span>`;
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  return `<a class="reservar" href="${esc(url)}" target="_blank" rel="noopener">${esc(etiqueta)}</a>`;
}

// El mensaje ya trae los huecos de cuántos son y qué día: es lo primero que se necesita.
// "Vi en Hey You ST" no se quita: así el local (y Juan) saben que esa persona vino por la guía.
// En inglés el mensaje también sale en inglés: lo manda la persona que visita.
function htmlTour(tourOriginal) {
  const tour = traducido(tourOriginal);
  const local = tour.local && tour.whatsapp ? tour.local : null;
  return `
    <article class="tour">
      <h3>${esc(tour.titulo)}</h3>
      <p class="tour-meta">📍 ${esc(tour.salida)}<br>⏱ ${esc(tour.duracion)}</p>
      <div class="datos">${tour.incluye.map(i => `<span class="dato">${esc(i)}</span>`).join("")}</div>
      <p class="tour-texto">${esc(tour.texto)}</p>
      <p class="tour-precio${tour.precio ? "" : " a-confirmar"}">${esc(tour.precio || txt("precioAConfirmar"))}</p>
      ${botonWhatsApp(txt("mensajeTour", local || "Juan", tour.titulo),
        txt("botonTour", local || "Juan"), local ? tour.whatsapp : CONTACTO_JUAN.whatsapp)}
    </article>`;
}

// ---------- Itinerary laboratory (Juan, 24-oct) ----------
// Nació como "propuesta gratis" ("ahora tenemos la posibilidad de ofrecer propuestas gratis") y Juan lo
// llamó Itinerary laboratory. Después pidió que "pueda mostrar un producto de una vez": con lo que cuenta
// el visitante (cuántos son, presupuesto, días, qué le gusta), arma al instante un itinerario con opciones
// por día, todas al mismo precio, y lo abre en propuesta.html. Los tours salen de data/laboratorio.js
// (solo empresas locales con precio cerrado; lo arma scripts/exportar-laboratorio.js). Con ?demo en la
// dirección usa las empresas de ejemplo (data/laboratorio-demo.js, que no se publica). Si no entra nada,
// o si prefiere, le escribe a Juan para que un local se lo arme. La página no guarda nada en un servidor.
const dialogoPropuesta = document.getElementById("dialogo-propuesta");
const pg = { personas: 2, presupuesto: "", dias: 3, desde: "", gustos: new Set(), nota: "", transporte: null, planes: {} };
const PG_LIMITES = { personas: [1, 30], dias: [1, 14] };
const enDemo = new URLSearchParams(location.search).has("demo");
if (enDemo) {
  const s = document.createElement("script");
  s.src = "data/laboratorio-demo.js";
  document.head.appendChild(s);
}
const catalogoLab = () => (enDemo && typeof LABORATORIO_DEMO !== "undefined" ? LABORATORIO_DEMO
  : typeof LABORATORIO !== "undefined" ? LABORATORIO : { tours: [] });

function fechaPropuesta(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString(enIngles() ? "en-US" : "es-CR", { weekday: "long", month: "long", day: "numeric" });
}
const sumarDias = (iso, n) => {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(a, m - 1, d + n);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
};
const presupuestoPg = () => Math.round(Number(String(pg.presupuesto).replace(",", ".")) || 0);

function mensajePropuestaGratis() {
  return txt("pgMensaje", {
    n: pg.personas, pp: presupuestoPg(), d: pg.dias, desde: pg.desde ? fechaPropuesta(pg.desde) : "",
    nota: [pg.nota.trim(), transporteLab() ? txt("pgQuiereTransporte", textoTransporteLab(transporteLab())) : "",
      Object.keys(pg.planes || {}).some(d => d <= pg.dias && pg.planes[d]) ? txt("pgQuierePlanes", Array.from({ length: pg.dias }, (_, i) => i + 1).filter(d => planDia(d)).map(d => `${txt("abDia", d)}: ${nombrePlan(planDia(d)).replace(/^\S+\s/, "").toLowerCase()}`).join(", ")) : ""].filter(Boolean).join("\n"),
    gustos: [...pg.gustos].filter(k => CATEGORIAS[k]).map(k => rotulo(CATEGORIAS[k]).toLowerCase()),
  });
}
const urlPropuestaGratis = () => `https://wa.me/${CONTACTO_JUAN.whatsapp}?text=${encodeURIComponent(mensajePropuestaGratis())}`;

// Transporte (Juan, 24-oct: "que en el laboratorio y en el itinerario se le pueda sumar un carro o transporte rentado"):
// carro o cuadra por día (todos los días del viaje) o traslado por viaje (solo ida o ida y vuelta). Los vehículos salen de
// cuántos son y cuántos caben en cada uno. No es una actividad: no ocupa días, entra en el precio del paquete.
const transportesLab = () => catalogoLab().transporte || [];
function transporteLab(n = pg.personas) {
  const t = pg.transporte && transportesLab().find(x => x.t === pg.transporte.t);
  if (!t) return null;
  const v = Math.max(1, Math.ceil(n / (t.cap || n))), d = t.tipo === "traslado" ? (pg.transporte.vuelta ? 2 : 1) : pg.dias;
  const q = v * d, total = q <= t.pq.length ? t.pq[q - 1] : t.pq[t.pq.length - 1] / t.pq.length * q;
  return { t, v, d, total, pp: total / n };
}
// "3 × Cuadra (cuadraciclo) · 3 días" / "1 × Traslado aeropuerto · ida y vuelta"
function textoTransporteLab(tr) {
  const nombre = (enIngles() && tr.t.en) || tr.t.es;
  return `${tr.v} × ${nombre} · ${tr.t.tipo === "traslado" ? txt(tr.d >= 2 ? "trIdaVuelta" : "trIda") : txt("trDias", tr.d)}`;
}
// En el link: el transporte, cuántos vehículos y por cuántos días o viajes (t: su id, para cargarlo en el sistema)
function trPayloadLab() {
  const tr = transporteLab();
  return tr ? { tr: Object.assign({ t: tr.t.t, es: tr.t.es }, tr.t.en ? { en: tr.t.en } : {}, { tipo: tr.t.tipo, v: tr.v, d: tr.d }, tr.t.sa ? { sa: tr.t.sa } : {}) } : {};
}

// Lo que paga cada persona en un tour, con n personas y k tours en el paquete (grupos de más de 20, como 20)
const precioLab = (t, n, k) => {
  const fila = t.pp[Math.min(n, t.pp.length) - 1];
  return fila ? fila[Math.min(k, fila.length) - 1] : null;
};
// Lugares libres de un tour un día, de la foto que trae el catálogo (Juan: "conectar disponibilidad por aquello de
// sobreventa"). Sin el día, no hay límite cargado. La reserva se confirma igual en el sistema, que frena si ya no hay.
const libresLab = (t, iso) => (t.lib && t.lib[iso] !== undefined ? t.lib[iso] : Infinity);
// El plan que la persona eligió para un día (Juan, 24-oct: "las personas podrán poner los días que estarán, el
// presupuesto y planes para cada día"): una categoría del mapa (surf, playa, naturaleza…), "libre" (sin tours: va
// una playa) o "" (lo que recomiende el laboratorio). Un día con plan solo lleva tours de ese plan.
const planDia = (d) => (pg.planes || {})[d] || "";
const vaEnElPlan = (t, d) => { const p = planDia(d); return p !== "libre" && (!p || (t.g || []).includes(p)); };
// Un tour de día completo va solo; los de medio día, hasta dos por día, con lugar y en el plan del día. Primero el día
// cuyo plan es justo ese tour, después el menos cargado
function diasLab(tours, dias, cabe) {
  const carga = Array(dias).fill(0), dia = [];
  const orden = tours.map((t, i) => ({ i, peso: t.dc ? 2 : 1 })).sort((a, b) => b.peso - a.peso);
  for (const { i, peso } of orden) {
    let mejor = -1;
    const pref = (d) => (planDia(d + 1) && planDia(d + 1) !== "libre" ? 1 : 0);
    for (let d = 0; d < dias; d++) if (carga[d] + peso <= 2 && cabe(tours[i], d + 1) && (mejor < 0 || pref(d) > pref(mejor) || (pref(d) === pref(mejor) && carga[d] < carga[mejor]))) mejor = d;
    if (mejor < 0) return null;
    carga[mejor] += peso;
    dia[i] = mejor + 1;
  }
  return dia;
}

// Lo que el laboratorio puede usar para el grupo: los tours que salen para esa cantidad, si un tour cabe un día (en su
// plan y con lugar) y hasta cuántas actividades arma (dos por día con tours, cinco como mucho)
function reglasLab() {
  const tr = transporteLab(), n = pg.personas;
  const tours = (catalogoLab().tours || []).filter(t => precioLab(t, n, 1) !== null);
  const cabe = (t, d) => vaEnElPlan(t, d) && (!pg.desde || libresLab(t, sumarDias(pg.desde, d - 1)) >= n);
  const diasConTours = Array.from({ length: pg.dias }, (_, i) => i + 1).filter(d => planDia(d) !== "libre");
  const tope = Math.min(tours.length > 18 ? 4 : 5, diasConTours.length * 2, tours.length);
  return { tr, n, tours, cabe, diasConTours, tope };
}
// Pasa por cada combinación de hasta `tope` tours
function combinacionesLab(tours, tope, visitar) {
  const sumar = (desde, actual) => {
    if (actual.length) visitar(actual);
    if (actual.length >= tope) return;
    for (let i = desde; i < tours.length; i++) sumar(i + 1, actual.concat([tours[i]]));
  };
  sumar(0, []);
}

// El itinerario: la combinación que entra en el presupuesto con más actividades y más de lo que le gusta,
// y para cada actividad hasta dos opciones más del mismo tipo de día que entran aunque elija lo más caro.
// El precio del paquete cubre la combinación más cara y nunca pasa del presupuesto: si sobra, se le dice.
// masActividades (la barra del budget): primero la mayor cantidad de actividades, después el plan y los gustos.
function armarItinerario(presupuesto = presupuestoPg(), masActividades = false) {
  // Con transporte, las actividades usan lo que queda del presupuesto después del transporte
  const { tr, n, tours, cabe, diasConTours, tope } = reglasLab();
  const b = presupuesto - (tr ? tr.pp : 0);
  if (!tours.length || b <= 0) return null;
  // Un día con plan también cuenta como algo que le gusta
  const gustos = new Set([...pg.gustos, ...Object.values(pg.planes || {}).filter(p => p && p !== "libre")]);
  const gusta = t => (t.g || []).filter(c => gustos.has(c)).length;
  const planeados = diasConTours.filter(d => planDia(d));
  // Primero que cada día con plan tenga lo suyo; después más actividades y más de lo que le gusta
  const cubiertos = c => planeados.filter(d => c.dia.includes(d)).length;
  const puntaje = masActividades ? c => [c.tours.length, cubiertos(c), c.gusto, c.costo]
    : c => [cubiertos(c), c.tours.length + c.gusto, c.gusto, c.costo];
  const mejorQue = (a, z) => { for (let i = 0; i < a.length; i++) if (a[i] !== z[i]) return a[i] > z[i]; return false; };
  let mejor = null;
  combinacionesLab(tours, tope, (lista) => {
    const k = lista.length;
    const costo = lista.reduce((s, t) => s + (precioLab(t, n, k) ?? Infinity), 0);
    if (costo > b + 0.005) return;
    const dia = diasLab(lista, pg.dias, cabe);
    if (!dia) return;
    const c = { tours: lista, dia, costo, gusto: lista.reduce((s, t) => s + gusta(t), 0) };
    if (!mejor || mejorQue(puntaje(c), puntaje(mejor))) mejor = c;
  });
  if (!mejor) return null;
  const k = mejor.tours.length, p = t => precioLab(t, n, k) ?? Infinity;
  const usados = new Set(mejor.tours.map(t => t.t));
  const slots = mejor.tours.map((t, i) => ({ dia: mejor.dia[i], opciones: [t] })).sort((a, z) => a.dia - z.dia);
  let holgura = b - mejor.costo;
  slots.forEach((sl, i) => {
    const base = sl.opciones[0], techo = p(base) + holgura / (slots.length - i);
    tours.filter(t => !usados.has(t.t) && t.dc === base.dc && p(t) <= techo + 0.005 && cabe(t, sl.dia))
      .sort((x, z) => gusta(z) - gusta(x) || Math.abs(p(x) - p(base)) - Math.abs(p(z) - p(base)))
      .slice(0, 2).forEach(t => { usados.add(t.t); sl.opciones.push(t); });
    holgura -= Math.max(...sl.opciones.map(p)) - p(base);
  });
  const precio = Math.ceil((Math.min(b, Math.ceil(slots.reduce((s, sl) => s + Math.max(...sl.opciones.map(p)), 0))) + (tr ? tr.pp : 0)) * 100) / 100;
  const dias = [];
  slots.forEach(sl => {
    let d = dias.find(x => x.dia === sl.dia);
    if (!d) { d = { dia: sl.dia, s: [] }; dias.push(d); }
    d.s.push(sl.opciones.map(t => opcionLab(t, [])));
  });
  return itinerarioLab(dias, precio, presupuesto);
}
// Lo que viaja en el link de cada opción: su nombre, cómo es, su id y los extras que el cliente le sumó
function opcionLab(t, extras) {
  const sv = (t.sv || []).filter(s => extras.includes(s.i));
  return Object.assign(Object.fromEntries(["es", "en", "du", "sa", "inc", "t"].filter(c => t[c]).map(c => [c, t[c]])),
    sv.length ? { x: sv.map(s => s.es), xi: sv.map(s => s.i) } : {}, sv.length && sv.every(s => s.en) ? { xe: sv.map(s => s.en) } : {});
}
// Días libres para conocer (Juan, 24-oct: "también en el laboratorio se pueden recomendar días free de playa" y "en
// esos días vamos a agregar opciones gratuitas para que las personas conozcan"): cada día sin actividad trae hasta
// tres lugares gratis del mapa para elegir uno, con lo que cuenta un local (data/points.js, los que tienen
// `gratis: true`). Primero los del plan de ese día y los que le gustan; entre días no se repiten mientras alcancen.
// Rutas a pie (Juan, 27-oct: "nuestra primera ruta para agregar en el laboratorio... una actividad low budget"):
// varias paradas gratis en orden, de data/rutas.js. En un día libre son una opción más y van antes que los lugares
// sueltos; ese día sus paradas no salen también como opción aparte.
const RUTAS_LAB = (typeof RUTAS !== "undefined" ? RUTAS : []).map(r => ({ properties: {
  id: r.id, nombre: r.nombre, entrada: r.entrada, icono: r.icono, ruta: r,
  categorias: r.categorias.filter(c => CATEGORIAS[c]), en: r.en && { nombre: r.en.nombre, entrada: r.en.entrada } } }));
const paradasRuta = (f) => (f.properties.ruta ? f.properties.ruta.paradas.map(p => p.lugar).filter(Boolean) : []);
function gratisLibres(vacios) {
  const lugares = RUTAS_LAB.concat(LUGARES.filter(f => f.properties.gratis));
  const veces = new Map(), id = f => f.properties.id || f.properties.nombre;
  return vacios.map(d => {
    const plan = planDia(d);
    const puntaje = f => {
      const c = f.properties.categorias;
      return (plan && plan !== "libre" && c.includes(plan) ? 4 : 0) + c.filter(x => pg.gustos.has(x)).length
        + (f.properties.ruta ? 1 : 0) - 3 * (veces.get(id(f)) || 0);
    };
    const opciones = [];
    for (const f of lugares.slice().sort((a, z) => puntaje(z) - puntaje(a))) {
      if (opciones.length >= 3) break;
      const ya = new Set(opciones.flatMap(o => [id(o), ...paradasRuta(o)]));
      if (!ya.has(id(f)) && !paradasRuta(f).some(p => ya.has(p))) opciones.push(f);
    }
    opciones.forEach(f => veces.set(id(f), (veces.get(id(f)) || 0) + 1));
    return opciones;
  });
}
// El ícono del lugar en el día libre: cascada, playa, naturaleza o atardecer, lo primero que tenga. Una ruta trae el suyo
const iconoLibre = (cats) => (CATEGORIAS[["cascada", "playa", "naturaleza", "atardecer"].find(c => cats.includes(c))] || {}).emoji || "📍";
const iconoDe = (p) => p.icono || iconoLibre(p.categorias);
// A qué hora llegar a la parada que manda la marea (ej. Playa Grande, con la marea baja y en la mañana o la tarde por
// el sol), si el día del viaje cae en el pronóstico de Open-Meteo (8 días). La marea se pide al abrir el laboratorio;
// sin fecha o sin pronóstico, la propuesta dice la regla del local. hm: [[desde, hasta]] en minutos del día, hora tica.
const mareasRutas = new Map();
function prepararMareasRutas() {
  RUTAS_LAB.forEach(({ properties: { id, ruta } }) => {
    const f = ruta.marea && POINTS.features.find(x => x.properties.id === ruta.marea.lugar);
    if (!f || mareasRutas.has(id)) return;
    const [lng, lat] = f.geometry.coordinates;
    cargarMareas(lng, lat).then(m => mareasRutas.set(id, { m, lng, lat })).catch(() => {});
  });
}
function horasRuta(r, iso) {
  const datos = mareasRutas.get(r.id), dia = iso ? Date.parse(iso + "T00:00Z") : NaN;
  if (!datos || !r.marea || isNaN(dia) || dia < datos.m.t[0] || dia > datos.m.t[datos.m.t.length - 1] - DIA / 2) return {};
  const v = ventanasIdeales({ marea: r.marea.tipo, ventana: r.marea.ventana, horas: r.marea.horas }, datos.m, datos.lng, datos.lat)
    .filter(x => x.ini >= dia && x.ini < dia + DIA);
  return { hm: v.map(x => [Math.round((x.ini - dia) / 60e3), Math.round((x.fin - dia) / 60e3)]) };
}
// Lo que viaja en el link de cada lugar de un día libre: su nombre, su primera frase local y su ícono, en los dos idiomas.
// Una ruta lleva además su id (ru: propuesta.html saca las paradas de data/rutas.js) y la hora de llegar ese día (hm)
function diaLibreLab(f, iso) {
  const p = f.properties, en = p.en || {};
  return Object.assign({ n: p.nombre, t: primeraFrase(p.entrada), i: iconoDe(p) },
    en.nombre ? { ne: en.nombre } : {}, en.entrada ? { te: primeraFrase(en.entrada) } : {},
    p.ruta ? Object.assign({ ru: p.id }, horasRuta(p.ruta, iso)) : {});
}
// El itinerario para propuesta.html: cada día con su número (dn), y los días sin actividad como días libres con
// lugares gratis para elegir (libres)
function itinerarioLab(dias, precio, presupuesto = presupuestoPg()) {
  const hoy = new Date();
  const vacios = Array.from({ length: pg.dias }, (_, i) => i + 1).filter(d => !dias.some(x => x.dia === d));
  gratisLibres(vacios).forEach((lugares, i) => {
    if (lugares.length) dias.push({ dia: vacios[i], s: [], libres: lugares.map(f => diaLibreLab(f, pg.desde ? sumarDias(pg.desde, vacios[i] - 1) : null)) });
  });
  return Object.assign({
    v: 1, c: `HYL-${String(hoy.getMonth() + 1).padStart(2, "0")}${String(hoy.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`,
    n: pg.personas, pp: precio, b: presupuesto, i: getIdioma(), lab: 1, ...trPayloadLab(),
    d: dias.sort((a, z) => a.dia - z.dia).map(x => Object.assign(pg.desde ? { f: sumarDias(pg.desde, x.dia - 1) } : {}, { dn: x.dia, s: x.s }, x.libres ? { libres: x.libres } : {})),
  }, enDemo ? { ej: 1 } : {});
}
function linkItinerario(p) {
  let bin = "";
  new TextEncoder().encode(JSON.stringify(p)).forEach(c => { bin += String.fromCharCode(c); });
  return "propuesta.html#p=" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ---------- Lo arma el cliente (Juan, 24-oct) ----------
// "Las personas podrán crear sus propios tours: seleccionar el budget, la cantidad de personas, la cantidad de
// días y agregar opciones; el mismo sistema tira lo que está disponible". En el mismo diálogo, después del
// formulario: elige un día y ve solo lo que tiene lugar ese día para su grupo, cabe en el día y entra en lo que
// le queda del presupuesto. Suma actividades y sus extras; ve cuánto lleva y cuánto le queda, no el precio de
// cada cosa. Paga lo que vale lo que armó, con "más tours, más barato". Igual que el laboratorio del sistema.
const ab = { mios: [], dia: 1 };
let enArmado = false;
const tourLab = (id) => (catalogoLab().tours || []).find(t => t.t === id);
const pesoLab = (t) => (t && t.dc ? 2 : 1);
const duracionLab = (s) => (!s || !enIngles() ? s || "" : String(s)
  .replace(/día completo/i, "full day").replace(/medio día/i, "half day")
  .replace(/(\d+)\s*horas?\s*y\s*media/i, (_, h) => `${h}.5 hours`).replace(/(\d+)\s*[–-]\s*(\d+)\s*horas/i, "$1–$2 hours")
  .replace(/(\d+)\s*horas?/i, (_, h) => `${h} ${h === "1" ? "hour" : "hours"}`));
// Lo que paga cada persona por lo que armó (null si algo ya no sirve para el grupo)
function cuentaArmado(mios) {
  const n = pg.personas, k = mios.length, tr = transporteLab();
  let total = tr ? tr.total : 0;
  for (const m of mios) {
    const t = tourLab(m.t), p = t && precioLab(t, n, k);
    if (p === null || p === undefined) return null;
    total += p * n + (t.sv || []).filter(s => m.x.includes(s.i)).reduce((s, x) => s + x.p * (x.u === "persona" ? n : 1), 0);
  }
  return Math.ceil(total / n * 100) / 100;
}
const cargaDia = (d) => ab.mios.filter(m => m.dia === d).reduce((s, m) => s + pesoLab(tourLab(m.t)), 0);
const fechaDia = (d) => (pg.desde ? sumarDias(pg.desde, d - 1) : "");
function pintarArmado(foco) {
  const n = pg.personas, b = presupuestoPg();
  ab.mios = ab.mios.filter(m => m.dia <= pg.dias && tourLab(m.t));
  if (ab.dia > pg.dias) ab.dia = 1;
  // Se elige para un día con lugar y que no sea libre
  const conLugarDia = (d) => cargaDia(d) < 2 && planDia(d) !== "libre";
  if (!conLugarDia(ab.dia)) ab.dia = Array.from({ length: pg.dias }, (_, i) => i + 1).find(conLugarDia) || ab.dia;
  const trA = transporteLab();
  const lleva = ab.mios.length || trA ? cuentaArmado(ab.mios) ?? 0 : 0, queda = Math.round((b - lleva) * 100) / 100;
  const usado = b ? Math.min(100, Math.round(lleva / b * 100)) : 0;
  const nombre = (t) => (enIngles() && t.en) || t.es;
  const meta = (t) => [duracionLab(t.du), t.sa].filter(Boolean).join(" · ");
  const extraNombre = (s) => (enIngles() && s.en) || s.es;
  // Lo disponible para el día elegido: cabe en el día, tiene lugar para el grupo y no está ya ese día
  const libre = 2 - cargaDia(ab.dia);
  const candidatos = (catalogoLab().tours || []).filter(t => precioLab(t, n, 1) !== null && pesoLab(t) <= libre && !ab.mios.some(m => m.dia === ab.dia && m.t === t.t));
  const conLugar = candidatos.filter(t => !pg.desde || libresLab(t, fechaDia(ab.dia)) >= n);
  // Sin presupuesto (llegó desde "Probá el precio"), todo entra y solo se ve cuánto lleva
  const disponibles = conLugar.map(t => ({ t, entra: !b || (cuentaArmado(ab.mios.concat([{ t: t.t, dia: ab.dia, x: [] }])) ?? Infinity) <= b + 0.005,
    gusta: (t.g || []).some(c => pg.gustos.has(c)), plan: !!planDia(ab.dia) && (t.g || []).includes(planDia(ab.dia)) }))
    .sort((x, z) => z.entra - x.entra || z.plan - x.plan || z.gusta - x.gusta || nombre(x.t).localeCompare(nombre(z.t)));
  const dias = Array.from({ length: pg.dias }, (_, i) => i + 1);
  // Los días que siguen vacíos traen lugares gratis para conocer; uno se elige en el itinerario
  const vacios = dias.filter(d => !ab.mios.some(m => m.dia === d));
  const gratis = gratisLibres(vacios);
  const gratisDe = (d) => (gratis[vacios.indexOf(d)] || []).map(f => traducido(f.properties));
  dialogoPropuesta.classList.add("ancho");
  dialogoPropuesta.innerHTML = `
    <form method="dialog" class="pg">
      <button type="submit" class="pg-cerrar" aria-label="${esc(txt("cerrar"))}">✕</button>
      <h2 id="pg-titulo">${esc(txt("abTitulo"))}</h2>
      ${enDemo ? `<p class="pg-demo">${esc(txt("pgDemo"))}</p>` : ""}
      <div class="ab-cuenta" aria-live="polite">
        <span class="ab-precio">${esc(usd(lleva))}</span> <span class="ab-suave">${esc(txt("porPersonaLab"))}</span>
        <div class="ab-barra" role="img" aria-label="${esc(txt("abUsado", usado))}"><span style="width:${usado}%"${queda < 0 ? ' class="pasado"' : ""}></span></div>
        <span class="${b && queda < 0 ? "ab-alerta" : "ab-acento"}">${esc(!b ? txt("abSinPresupuesto") : queda < 0 ? txt("abTePasas", usd(-queda), usd(b)) : txt("abTeQuedan", usd(queda), usd(b)))}${ab.mios.length > 1 ? " " + esc(txt("abMasBarato", ab.mios.length)) : ""}</span>
      </div>
      ${trA ? `<div class="ab-act"><span class="ab-act-txt"><b>🚙 ${esc(txt("abTransporte"))}</b><span>${esc(textoTransporteLab(trA))}</span>${trA.t.sa ? `<span class="ab-suave">${esc(trA.t.sa)}</span>` : ""}</span></div>` : ""}
      ${dias.map(d => {
        const del = ab.mios.filter(m => m.dia === d), lleno = cargaDia(d) >= 2;
        return `<section class="ab-dia${d === ab.dia ? " sel" : ""}" aria-label="${esc(txt("abDia", d))}">
          <div class="ab-dia-top"><b>${esc(txt("abDia", d))}${pg.desde ? ` <span class="ab-suave">${esc(fechaPropuesta(fechaDia(d)))}</span>` : ""}</b>
            ${planDia(d) ? `<span class="ab-plan">${esc(txt("abPlan", nombrePlan(planDia(d))))}</span>` : ""}
            ${planDia(d) === "libre" ? "" : d === ab.dia ? `<span class="ab-acento">${esc(txt("abEligiendo"))}</span>`
              : !lleno ? `<button type="button" class="ab-mas" data-ab="dia" data-d="${d}">${esc(txt("abAgregarDia"))}</button>` : `<span class="ab-suave">${esc(txt("abDiaCompleto"))}</span>`}</div>
          ${!del.length ? (gratisDe(d).length ? `<span class="ab-playa">${esc(txt("libreGratis"))}</span><span class="ab-suave">${gratisDe(d).map(p => `${esc(iconoDe(p))} ${esc(p.nombre)}`).join(" · ")}</span>`
            : `<span class="ab-suave">${esc(txt("abLibre"))}</span>`) : del.map(m => { const t = tourLab(m.t); return `<div class="ab-act">
            <span class="ab-act-txt"><b>${esc(nombre(t))}</b><span class="ab-suave">${esc(meta(t))}</span>
              ${(t.sv || []).length ? `<span class="ab-extras">${t.sv.map(s => `<button type="button" class="ab-extra" data-ab="extra" data-k="${esc(m.k)}" data-x="${esc(s.i)}" aria-pressed="${m.x.includes(s.i)}">${m.x.includes(s.i) ? "✓" : "+"} ${esc(extraNombre(s))}</button>`).join("")}</span>` : ""}</span>
            <button type="button" class="ab-quitar" data-ab="quitar" data-k="${esc(m.k)}" aria-label="${esc(txt("abQuitar", nombre(t)))}">✕</button>
          </div>`; }).join("")}
        </section>`;
      }).join("")}
      <h3 class="ab-h">${esc(txt("abDisponible", ab.dia, pg.desde ? " · " + fechaPropuesta(fechaDia(ab.dia)) : ""))}</h3>
      ${libre <= 0 ? `<p class="ab-suave">${esc(txt("abDiaLleno"))}</p>`
        : !disponibles.length ? `<p class="ab-suave">${esc(txt("abNada"))}</p>`
        : `<div class="ab-lista">${disponibles.map(({ t, entra, gusta, plan }) => `<div class="ab-op${entra ? "" : " no"}">
            <span class="ab-act-txt"><b>${esc(nombre(t))}</b><span class="ab-suave">${esc(meta(t))}${t.dc && !/día completo/i.test(t.du || "") ? " · " + esc(txt("abDiaEntero")) : ""}</span>
              ${plan ? `<span class="ab-acento">✓ ${esc(txt("abVaConTuPlan"))}</span>` : gusta ? `<span class="ab-acento">✨ ${esc(txt("abLeGusta"))}</span>` : ""}</span>
            ${entra ? `<button type="button" class="ab-agregar" data-ab="agregar" data-tour="${esc(t.t)}">${esc(txt("abAgregar"))}</button>` : `<span class="ab-suave">${esc(txt("abNoEntra"))}</span>`}
          </div>`).join("")}</div>`}
      ${candidatos.length > conLugar.length ? `<p class="ab-suave">${esc(txt("abSinLugar", candidatos.length - conLugar.length))}</p>` : ""}
      <button type="button" class="reservar pg-armar" data-ab="ver"${ab.mios.length || trA ? "" : " disabled"}>${esc(txt("abVer"))}</button>
      <button type="button" class="pg-secundario ab-volver" data-ab="volver">${esc(txt("abVolver"))}</button>
    </form>`;
  if (foco) dialogoPropuesta.querySelector(foco)?.focus();
}
// Lo que armó, como itinerario para propuesta.html (una opción por actividad)
function itinerarioArmado() {
  const dias = [];
  ab.mios.forEach(m => {
    let d = dias.find(x => x.dia === m.dia);
    if (!d) { d = { dia: m.dia, s: [] }; dias.push(d); }
    d.s.push([opcionLab(tourLab(m.t), m.x)]);
  });
  return itinerarioLab(dias, cuentaArmado(ab.mios));
}
function accionArmado(b) {
  const a = b.dataset.ab;
  if (a === "dia") { ab.dia = Number(b.dataset.d); pintarArmado(".ab-agregar, .ab-volver"); return; }
  if (a === "agregar") {
    ab.mios.push({ k: Math.random().toString(36).slice(2, 8), t: b.dataset.tour, dia: ab.dia, x: [] });
    // Si el día se llenó, pasa al próximo día con lugar
    if (cargaDia(ab.dia) >= 2) { const sig = Array.from({ length: pg.dias }, (_, i) => i + 1).find(d => cargaDia(d) < 2); if (sig) ab.dia = sig; }
    guardarPg(); pintarArmado(".ab-agregar, .ab-volver"); return;
  }
  if (a === "quitar") { ab.mios = ab.mios.filter(m => m.k !== b.dataset.k); guardarPg(); pintarArmado(".ab-volver"); return; }
  if (a === "extra") {
    const m = ab.mios.find(x => x.k === b.dataset.k), x = b.dataset.x;
    if (m) m.x = m.x.includes(x) ? m.x.filter(y => y !== x) : m.x.concat([x]);
    guardarPg(); pintarArmado(`[data-k="${b.dataset.k}"][data-x="${x}"]`); return;
  }
  if (a === "ver") { guardarPg(); location.href = linkItinerario(itinerarioArmado()); return; }
  if (a === "volver") { enArmado = false; dialogoPropuesta.classList.remove("ancho"); pintarPropuestaGratis(); dialogoPropuesta.querySelector("#pg-armar-yo")?.focus(); }
}

// ---------- Probá el precio de un tour (Juan, 24-oct) ----------
// "La persona podrá escoger un tour y experimentar el precio por persona dependiendo de la cantidad de personas".
// Elige un tour y cambia cuántos son: ve lo que paga cada persona, cómo baja con el grupo y cuánto más baja si lo
// suma a un paquete con más tours. De ahí puede arrancar su itinerario con ese tour.
const simu = { t: "", n: 0 };
let enPrecios = false;
const TAMANOS_SIMU = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
function pintarPrecios(foco) {
  const tours = (catalogoLab().tours || []).filter(t => t.pp.some(Boolean));
  if (!simu.n) simu.n = pg.personas;
  const t = tours.find(x => x.t === simu.t) || tours.find(x => (x.g || []).some(c => pg.gustos.has(c))) || tours[0];
  if (!t) return;
  simu.t = t.t;
  const nombre = (x) => (enIngles() && x.en) || x.es;
  const pp = precioLab(t, simu.n, 1);
  let antes = null;
  const filas = TAMANOS_SIMU.map(n => ({ n, p: precioLab(t, n, 1) })).filter(f => f.p !== null && f.p !== undefined).map(f => {
    const baja = antes !== null && f.p < antes - 0.005;
    antes = f.p;
    return Object.assign(f, { baja });
  });
  dialogoPropuesta.classList.add("ancho");
  dialogoPropuesta.innerHTML = `
    <form method="dialog" class="pg">
      <button type="submit" class="pg-cerrar" aria-label="${esc(txt("cerrar"))}">✕</button>
      <h2 id="pg-titulo">${esc(txt("ppTitulo"))}</h2>
      ${enDemo ? `<p class="pg-demo">${esc(txt("pgDemo"))}</p>` : ""}
      <p class="pg-intro">${esc(txt("ppIntro"))}</p>
      <label class="pg-campo"><span class="pg-etiqueta">${esc(txt("ppTour"))}</span>
        <select id="pp-tour">${tours.map(x => `<option value="${esc(x.t)}"${x.t === t.t ? " selected" : ""}>${esc(nombre(x))}</option>`).join("")}</select></label>
      <span class="ab-suave">${esc([duracionLab(t.du), t.sa, t.inc].filter(Boolean).join(" · "))}</span>
      <div class="pg-campo">
        <span class="pg-etiqueta" id="pp-n-l">${esc(txt("pgPersonas"))}</span>
        <div class="pg-paso" role="group" aria-labelledby="pp-n-l">
          <button type="button" data-sim="menos" aria-label="${esc(txt("pgMenos", txt("pgPersonas")))}">−</button>
          <output aria-live="polite">${simu.n}</output>
          <button type="button" data-sim="mas" aria-label="${esc(txt("pgMas", txt("pgPersonas")))}">+</button>
        </div>
      </div>
      <div class="ab-cuenta" aria-live="polite">
        ${pp === null || pp === undefined ? `<span class="ab-alerta">${esc(txt("ppNoSale", simu.n))}</span>`
          : `<span><span class="ab-precio">${esc(usd(pp))}</span> <span class="ab-suave">${esc(txt("porPersonaLab"))} · ${esc(txt("ppTotal", usd(pp * simu.n)))}</span></span>
             ${[2, 3, 4].map(k => ({ k, p: precioLab(t, simu.n, k) })).filter(x => x.p !== null && x.p < pp - 0.005).slice(-1).map(x => `<span class="ab-acento">${esc(txt("ppPaquete", x.k, usd(x.p)))}</span>`).join("")}`}
      </div>
      <h3 class="ab-h">${esc(txt("ppComo"))}</h3>
      <div class="pp-tabla" role="list">${filas.map(f => `<div class="pp-fila${f.n === simu.n ? " actual" : ""}" role="listitem">
        <span>${esc(txt("ppFila", f.n))}</span><b>${esc(usd(f.p))}</b>${f.baja ? `<span class="ab-acento">↓ ${esc(txt("ppBaja"))}</span>` : "<span></span>"}</div>`).join("")}</div>
      <button type="button" class="reservar pg-armar" data-sim="armar"${pp === null || pp === undefined ? " disabled" : ""}>${esc(txt("ppArmar"))}</button>
      <button type="button" class="pg-secundario ab-volver" data-sim="volver">${esc(txt("abVolver"))}</button>
    </form>`;
  if (foco) dialogoPropuesta.querySelector(foco)?.focus();
}
function accionPrecios(b) {
  const a = b.dataset.sim;
  if (a === "menos" || a === "mas") { simu.n = Math.min(PG_LIMITES.personas[1], Math.max(1, simu.n + (a === "mas" ? 1 : -1))); pintarPrecios(`[data-sim="${a}"]`); return; }
  if (a === "volver") { enPrecios = false; dialogoPropuesta.classList.remove("ancho"); pintarPropuestaGratis(); dialogoPropuesta.querySelector("#pg-probar")?.focus(); return; }
  if (a === "armar") {
    // Arranca su itinerario con ese tour el día 1, para ese grupo
    pg.personas = simu.n;
    if (!ab.mios.some(m => m.t === simu.t)) ab.mios.push({ k: Math.random().toString(36).slice(2, 8), t: simu.t, dia: 1, x: [] });
    enPrecios = false; enArmado = true; guardarPg(); pintarArmado("#pg-titulo");
  }
}

// ---------- Más budget, más actividades (Juan, 24-oct) ----------
// "Quiero que haya una parte donde solo aparezca una barra donde las personas puedan ver que mientras más budget por
// persona, más actividades para hacer; el mismo laboratorio con opciones diferentes". Mueve la barra y el laboratorio
// arma al instante lo más que entra. Debajo de la barra se ve desde cuánto entra cada actividad más. Cada actividad
// trae sus opciones y se elige una ("me gustó mucho que las personas pueden seleccionar una de varias opciones por
// día"); todas salen al mismo precio. Usa el plan de cada día, los gustos, la fecha y el transporte del formulario.
// "Solo 1" (Juan, 24-oct: "que la persona sea capaz de agregar 'si quiero solo hacer una actividad', y con el número
// de personas se ven precios más económicos"): la barra muestra las actividades que entran en su budget, cada una con
// lo que paga cada persona de su grupo, y paga la que elige. Al sumar personas, esos precios bajan.
const barra = { b: 0, sel: {}, p: null, niveles: [], cuantas: 0, ops: [] };
let enBarra = false;
const BARRA_PASO = 5;
const LETRAS_LAB = "ABCDEFGHIJKLMNOP";
// Desde cuánto por persona entran 1, 2, 3… actividades en los días del viaje (con lugar y en el plan de cada día),
// en pasos de la barra. Si dos niveles caen en el mismo paso, queda el de más actividades.
function escaleraLab() {
  const { tr, n, tours, cabe, tope } = reglasLab();
  const minimo = [];
  combinacionesLab(tours, tope, (lista) => {
    const k = lista.length, costo = lista.reduce((s, t) => s + (precioLab(t, n, k) ?? Infinity), 0);
    if (costo < (minimo[k] ?? Infinity) && diasLab(lista, pg.dias, cabe)) minimo[k] = costo;
  });
  const niveles = [];
  minimo.forEach((c, k) => niveles.push({ k, desde: Math.ceil((c + (tr ? tr.pp : 0)) / BARRA_PASO) * BARRA_PASO }));
  return niveles.filter((x, i) => !niveles.slice(i + 1).some(y => y.desde <= x.desde));
}
// Solo 1: cada actividad que sale para el grupo, el primer día en que cabe y lo que paga cada persona (con transporte),
// de la más barata a la más cara
function unaLab() {
  const { tr, n, tours, cabe } = reglasLab();
  return tours.map(t => {
    const dia = Array.from({ length: pg.dias }, (_, i) => i + 1).find(d => cabe(t, d));
    return dia ? { t, dia, pp: Math.ceil((precioLab(t, n, 1) + (tr ? tr.pp : 0)) * 100) / 100 } : null;
  }).filter(Boolean).sort((a, z) => a.pp - z.pp);
}
// Solo 1: desde cuánto se ven 1, 2, 3… opciones
function nivelesUna(ops) {
  const niveles = [];
  ops.forEach((o, i) => {
    const desde = Math.ceil(o.pp / BARRA_PASO) * BARRA_PASO, ult = niveles[niveles.length - 1];
    if (ult && ult.desde === desde) ult.k = i + 1; else niveles.push({ k: i + 1, desde });
  });
  return niveles;
}
// El itinerario para el budget de la barra. Con "Solo 1", la actividad elegida (si no eligió, la que más le gusta y
// mejor entra) a su propio precio, y los demás días libres con lugares gratis
function armarBarra() {
  if (barra.cuantas !== 1) { barra.p = armarItinerario(barra.b, true); return; }
  barra.ops = unaLab().filter(o => o.pp <= barra.b + 0.005);
  if (!barra.ops.length) { barra.p = null; return; }
  const gustos = new Set([...pg.gustos, ...Object.values(pg.planes || {}).filter(p => p && p !== "libre")]);
  const gusta = o => (o.t.g || []).filter(c => gustos.has(c)).length;
  const elegida = barra.ops.find(o => o.t.t === barra.sel.una) || barra.ops.slice().sort((a, z) => gusta(z) - gusta(a) || z.pp - a.pp)[0];
  barra.sel.una = elegida.t.t;
  barra.p = itinerarioLab([{ dia: elegida.dia, s: [[opcionLab(elegida.t, [])]] }], elegida.pp, barra.b);
}
// Lo que pagaría cada persona por lo mismo con un grupo más grande (Juan: "con el número de personas se ven precios
// más económicos"): el primer tamaño, hasta 5 personas más, en que baja
function conUnoMas(p) {
  const actividades = p.d.flatMap(d => d.s), k = actividades.length;
  for (let n = pg.personas + 1; n <= Math.min(pg.personas + 5, PG_LIMITES.personas[1]); n++) {
    const tr = transporteLab(n);
    let suma = 0;
    for (const s of actividades) {
      const precios = s.map(o => { const t = tourLab(o.t); return t ? precioLab(t, n, k) : null; });
      if (precios.some(x => x === null || x === undefined)) return null;
      suma += Math.max(...precios);
    }
    const pp = Math.ceil((suma + (tr ? tr.pp : 0)) * 100) / 100;
    if (pp < p.pp - 0.5) return { n, pp };
  }
  return null;
}
function avisoBarra() {
  if (!(catalogoLab().tours || []).length) return txt("pgSinTours");
  if (Array.from({ length: pg.dias }, (_, i) => i + 1).every(d => planDia(d) === "libre")) return txt("pgTodoLibre");
  return txt("bbSinLugar");
}
// La opción elegida de cada actividad ("día-actividad"); si ya no está entre las opciones, la primera
const elegidaBarra = (clave, s) => Math.max(0, s.findIndex(o => o.t === barra.sel[clave]));
// El lugar gratis elegido de un día libre ("día-libre")
const libreElegido = (d) => Math.max(0, (d.libres || []).findIndex(l => l.n === barra.sel[`${d.dn}-libre`]));
function pintarBarra(foco) {
  const una = barra.cuantas === 1;
  const niveles = barra.niveles = una ? nivelesUna(unaLab()) : escaleraLab();
  // Con "las que entren", la barra llega un poco más allá del último nivel, para que se vean más opciones; con
  // "solo 1", hasta la actividad más cara
  const min = niveles.length ? niveles[0].desde : 0, ultimo = niveles.length ? niveles[niveles.length - 1].desde : 0;
  const max = Math.max(min + 50, una ? Math.ceil(ultimo / 10) * 10 : Math.ceil(ultimo * 1.25 / 50) * 50);
  const inicio = niveles.length ? (una ? niveles[Math.min(2, niveles.length - 1)] : niveles[1] || niveles[0]).desde : 0;
  if (niveles.length) barra.b = Math.min(max, Math.max(min, Math.round((barra.b || inicio) / BARRA_PASO) * BARRA_PASO));
  const pct = (v) => (v - min) / (max - min) * 100;
  // La marca va debajo del centro de la perilla (24 px), que no llega a los bordes de la barra
  const marca = (v) => `calc(${pct(v).toFixed(2)}% + ${(12 - 0.24 * pct(v)).toFixed(1)}px)`;
  // Las marcas muy juntas se pisan: queda la de más actividades (u opciones), salvo la primera
  const marcas = [];
  niveles.forEach(x => {
    const ult = marcas[marcas.length - 1];
    if (!ult || pct(x.desde) - pct(ult.desde) >= 9) marcas.push(x); else if (marcas.length > 1) marcas[marcas.length - 1] = x;
  });
  dialogoPropuesta.classList.add("ancho");
  dialogoPropuesta.innerHTML = `
    <form method="dialog" class="pg">
      <button type="submit" class="pg-cerrar" aria-label="${esc(txt("cerrar"))}">✕</button>
      <h2 id="pg-titulo">${esc(txt("bbTitulo"))}</h2>
      ${enDemo ? `<p class="pg-demo">${esc(txt("pgDemo"))}</p>` : ""}
      <p class="pg-intro">${esc(txt(una ? "bbIntroUna" : "bbIntro"))}</p>
      <div class="pg-fila">
        ${pasoPropuesta("personas", txt("pgPersonas"))}
        ${pasoPropuesta("dias", txt("pgDias"))}
      </div>
      <div class="pg-campo">
        <span class="pg-etiqueta" id="bb-modo-l">${esc(txt("bbModo"))}</span>
        <div class="bb-modo" role="group" aria-labelledby="bb-modo-l">
          ${[[0, "bbModoTodas"], [1, "bbModoUna"]].map(([k, t]) => `<button type="button" data-bb="cuantas" data-k="${k}" aria-pressed="${barra.cuantas === k}">${esc(txt(t))}</button>`).join("")}
        </div>
      </div>
      ${!niveles.length ? `<p class="pg-aviso" role="status">${esc(avisoBarra())}</p>` : `
      <div class="bb-barra">
        <div class="bb-top"><label class="pg-etiqueta" for="bb-b">${esc(txt("bbPresupuesto"))}</label><output class="ab-precio" id="bb-valor" for="bb-b">${esc(usd(barra.b))}</output></div>
        <input type="range" class="bb-rango" id="bb-b" min="${min}" max="${max}" step="${BARRA_PASO}" value="${barra.b}">
        <div class="bb-marcas">${marcas.map(x => `<button type="button" class="bb-marca" data-bb="nivel" data-b="${x.desde}" style="left:${marca(x.desde)}" aria-label="${esc(txt(una ? "bbMarcaUna" : "bbMarca", x.k, usd(x.desde)))}"><b>${x.k}</b><span>${esc(usd(x.desde))}</span></button>`).join("")}</div>
      </div>
      <div class="bb-resumen" id="bb-resumen" aria-live="polite"></div>
      <div class="bb-dias" id="bb-dias"></div>
      <button type="button" class="reservar pg-armar" data-bb="ver">${esc(txt("abVer"))}</button>`}
      <button type="button" class="pg-secundario ab-volver" data-bb="volver">${esc(txt("abVolver"))}</button>
    </form>`;
  if (niveles.length) { armarBarra(); pintarResultadoBarra(); }
  if (foco) dialogoPropuesta.querySelector(foco)?.focus();
}
// Lo que cambia al mover la barra o elegir una opción; la barra no se vuelve a dibujar, para no cortar el arrastre
function pintarResultadoBarra(foco) {
  const p = barra.p, niveles = barra.niveles, una = barra.cuantas === 1, rango = dialogoPropuesta.querySelector("#bb-b");
  rango.style.setProperty("--lleno", `${(barra.b - Number(rango.min)) / (Number(rango.max) - Number(rango.min)) * 100}%`);
  dialogoPropuesta.querySelector("#bb-valor").textContent = usd(barra.b);
  dialogoPropuesta.querySelectorAll(".bb-marca").forEach(m => m.classList.toggle("ok", Number(m.dataset.b) <= barra.b));
  dialogoPropuesta.querySelector('[data-bb="ver"]').disabled = !p;
  const resumen = dialogoPropuesta.querySelector("#bb-resumen"), dias = dialogoPropuesta.querySelector("#bb-dias");
  if (!p) { resumen.innerHTML = `<span class="ab-alerta">${esc(avisoBarra())}</span>`; dias.innerHTML = ""; return; }
  const nombre = (o) => (enIngles() && o.en) || o.es;
  const meta = (o) => [duracionLab(o.du), o.sa].filter(Boolean).join(" · ");
  const texto = (o) => `<span class="ab-act-txt"><b>${esc(nombre(o))}</b>${meta(o) ? `<span class="ab-suave">${esc(meta(o))}</span>` : ""}</span>`;
  const sig = niveles.find(x => x.desde > barra.b), mas = conUnoMas(p);
  const libres = p.d.filter(d => (d.libres || []).length).length;
  const lineaMas = mas ? `<span>${esc(txt("bbSiFueran", mas.n, usd(mas.pp)))}</span>` : "";
  const lineaLibres = libres ? `<span class="ab-suave">${esc(txt("bbLibres", libres))}</span>` : "";
  if (una) {
    const elegida = barra.ops.find(o => o.t.t === barra.sel.una);
    resumen.innerHTML = `
      <span class="bb-cuantas"><b>${barra.ops.length}</b> ${esc(txt("bbOpcionesUna", barra.ops.length))}</span>
      <span>${esc(txt("bbUnaPrecio", nombre(elegida.t), usd(elegida.pp), usd(elegida.pp * pg.personas)))}</span>
      ${lineaMas}
      <span class="ab-acento">${esc(sig ? txt("bbOtraOpcion", usd(sig.desde - barra.b)) : txt("bbTodasOpciones"))}</span>
      ${lineaLibres}`;
  } else {
    const k = p.d.reduce((s, d) => s + d.s.length, 0), maxK = niveles[niveles.length - 1].k;
    const sobra = Math.floor(barra.b - p.pp);
    resumen.innerHTML = `
      <span class="bb-cuantas"><b>${k}</b> ${esc(txt("bbCuantas", k, pg.dias))}</span>
      <span class="bb-puntos" aria-hidden="true">${Array.from({ length: Math.max(k, maxK) }, (_, i) => `<i${i < k ? ' class="si"' : ""}></i>`).join("")}</span>
      <span>${esc(txt("bbPaquete", usd(p.pp)))}${sobra >= BARRA_PASO ? " " + esc(txt("bbSobra", usd(sobra))) : ""}</span>
      ${lineaMas}
      <span class="ab-acento">${esc(sig ? txt("bbOtra", usd(sig.desde - barra.b), sig.k) : txt("bbTodo"))}</span>
      ${lineaLibres}`;
  }
  // Solo 1: las actividades que entran, cada una con lo que paga cada persona
  const lista = una ? `<div class="bb-act" role="group" aria-label="${esc(txt("bbElegi", barra.ops.length))}">
      <span class="bb-elegi">${esc(txt("bbElegi", barra.ops.length))}</span>
      ${barra.ops.map((o, jj) => `<button type="button" class="bb-op" data-bb="una" data-tour="${esc(o.t.t)}" aria-pressed="${o.t.t === barra.sel.una}">
        <span class="bb-letra" aria-hidden="true">${LETRAS_LAB[jj] || ""}</span>${texto(o.t)}
        <span class="bb-pp"><b>${esc(usd(o.pp))}</b><span class="ab-suave">${esc(txt("porPersonaLab"))}</span></span></button>`).join("")}
    </div>
    <h3 class="ab-h">${esc(txt("bbTuItinerario"))}</h3>` : "";
  dias.innerHTML = lista + p.d.map(d => `<section class="ab-dia" aria-label="${esc(txt("abDia", d.dn))}">
      <div class="ab-dia-top"><b>${esc(txt("abDia", d.dn))}${d.f ? ` <span class="ab-suave">${esc(fechaPropuesta(d.f))}</span>` : ""}</b>
        ${planDia(d.dn) ? `<span class="ab-plan">${esc(txt("abPlan", nombrePlan(planDia(d.dn))))}</span>` : ""}</div>
      ${(d.libres || []).length ? `<div class="bb-act" role="group" aria-label="${esc(txt("libreGratis"))}">
        <span class="ab-playa">${esc(txt("libreGratis"))}</span>
        ${d.libres.length > 1 ? `<span class="bb-elegi">${esc(txt("bbElegi", d.libres.length))}</span>` : ""}
        ${d.libres.map((l, jj) => {
          const txtLugar = `<span class="ab-act-txt"><b>${esc(l.i || "")} ${esc((enIngles() && l.ne) || l.n)}</b><span class="ab-suave">${esc((enIngles() && l.te) || l.t)}</span></span>`;
          return d.libres.length > 1 ? `<button type="button" class="bb-op" data-bb="libre" data-c="${d.dn}-libre" data-lugar="${esc(l.n)}" aria-pressed="${jj === libreElegido(d)}">
            <span class="bb-letra" aria-hidden="true">${LETRAS_LAB[jj]}</span>${txtLugar}</button>` : `<div class="ab-act">${txtLugar}</div>`;
        }).join("")}
      </div>` : ""}
      ${d.s.map((s, si) => {
        const clave = `${d.dn}-${si}`, j = elegidaBarra(clave, s);
        const titulo = [d.s.length > 1 ? txt("bbActividad", si + 1) : "", s.length > 1 ? txt("bbElegi", s.length) : ""].filter(Boolean).join(" · ");
        return `<div class="bb-act" role="group"${titulo ? ` aria-label="${esc(titulo)}"` : ""}>
          ${titulo ? `<span class="bb-elegi">${esc(titulo)}</span>` : ""}
          ${s.length > 1 ? s.map((o, jj) => `<button type="button" class="bb-op" data-bb="op" data-c="${clave}" data-tour="${esc(o.t)}" aria-pressed="${jj === j}">
              <span class="bb-letra" aria-hidden="true">${LETRAS_LAB[jj]}</span>${texto(o)}</button>`).join("")
            : `<div class="ab-act">${texto(s[0])}</div>`}
        </div>`;
      }).join("")}
    </section>`).join("");
  if (foco) dialogoPropuesta.querySelector(foco)?.focus();
}
function accionBarra(b) {
  const a = b.dataset.bb;
  if (a === "nivel") {
    barra.b = Number(b.dataset.b);
    pg.presupuesto = String(barra.b);
    dialogoPropuesta.querySelector("#bb-b").value = barra.b;
    armarBarra();
    pintarResultadoBarra();
    return;
  }
  if (a === "cuantas") { barra.cuantas = Number(b.dataset.k); pintarBarra(`[data-bb="cuantas"][data-k="${b.dataset.k}"]`); return; }
  if (a === "una") { barra.sel.una = b.dataset.tour; armarBarra(); pintarResultadoBarra(`[data-bb="una"][data-tour="${b.dataset.tour}"]`); return; }
  if (a === "op") { barra.sel[b.dataset.c] = b.dataset.tour; pintarResultadoBarra(`[data-c="${b.dataset.c}"][data-tour="${b.dataset.tour}"]`); return; }
  if (a === "libre") { barra.sel[b.dataset.c] = b.dataset.lugar; pintarResultadoBarra(`[data-c="${b.dataset.c}"][data-lugar="${CSS.escape(b.dataset.lugar)}"]`); return; }
  if (a === "ver" && barra.p) {
    // propuesta.html abre con lo que eligió en cada actividad (e), y ahí puede cambiarlo. En los días libres, el lugar
    // elegido va primero
    const e = barra.p.d.flatMap(d => d.s.map((s, si) => elegidaBarra(`${d.dn}-${si}`, s)));
    const d = barra.p.d.map(x => (x.libres ? Object.assign({}, x, { libres: [x.libres[libreElegido(x)], ...x.libres.filter((_, j) => j !== libreElegido(x))] }) : x));
    guardarPg();
    location.href = linkItinerario(Object.assign({}, barra.p, { d }, e.some(Boolean) ? { e } : {}));
    return;
  }
  if (a === "volver") { enBarra = false; guardarPg(); dialogoPropuesta.classList.remove("ancho"); pintarPropuestaGratis(); dialogoPropuesta.querySelector("#pg-barra")?.focus(); }
}

function pasoPropuesta(clave, etiqueta) {
  return `
    <div class="pg-campo">
      <span class="pg-etiqueta" id="pg-${clave}-l">${esc(etiqueta)}</span>
      <div class="pg-paso" role="group" aria-labelledby="pg-${clave}-l">
        <button type="button" data-paso="${clave}" data-d="-1" aria-label="${esc(txt("pgMenos", etiqueta))}">−</button>
        <output id="pg-${clave}" aria-live="polite">${pg[clave]}</output>
        <button type="button" data-paso="${clave}" data-d="1" aria-label="${esc(txt("pgMas", etiqueta))}">+</button>
      </div>
    </div>`;
}

// El plan de cada día: lo que recomiende el laboratorio, una categoría del mapa o un día libre
function opcionesPlan() {
  return [["", txt("planCualquiera")], ...Object.entries(CATEGORIAS).map(([k, cat]) => [k, `${cat.emoji} ${rotulo(cat)}`]), ["libre", txt("planLibre")]];
}
function diaCorto(d) {
  if (!pg.desde) return txt("abDia", d);
  const [a, m, dd] = sumarDias(pg.desde, d - 1).split("-").map(Number);
  return `${txt("abDia", d)} · ${new Date(a, m - 1, dd).toLocaleDateString(enIngles() ? "en-US" : "es-CR", { weekday: "short", day: "numeric", month: "numeric" })}`;
}
const htmlPlanes = () => Array.from({ length: pg.dias }, (_, i) => i + 1).map(d => `
  <label class="pg-plan"><span>${esc(diaCorto(d))}</span>
    <select data-plan="${d}" aria-label="${esc(txt("pgPlanDe", d))}">${opcionesPlan().map(([k, l]) => `<option value="${esc(k)}"${planDia(d) === k ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`).join("");
const nombrePlan = (p) => (opcionesPlan().find(([k]) => k === p) || ["", ""])[1];
// Al cambiar los días o la fecha, los planes se vuelven a dibujar (un renglón por día)
const refrescarPlanes = () => {
  const f = dialogoPropuesta.querySelector("#pg-planes");
  if (f) f.innerHTML = `<legend class="pg-etiqueta">${esc(txt("pgPlanes"))}</legend>${htmlPlanes()}`;
};

function pintarPropuestaGratis() {
  const hoy = new Date();
  const minimo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  dialogoPropuesta.innerHTML = `
    <form method="dialog" class="pg">
      <button type="submit" class="pg-cerrar" aria-label="${esc(txt("cerrar"))}">✕</button>
      <h2 id="pg-titulo">${esc(txt("pgTitulo"))}</h2>
      ${enDemo ? `<p class="pg-demo">${esc(txt("pgDemo"))}</p>` : ""}
      <p class="pg-intro">${esc(txt("pgIntro"))}</p>
      <div class="pg-fila">
        ${pasoPropuesta("personas", txt("pgPersonas"))}
        ${pasoPropuesta("dias", txt("pgDias"))}
      </div>
      <fieldset class="pg-planes" id="pg-planes">
        <legend class="pg-etiqueta">${esc(txt("pgPlanes"))}</legend>
        ${htmlPlanes()}
      </fieldset>
      <div class="pg-fila">
        <label class="pg-campo"><span class="pg-etiqueta">${esc(txt("pgPresupuesto"))}</span>
          <input id="pg-presupuesto" type="number" min="0" step="10" inputmode="numeric" placeholder="150" value="${esc(pg.presupuesto)}"></label>
        <label class="pg-campo"><span class="pg-etiqueta">${esc(txt("pgDesde"))}</span>
          <input id="pg-desde" type="date" min="${minimo}" value="${esc(pg.desde)}"></label>
      </div>
      <fieldset class="pg-gustos">
        <legend class="pg-etiqueta">${esc(txt("pgGustos"))}</legend>
        ${Object.entries(CATEGORIAS).map(([k, cat]) => `
          <label class="pg-chip"><input type="checkbox" value="${esc(k)}" ${pg.gustos.has(k) ? "checked" : ""}><span>${esc(cat.emoji)} ${esc(rotulo(cat))}</span></label>`).join("")}
      </fieldset>
      ${transportesLab().length ? `<div class="pg-fila">
        <label class="pg-campo"><span class="pg-etiqueta">${esc(txt("pgTransporte"))}</span>
          <select id="pg-transporte"><option value="">${esc(txt("pgSinTransporte"))}</option>${transportesLab().map(t => `<option value="${esc(t.t)}"${pg.transporte && pg.transporte.t === t.t ? " selected" : ""}>${esc((enIngles() && t.en) || t.es)}</option>`).join("")}</select></label>
        ${transporteLab() && transporteLab().t.tipo === "traslado" ? `<label class="pg-check"><input type="checkbox" id="pg-vuelta"${pg.transporte.vuelta ? " checked" : ""}> ${esc(txt("pgVuelta"))}</label>`
          : transporteLab() ? `<span class="pg-check">${esc(textoTransporteLab(transporteLab()))}</span>` : ""}
      </div>` : ""}
      <label class="pg-campo"><span class="pg-etiqueta">${esc(txt("pgNota"))}</span>
        <textarea id="pg-nota" rows="2" placeholder="${esc(txt("pgNotaPista"))}">${esc(pg.nota)}</textarea></label>
      <p class="pg-aviso" id="pg-aviso" role="status" hidden></p>
      <button type="button" class="reservar pg-armar" id="pg-armar">${esc(txt("pgArmar"))}</button>
      ${(catalogoLab().tours || []).length ? `<button type="button" class="pg-armar pg-armar-yo" id="pg-barra">${esc(txt("pgBarra"))}</button>` : ""}
      <button type="button" class="pg-armar pg-armar-yo" id="pg-armar-yo">${esc(txt("pgArmarYo"))}</button>
      ${(catalogoLab().tours || []).length ? `<button type="button" class="pg-armar pg-armar-yo" id="pg-probar">${esc(txt("pgProbar"))}</button>` : ""}
      <a class="pg-secundario" id="pg-enviar" href="${esc(urlPropuestaGratis())}" target="_blank" rel="noopener">${esc(txt("pgEnviar"))}</a>
      <p class="pg-letra">${esc(txt("pgLetraChica"))}</p>
    </form>`;
}

const actualizarEnvioPropuesta = () => {
  dialogoPropuesta.querySelector("#pg-enviar").href = urlPropuestaGratis();
  dialogoPropuesta.querySelector("#pg-aviso").hidden = true;
};
const guardarPg = () => {
  try { sessionStorage.setItem("hey-lab", JSON.stringify({ ...pg, gustos: [...pg.gustos], armado: ab.mios })); } catch { /* sin almacenamiento */ }
};
function abrirLaboratorio() {
  try {
    const g = JSON.parse(sessionStorage.getItem("hey-lab") || "null");
    if (g) { ab.mios = g.armado || []; delete g.armado; Object.assign(pg, g, { gustos: new Set(g.gustos || []) }); }
  } catch { /* sin almacenamiento: arranca de cero */ }
  enArmado = false;
  enPrecios = false;
  enBarra = false;
  dialogoPropuesta.classList.remove("ancho");
  pintarPropuestaGratis();
  dialogoPropuesta.showModal();
  prepararMareasRutas();
}
dialogoPropuesta.addEventListener("click", (e) => {
  if (e.target === dialogoPropuesta) { dialogoPropuesta.close(); return; } // tocar afuera la cierra
  const ba = e.target.closest("[data-ab]");
  if (ba) { accionArmado(ba); return; }
  const bs = e.target.closest("[data-sim]");
  if (bs) { accionPrecios(bs); return; }
  const bb = e.target.closest("[data-bb]");
  if (bb) { accionBarra(bb); return; }
  if (e.target.closest("#pg-barra")) { enBarra = true; barra.b = presupuestoPg(); guardarPg(); pintarBarra("#pg-titulo"); dialogoPropuesta.scrollTop = 0; return; }
  if (e.target.closest("#pg-probar")) { enPrecios = true; simu.n = pg.personas; pintarPrecios("#pg-titulo"); dialogoPropuesta.scrollTop = 0; return; }
  if (e.target.closest("#pg-armar-yo")) {
    const aviso = dialogoPropuesta.querySelector("#pg-aviso");
    if (!presupuestoPg()) { aviso.textContent = txt("pgSinPresupuesto"); aviso.hidden = false; dialogoPropuesta.querySelector("#pg-presupuesto").focus(); return; }
    if (!(catalogoLab().tours || []).length) { aviso.textContent = txt("pgSinTours"); aviso.hidden = false; return; }
    enArmado = true;
    guardarPg();
    pintarArmado("#pg-titulo");
    dialogoPropuesta.scrollTop = 0;
    return;
  }
  if (e.target.closest("#pg-armar")) {
    const aviso = dialogoPropuesta.querySelector("#pg-aviso");
    if (!presupuestoPg()) { aviso.textContent = txt("pgSinPresupuesto"); aviso.hidden = false; dialogoPropuesta.querySelector("#pg-presupuesto").focus(); return; }
    const p = armarItinerario();
    const tr = transporteLab();
    const todoLibre = Array.from({ length: pg.dias }, (_, i) => i + 1).every(d => planDia(d) === "libre");
    if (!p) { aviso.textContent = todoLibre ? txt("pgTodoLibre") : tr && tr.pp >= presupuestoPg() ? txt("pgTransporteCaro") : txt((catalogoLab().tours || []).length ? "pgNoEntra" : "pgSinTours", pg.personas, `$${presupuestoPg()}`); aviso.hidden = false; return; }
    guardarPg();
    location.href = linkItinerario(p);
    return;
  }
  const b = e.target.closest("[data-paso]");
  if (!b) return;
  const clave = b.dataset.paso, [min, max] = PG_LIMITES[clave];
  pg[clave] = Math.min(max, Math.max(min, pg[clave] + Number(b.dataset.d)));
  // En la barra del budget, otro grupo u otros días cambian desde cuánto entra cada actividad
  if (enBarra) { guardarPg(); pintarBarra(`[data-paso="${clave}"][data-d="${b.dataset.d}"]`); return; }
  dialogoPropuesta.querySelector(`#pg-${clave}`).textContent = pg[clave];
  if (clave === "dias") refrescarPlanes();
  actualizarEnvioPropuesta();
});
dialogoPropuesta.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "bb-b") { barra.b = Number(t.value); pg.presupuesto = t.value; armarBarra(); pintarResultadoBarra(); return; }
  if (t.id === "pg-presupuesto") pg.presupuesto = t.value;
  else if (t.id === "pp-tour") { simu.t = t.value; pintarPrecios("#pp-tour"); return; }
  else if (t.id === "pg-desde") { pg.desde = t.value; refrescarPlanes(); }
  else if (t.id === "pg-nota") pg.nota = t.value;
  else if (t.id === "pg-transporte") {
    // Los traslados arrancan en ida y vuelta; la casilla aparece o se va según lo elegido
    pg.transporte = t.value ? { t: t.value, vuelta: true } : null;
    pintarPropuestaGratis();
    dialogoPropuesta.querySelector("#pg-transporte")?.focus();
    return;
  }
  else if (t.id === "pg-vuelta") { if (pg.transporte) pg.transporte.vuelta = t.checked; }
  else if (t.dataset.plan) { pg.planes = Object.assign({}, pg.planes, { [t.dataset.plan]: t.value }); }
  else if (t.type === "checkbox") { if (t.checked) pg.gustos.add(t.value); else pg.gustos.delete(t.value); }
  actualizarEnvioPropuesta();
});
document.getElementById("btn-propuesta").addEventListener("click", abrirLaboratorio);
// "Volver al laboratorio" desde un itinerario: la página abre con #laboratorio y lo que había puesto
if (location.hash === "#laboratorio") {
  history.replaceState(null, "", location.pathname + location.search);
  abrirLaboratorio();
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

// Todas las mareas altas y bajas de la serie, con su hora y su nivel
function extremosConNivel({ t, h }) {
  const out = [];
  for (let i = 1; i < h.length - 1; i++) {
    if (h[i] == null || h[i - 1] == null || h[i + 1] == null) continue;
    if (h[i] <= h[i - 1] && h[i] < h[i + 1]) out.push({ t: t[i], h: h[i], tipo: "baja" });
    if (h[i] >= h[i - 1] && h[i] > h[i + 1]) out.push({ t: t[i], h: h[i], tipo: "alta" });
  }
  return out;
}

// Momentos de marea más baja (o más alta) de la serie
function extremosMarea(mareas, tipo) {
  return extremosConNivel(mareas).filter(e => e.tipo === tipo).map(e => e.t);
}

// Nivel del mar a cualquier hora, entre dos datos de 15 minutos
function nivelEn({ t, h }, ms) {
  const paso = t[1] - t[0];
  const i = Math.min(t.length - 2, Math.max(0, Math.floor((ms - t[0]) / paso)));
  return h[i] + ((h[i + 1] ?? h[i]) - h[i]) * (ms - t[i]) / paso;
}

// Ventanas donde coinciden las horas buenas del lugar con la marea que conviene. Si el local
// no dio horas, vale mientras hay luz (del amanecer al atardecer de ese día). "ventana" son las
// horas antes y después de la marea (por defecto [-2, 2]; ej. [0, 2] = cuando empieza a bajar).
function ventanasIdeales(ideal, mareas, lng, lat) {
  if (ideal.surf) return tramosSurf(ideal.surf, mareas, lng, lat).buenas;
  const rangos = (ideal.horas || []).map(r => r.split("-").map(s => {
    const [hh, mm] = s.split(":").map(Number);
    return hh * HORA + mm * 60e3;
  }));
  const [antes, despues] = ideal.ventana || [-2, 2];
  const out = [];
  for (const m of extremosMarea(mareas, ideal.marea)) {
    const dia = Math.floor(m / DIA) * DIA;
    // Las horas alrededor de la marea pueden cruzar la medianoche
    for (const d of [dia - DIA, dia, dia + DIA]) {
      const sol = rangos.length ? null : solCR(d, lat, lng);
      for (const [a, b] of sol ? [[sol.sale * 60e3, sol.pone * 60e3]] : rangos) {
        const ini = Math.max(m + antes * HORA, d + a), fin = Math.min(m + despues * HORA, d + b);
        if (fin - ini >= 30 * 60e3) out.push({ ini, fin, marea: m });
      }
    }
  }
  return out.sort((x, y) => x.ini - y.ini);
}

// ---------- Horas buenas y no tan buenas para surfear (Juan, 4-oct) ----------
// En surf no cuentan las horas del sol ("en medio del agua no hay sombras"): solo la marea.
// Cada subida o bajada se parte en tercios: baja (el tercio más bajo), media y alta.
// "surf.mareasBuenas" dice en cuáles trabaja la ola (ej. Playa Hermosa: ["baja", "media"]);
// el resto del día con luz queda como "no tan buena". De noche no se marca nada.
function etapaMarea(extremos, h, ms) {
  const i = extremos.findIndex(e => e.t > ms);
  if (i < 1 || h == null) return null;
  const [a, b] = [extremos[i - 1].h, extremos[i].h];
  const f = (h - Math.min(a, b)) / (Math.abs(b - a) || 1);
  return f < 1 / 3 ? "baja" : f < 2 / 3 ? "media" : "alta";
}

function tramosSurf(buenas, mareas, lng, lat) {
  const extremos = extremosConNivel(mareas);
  const out = { buenas: [], noTan: [] };
  const soles = new Map();
  let actual = null; // { tipo, ini } del tramo que se está armando
  const cerrar = (t) => {
    if (actual && t - actual.ini >= 30 * 60e3) out[actual.tipo].push({ ini: actual.ini, fin: t });
    actual = null;
  };
  mareas.t.forEach((t, i) => {
    const d = Math.floor(t / DIA) * DIA;
    if (!soles.has(d)) soles.set(d, solCR(d, lat, lng));
    const sol = soles.get(d);
    const deDia = t >= d + sol.sale * 60e3 && t <= d + sol.pone * 60e3;
    const etapa = deDia ? etapaMarea(extremos, mareas.h[i], t) : null;
    const tipo = etapa ? (buenas.includes(etapa) ? "buenas" : "noTan") : null;
    if (tipo !== (actual?.tipo ?? null)) {
      cerrar(t);
      if (tipo) actual = { tipo, ini: t };
    }
  });
  cerrar(mareas.t[mareas.t.length - 1]);
  return out;
}

// "baja a media", "media a alta"... para decirlo en palabras ("low to mid" en inglés)
function etapasEnPalabras(etapas) {
  return etapas.map(e => enIngles() ? ETAPAS_EN[e] : e).join(enIngles() ? " to " : " a ");
}

function horaCR(ms) {
  const d = new Date(ms), h = d.getUTCHours();
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`;
}
function rangoCR(ini, fin) {
  const [a, b] = [horaCR(ini), horaCR(fin)];
  return a.slice(-4) === b.slice(-4) ? `${a.slice(0, -5)} – ${b}` : `${a} – ${b}`;
}

// Juan (3-oct): dos líneas, hoy y mañana, arriba de los bloques, en inglés como él las
// escribió ("Best time to go today at xxx" / "Best time to go tomorrow xxx"). Desde que la
// página es bilingüe (6-oct), en español salen en español.
async function llenarIdealHoy(el, ideal, lng, lat) {
  let ventanas;
  try { ventanas = ventanasIdeales(ideal, await cargarMareas(lng, lat), lng, lat); }
  catch (e) { console.warn("Sin datos de marea:", e); return; }
  if (!el.isConnected) return; // la persona ya cambió de pestaña o de lugar
  const ahora = ahoraCR();
  const hoy = Math.floor(ahora / DIA);
  const proximas = ventanas.filter(v => v.fin > ahora);
  if (!proximas.length) return;
  const delDia = (n) => proximas.filter(v => Math.floor(v.ini / DIA) === hoy + n);
  const horas = (vs) => vs.length
    ? vs.map(v => v.ini <= ahora ? txt("ahoraHasta", horaCR(v.fin)) : rangoCR(v.ini, v.fin)).join(txt("y"))
    : txt("sinVentana");
  const linea = (texto, valor) => `<span class="ideal-linea">🕐 ${esc(texto)}: <strong>${esc(valor)}</strong></span>`;
  const [vHoy, vManana] = [delDia(0), delDia(1)];
  // Si ni hoy ni mañana hay ventana, se avisa cuál es la próxima
  const proxima = !vHoy.length && !vManana.length
    ? linea(txt("proximaBuena", txt("dias")[new Date(proximas[0].ini).getUTCDay()]), rangoCR(proximas[0].ini, proximas[0].fin))
    : "";
  // "para" / "paraEn": para qué es la hora, cuando no sirve para todos (ej. El Chorro: solo a pie)
  const para = (enIngles() ? ideal.paraEn : ideal.para) || txt("paraDefecto");
  const marea = ideal.surf
    ? txt("mareaDeSurf", etapasEnPalabras(ideal.surf))
    : ideal.ventana?.[0] === 0
      ? txt("alEmpezarA", ideal.marea)
      : txt("conMarea", ideal.marea);
  el.innerHTML = `
    ${linea(txt("mejorHoy", para), horas(vHoy))}
    ${linea(txt("mejorManana", para), horas(vManana))}
    ${proxima}
    <span class="ideal-detalle">${esc(marea)} · ${txt("datosMarea")}:
      <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></span>`;
  el.hidden = false;
}

// ---------- La marea del lugar, hora por hora ----------
// Idea de Juan (3-oct): hablar de las mareas con la gente es su sello. La curva muestra el mar
// de hoy, mañana o pasado en ese lugar; la persona mueve la hora con la barra (o con el dedo
// sobre la curva), la bolita sigue al mar y abajo sale lo que Guille cuenta de esa marea en
// ese lugar ("mareas" en data/points.js). Solo sale donde hay esa voz local.
// Juan (4-oct): la curva muestra siempre la mejor hora para ir ese día ("horasIdeales"):
// una franja dorada sobre la curva y la hora escrita arriba; al tocarla, la bolita va ahí.
const MAREA_W = 320, MAREA_X0 = 10, MAREA_X1 = 310, MAREA_Y0 = 30, MAREA_Y1 = 100;

// Amanecer y atardecer aproximados (fórmula de la NOAA), en minutos del día en hora tica
function solCR(diaMs, lat, lng) {
  const n = Math.round((diaMs - Date.UTC(new Date(diaMs).getUTCFullYear(), 0, 1)) / DIA) + 1;
  const g = 2 * Math.PI / 365 * (n - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const rad = Math.PI / 180, la = lat * rad;
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(la) * Math.cos(dec)) - Math.tan(la) * Math.tan(dec)) / rad;
  const CR = -360; // UTC-6, Costa Rica no cambia la hora
  return { sale: 720 - 4 * (lng + ha) - eq + CR, pone: 720 - 4 * (lng - ha) - eq + CR };
}

// "sinVoz": en Surf sin "surf.mareasBuenas", la voz de Guille sobre la marea habla de estar en
// la playa, no de la ola: la caja no sale para no confundir.
async function llenarMarea(el, p, lng, lat, ideal = null, { sinVoz = false } = {}) {
  let mareas;
  try { mareas = await cargarMareas(lng, lat); }
  catch (e) { console.warn("Sin datos de marea:", e); return; }
  if (!el.isConnected) return; // la persona ya cambió de pestaña o de lugar
  const ahora = ahoraCR();
  const hoy = Math.floor(ahora / DIA) * DIA;
  const minutoAhora = Math.floor((ahora - hoy) / 60e3 / 15) * 15;
  const extremos = extremosConNivel(mareas);
  // En surf: horas buenas (doradas) y no tan buenas, solo por la marea (Juan, 4-oct)
  const surf = ideal?.surf ? tramosSurf(ideal.surf, mareas, lng, lat) : null;
  const ideales = surf ? surf.buenas : ideal ? ventanasIdeales(ideal, mareas, lng, lat) : [];
  // La misma escala para los tres días, así se comparan a simple vista
  const visibles = mareas.h.filter((v, i) => v != null && mareas.t[i] >= hoy && mareas.t[i] <= hoy + 3 * DIA);
  if (!visibles.length) return;
  const bajo = Math.min(...visibles), alto = Math.max(...visibles);
  const X = (m) => MAREA_X0 + m / 1440 * (MAREA_X1 - MAREA_X0);
  const Y = (v) => MAREA_Y1 - (v - bajo) / (alto - bajo || 1) * (MAREA_Y1 - MAREA_Y0);
  const nombres = [txt("hoy"), txt("manana"), txt("dias")[new Date(hoy + 2 * DIA).getUTCDay()]];
  const voz = p.mareas || {};
  let dia = 0, minuto = minutoAhora;

  el.innerHTML = `
    <div class="marea-cabeza">
      <span class="marea-titulo">${esc(txt("mareaEn", p.nombre))}</span>
      <div class="marea-dias" role="group" aria-label="${txt("dia")}">
        ${nombres.map((n, i) => `<button type="button" data-dia="${i}">${n}</button>`).join("")}
      </div>
    </div>
    <div class="marea-hud" aria-live="polite">
      <div class="marea-estado">
        <span class="marea-flecha" aria-hidden="true"></span>
        <div><strong></strong><span class="marea-siguiente"></span></div>
      </div>
      <div class="marea-reloj">
        <span class="marea-hora"></span>
        <span class="marea-nivel"></span>
      </div>
    </div>
    ${ideal ? `<p class="marea-ideal"></p>` : ""}
    <svg class="marea-grafica" viewBox="0 0 ${MAREA_W} 130" role="img" aria-label="${txt("curvaAria")}">
      <defs>
        <linearGradient id="marea-agua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#22e6df" stop-opacity="0.45">
            <animate attributeName="stop-opacity" values="0.3;0.55;0.3" dur="4s" repeatCount="indefinite"/>
          </stop>
          <stop offset="1" stop-color="#22e6df" stop-opacity="0.02"/>
        </linearGradient>
        <filter id="marea-brillo" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect class="marea-noche"/><rect class="marea-noche"/>
      <g class="marea-franjas"></g>
      <g class="marea-rejilla">${[180, 360, 540, 720, 900, 1080, 1260].map(m =>
        `<line x1="${X(m)}" x2="${X(m)}" y1="${MAREA_Y0 - 12}" y2="${MAREA_Y1 + 6}"/>`).join("")}</g>
      <path class="marea-area" fill="url(#marea-agua)"/>
      <path class="marea-linea" filter="url(#marea-brillo)"/>
      <path class="marea-linea-ideal" filter="url(#marea-brillo)"/>
      <g class="marea-ext"></g>
      <g class="marea-eje"></g>
      <line class="marea-guia" y1="${MAREA_Y0 - 12}" y2="${MAREA_Y1 + 6}"/>
      <circle class="marea-sonar" r="6">
        <animate attributeName="r" values="6;22" dur="2.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.8;0" dur="2.2s" repeatCount="indefinite"/>
      </circle>
      <circle class="marea-halo" r="10"/>
      <circle class="marea-punto" r="5.5" filter="url(#marea-brillo)"/>
    </svg>
    <div class="marea-control">
      <input type="range" class="marea-barra" min="0" max="1425" step="15" aria-label="${txt("horaDelDia")}">
      <button type="button" class="marea-ahora">${txt("ahora")}</button>
    </div>
    <div class="marea-voz"><span class="marea-voz-titulo"></span><p></p></div>
    <span class="ideal-detalle">${txt("fuentesMarea")}: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>
      · ${txt("solAproximado")}</span>`;

  const $ = (s) => el.querySelector(s);
  const svg = $(".marea-grafica"), barra = $(".marea-barra"), botonAhora = $(".marea-ahora");
  const ponerAttrs = (nodo, attrs) => Object.entries(attrs).forEach(([k, v]) => nodo.setAttribute(k, v));
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) el.querySelectorAll("animate").forEach(a => a.remove());

  // En el teléfono, mientras la persona mueve la hora, un toquecito por cada hora y uno más
  // fuerte al pasar por la marea más alta o más baja (solo donde el teléfono lo permite)
  let tocando = false, ultimaHora = null, ultimoPico = null;
  const vibrar = (ms) => { if (tocando && navigator.vibrate) navigator.vibrate(ms); };

  const pintarDia = () => {
    const d0 = hoy + dia * DIA;
    el.querySelectorAll(".marea-dias button")
      .forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.dia === dia)));
    const puntos = [];
    mareas.t.forEach((t, i) => {
      if (t >= d0 && t <= d0 + DIA && mareas.h[i] != null)
        puntos.push(`${X((t - d0) / 60e3).toFixed(1)} ${Y(mareas.h[i]).toFixed(1)}`);
    });
    const linea = "M" + puntos.join(" L");
    $(".marea-linea").setAttribute("d", linea);
    $(".marea-area").setAttribute("d", `${linea} L${MAREA_X1} ${MAREA_Y1 + 6} L${MAREA_X0} ${MAREA_Y1 + 6} Z`);

    // La noche va más oscura: la playa se vive de día
    const sol = solCR(d0, lat, lng);
    const yNoche = MAREA_Y0 - 12, altoNoche = MAREA_Y1 + 6 - yNoche;
    const [noche1, noche2] = el.querySelectorAll(".marea-noche");
    ponerAttrs(noche1, { x: MAREA_X0, y: yNoche, width: X(sol.sale) - MAREA_X0, height: altoNoche });
    ponerAttrs(noche2, { x: X(sol.pone), y: yNoche, width: MAREA_X1 - X(sol.pone), height: altoNoche });
    $(".marea-eje").innerHTML = `
      <text class="sol" x="${X(sol.sale)}" y="126" text-anchor="middle">☀ ${horaCR(d0 + sol.sale * 60e3)}</text>
      <text x="${X(720)}" y="126" text-anchor="middle">12 p.m.</text>
      <text class="sol" x="${X(sol.pone)}" y="126" text-anchor="middle">🌅 ${horaCR(d0 + sol.pone * 60e3)}</text>`;

    // La mejor hora para ir ese día: franja dorada, ese tramo de la curva resaltado y la hora
    // escrita arriba de la curva (cada hora es un botón que lleva la bolita al inicio)
    // En surf, además, las horas no tan buenas van en una franja apagada (Juan, 4-oct)
    if (ideal) {
      const delDia = (lista) => lista.filter(v => v.fin > d0 && v.ini < d0 + DIA)
        .map(v => ({ ini: Math.max(v.ini, d0), fin: Math.min(v.fin, d0 + DIA) }));
      const buenas = delDia(ideales), noTan = surf ? delDia(surf.noTan) : [];
      const xEn = (t) => X((t - d0) / 60e3);
      const tramo = ({ ini, fin }) => "M" + [ini, ...mareas.t.filter(t => t > ini && t < fin), fin]
        .map(t => `${xEn(t).toFixed(1)} ${Y(nivelEn(mareas, t)).toFixed(1)}`).join(" L");
      const franja = (v, clase) => `<rect${clase ? ` class="${clase}"` : ""} x="${xEn(v.ini)}" y="${yNoche}" ` +
        `width="${xEn(v.fin) - xEn(v.ini)}" height="${altoNoche}" rx="3"/>`;
      $(".marea-franjas").innerHTML = noTan.map(v => franja(v, "no-tan")).join("") + buenas.map(v => franja(v)).join("");
      $(".marea-linea-ideal").setAttribute("d", buenas.map(tramo).join(" "));
      const horas = (vs) => vs.map(v => {
        const m = Math.min(1425, Math.ceil((v.ini - d0) / 60e3 / 15) * 15);
        const paso = v.fin <= ahora; // hoy, la que ya se fue queda escrita pero apagada
        return `<button type="button" data-m="${m}"${paso ? ` class="pasada"` : ""}>${esc(rangoCR(v.ini, v.fin))}</button>` +
          (paso ? ` <small>${txt("yaPaso")}</small>` : "");
      }).join(txt("y"));
      const para = esc((enIngles() ? ideal.paraEn : ideal.para) || txt("paraDefecto"));
      $(".marea-ideal").innerHTML = surf
        ? `<span class="marea-ideal-linea"><span aria-hidden="true">★</span> ${txt("horasSurf", buenas.length ? horas(buenas) : txt("ningunaEsteDia"))}</span>` +
          (noTan.length ? `<span class="marea-ideal-linea no-tan">${txt("noTanBuenas", horas(noTan))}</span>` : "")
        : buenas.length
          ? `<span aria-hidden="true">★</span> ${txt("mejorHoraPara", para, horas(buenas))}`
          : `<span aria-hidden="true">★</span> ${txt("sinHoraIdeal", para)}`;
    }

    $(".marea-ext").innerHTML = extremos.filter(e => e.t >= d0 && e.t < d0 + DIA).map(e => {
      const m = (e.t - d0) / 60e3, x = X(m), y = Y(e.h);
      const tx = Math.min(MAREA_X1 - 32, Math.max(MAREA_X0 + 32, x));
      return `<g data-m="${m}"><circle cx="${x}" cy="${y}" r="2.5"/>` +
        `<text x="${tx}" y="${e.tipo === "alta" ? y - 7 : y + 14}" text-anchor="middle">` +
        `${txt("extremo", e.tipo, horaCR(e.t))}</text></g>`;
    }).join("");
  };

  const actualizar = () => {
    const ms = hoy + dia * DIA + minuto * 60e3;
    const v = nivelEn(mareas, ms), x = X(minuto), y = Y(v);
    ponerAttrs($(".marea-punto"), { cx: x, cy: y });
    ponerAttrs($(".marea-halo"), { cx: x, cy: y });
    ponerAttrs($(".marea-guia"), { x1: x, x2: x });
    ponerAttrs($(".marea-sonar"), { cx: x, cy: y });
    // Las etiquetas de alta y baja se apartan cuando la bolita pasa encima
    el.querySelectorAll(".marea-ext g")
      .forEach(g => { g.style.opacity = Math.abs(+g.dataset.m - minuto) < 75 ? 0.15 : 1; });
    barra.value = minuto;
    barra.style.setProperty("--p", `${minuto / 1425 * 100}%`);

    const [reloj, sufijo] = horaCR(ms).split(" ");
    $(".marea-hora").innerHTML = `${reloj}<small>${sufijo}</small>`;
    $(".marea-nivel").textContent = txt("nivel", Math.round((v - bajo) / (alto - bajo || 1) * 100));

    const hora = Math.floor(minuto / 60);
    if (ultimaHora !== null && hora !== ultimaHora) vibrar(6);
    ultimaHora = hora;
    const pico = extremos.find(e => Math.abs(e.t - ms) < 8 * 60e3) || null;
    if (pico && pico !== ultimoPico) vibrar(30);
    ultimoPico = pico;

    const sube = nivelEn(mareas, ms + 15 * 60e3) > v;
    const cerca = extremos.find(e => Math.abs(e.t - ms) <= HORA);
    const prox = extremos.find(e => e.t > ms);
    let siguiente = "";
    if (prox) {
      siguiente = prox === cerca ? txt("picoA", prox.tipo, horaCR(prox.t)) : txt("haciaA", prox.tipo, horaCR(prox.t));
      if (Math.floor(prox.t / DIA) !== Math.floor(ms / DIA)) siguiente += txt("diaSiguiente");
    }
    $(".marea-flecha").textContent = cerca ? (cerca.tipo === "alta" ? "▲" : "▼") : (sube ? "↗" : "↘");
    $(".marea-estado strong").textContent = cerca
      ? txt("mareaTipo", cerca.tipo) : txt(sube ? "subiendo" : "bajando");
    $(".marea-siguiente").textContent = siguiente;

    // Criterio de Juan: la marea "está" baja (o alta) de 2 h antes a 2 h después de su punto
    const enAhora = dia === 0 && minuto === minutoAhora;
    const ventana = extremos.find(e => Math.abs(e.t - ms) <= 2 * HORA);
    const viene = sube ? "alta" : "baja";
    let titulo, texto;
    if (surf) {
      // En surf, la caja dice si esa hora es buena para la ola, solo por la marea (Juan, 4-oct)
      titulo = txt(enAhora ? "surfAhora" : "surfAEsaHora");
      const dentro = (w) => w.ini <= ms && ms < w.fin;
      const buena = surf.buenas.some(dentro), noTan = surf.noTan.some(dentro);
      const gusta = txt("olaGusta", etapasEnPalabras(ideal.surf));
      texto = buena ? `${txt("horaBuena", etapaMarea(extremos, v, ms))} ${gusta}`
        : noTan ? `${txt("horaNoTan", etapaMarea(extremos, v, ms))} ${gusta}`
        : txt("deNoche");
      const prox = !buena && surf.buenas.find(w => w.ini > ms);
      if (prox) {
        const mismoDia = Math.floor(prox.ini / DIA) === Math.floor(ms / DIA);
        texto += txt("proximaHoraBuena", mismoDia ? "" : txt("dias")[new Date(prox.ini).getUTCDay()], horaCR(prox.ini));
      }
    } else if (ventana && voz[ventana.tipo]) {
      titulo = txt(enAhora ? "guilleAhora" : "guilleAEsaHora");
      texto = voz[ventana.tipo];
    } else if (voz[viene]) {
      titulo = txt("guilleViene");
      texto = voz[viene];
    } else {
      const otra = viene === "alta" ? "baja" : "alta";
      titulo = txt("guilleConMarea", otra);
      texto = voz[otra];
    }
    $(".marea-voz").hidden = !texto || sinVoz;
    $(".marea-voz-titulo").textContent = titulo;
    $(".marea-voz p").textContent = texto || "";
    botonAhora.hidden = enAhora;
  };

  barra.addEventListener("input", () => { tocando = true; minuto = +barra.value; actualizar(); });
  barra.addEventListener("change", () => { tocando = false; });
  botonAhora.addEventListener("click", () => {
    tocando = false;
    if (dia !== 0) { dia = 0; pintarDia(); }
    minuto = minutoAhora;
    actualizar();
  });
  el.querySelectorAll(".marea-dias button").forEach(b => b.addEventListener("click", () => {
    tocando = false;
    dia = +b.dataset.dia;
    pintarDia();
    actualizar();
  }));
  $(".marea-ideal")?.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-m]");
    if (!b) return;
    tocando = false;
    minuto = +b.dataset.m;
    actualizar();
  });
  // Con el dedo o el mouse sobre la curva también se mueve la hora
  const desdePuntero = (e) => {
    const r = svg.getBoundingClientRect();
    const vx = (e.clientX - r.left) / r.width * MAREA_W;
    minuto = Math.min(1425, Math.max(0, Math.round((vx - MAREA_X0) / (MAREA_X1 - MAREA_X0) * 1440 / 15) * 15));
    actualizar();
  };
  let arrastrando = false;
  svg.addEventListener("pointerdown", (e) => {
    arrastrando = tocando = true;
    try { svg.setPointerCapture(e.pointerId); } catch { /* sin captura igual sigue al dedo */ }
    desdePuntero(e);
  });
  svg.addEventListener("pointermove", (e) => { if (arrastrando) desdePuntero(e); });
  ["pointerup", "pointercancel"].forEach(t => svg.addEventListener(t, () => { arrastrando = tocando = false; }));

  pintarDia();
  actualizar();
  el.hidden = false;
}

// Pedido de Juan (3-oct): que la gente pueda irse directo a Waze o Google Maps desde el lugar.
// Si el lugar trae "llegada" (dónde dejar el carro o dónde arranca el sendero), se navega ahí.
// Juan (4-oct): la foto 360° ya no se abre sola al tocar el lugar; queda un botón acá, junto a
// "Cómo llegar", que la abre a pantalla completa.
function htmlComoLlegar(p, [lng, lat], { ver360 = false } = {}) {
  const [dLng, dLat] = p.llegada || [lng, lat];
  const destino = `${dLat},${dLng}`;
  return `
    <div class="como-llegar">
      <span>${txt("comoLlegar")}</span>
      <a href="https://waze.com/ul?ll=${destino}&navigate=yes" target="_blank" rel="noopener">Waze</a>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${destino}" target="_blank" rel="noopener">Google Maps</a>
    </div>
    ${ver360 ? `<button type="button" class="ver-360">${txt("ver360")}</button>` : ""}`;
}

// opciones.sobre360: la ficha se abre encima de la foto 360° a pantalla completa (ver
// "Modo inmersivo"), así que no lleva portada; opciones.cat: la pestaña con que abre.
// opciones.refrescar: la misma ficha se vuelve a pintar (al cambiar de idioma), sin mover el
// mapa ni la hoja.
function abrirPanel(feature, el, opciones = {}) {
  const p = traducido(feature.properties);
  const [lng, lat] = feature.geometry.coordinates;
  const sobre360 = !!opciones.sobre360;
  const refrescar = !!opciones.refrescar;
  panel.classList.toggle("sobre-360", sobre360);

  if (!refrescar) marcarLugar(el);

  // Juan (3-oct): la ficha ya no lleva la fila de pestañas de texto. Abre en la sección del
  // ícono que la persona eligió en el mapa (cómo viene pensando); sin ícono, la vista general.
  // Juan (4-oct): debajo de "Cómo llegar" van los íconos de las secciones del lugar, para pasar
  // de una a otra sin salir; la que se elige queda prendida también en el mapa, así al salir
  // se ven los lugares de esa sección. "Meet a local" sigue siempre al final.
  const tours = toursDelLugar(p);
  const secciones = p.categorias.filter(c => CATEGORIAS[c]);
  const iconosSecciones = secciones.length > 1 ? `
    <nav class="secciones-lugar" aria-label="${esc(txt("seccionesDe", p.nombre))}">
      ${secciones.map(c => `
        <button type="button" data-cat="${c}" aria-pressed="false" style="--cat: ${CATEGORIAS[c].color}">
          <img src="${esc(CATEGORIAS[c].icono)}" alt=""><span>${esc(rotulo(CATEGORIAS[c]))}</span>
        </button>`).join("")}
    </nav>` : "";

  // Portada: la foto del lugar si la hay; si no, su vista 3D (y mientras carga,
  // la foto satelital plana del mismo punto)
  // (La foto 360° no va en la portada: se abre con su botón, junto a "Cómo llegar")
  const portada = p.foto || fotoSatelital(lng, lat);
  const con3d = !p.foto;
  const credito = con3d ? `<span class="hero-credito">${txt("credito3d")}</span>` : "";

  // La vista del lugar anterior se va con el HTML viejo
  desmontarVista3D();
  const textoHero = `
      <div class="hero-texto">
        <h2>${esc(p.nombre)}</h2>
      </div>`;
  panelBody.innerHTML = `
    ${sobre360 ? `<div class="hero">${textoHero}</div>` : `
    <div class="hero">
      <img class="hero-foto" src="${esc(portada)}" alt="${esc(p.nombre)}">
      ${con3d ? `<div class="hero-3d"></div>` : ""}
      ${credito}
      ${textoHero}
    </div>`}
    <div class="panel-contenido">
      ${htmlComoLlegar(p, [lng, lat], { ver360: !!p.foto360 && !sobre360 })}
      ${iconosSecciones}
      <div class="vista"></div>
    </div>`;

  const heroFoto = panelBody.querySelector(".hero-foto");
  const mostrarFoto = () => heroFoto.classList.add("lista");
  if (!heroFoto) { /* encima de la 360°: sin portada */ }
  else if (heroFoto.complete && heroFoto.naturalWidth) mostrarFoto();
  else heroFoto.addEventListener("load", mostrarFoto, { once: true });
  // Encima de la 360° la foto ya está detrás, a pantalla completa: la ficha no monta otra vista
  if (!sobre360 && con3d) montarVista3D(panelBody.querySelector(".hero-3d"), lng, lat, CATEGORIAS[p.categorias[0]]);
  panelBody.querySelector(".ver-360")?.addEventListener("click", () => abrirInmersivo(feature, el));

  // El panel muestra el texto breve de la sección elegida. "Preguntale al local" se quitó
  // el 2-oct (pedido de Juan): la ficha ya da buena información por sí sola.
  const vistaEl = panelBody.querySelector(".vista");
  const meetALocal = tours.length ? `
    <div class="vista-meet">
      <p class="vista-titulo"><img src="${esc(TAB_TOURS.icono)}" alt="">${esc(rotulo(TAB_TOURS))}</p>
      ${tours.map(htmlTour).join("")}
    </div>` : "";
  let vistaActual = null; // la sección que se está viendo (null = la vista general)
  const pintarVista = (cat) => {
    vistaActual = cat;
    panelBody.querySelectorAll(".secciones-lugar button")
      .forEach(b => b.setAttribute("aria-pressed", String(b.dataset.cat === cat)));
    // El ícono de "Meet a local" sobre la foto 360° abre solo esa parte
    if (cat === "tours") {
      vistaEl.innerHTML = meetALocal;
      return;
    }
    const c = CATEGORIAS[cat];
    // En surf mandan las mareas de la ola ("surf.mareasBuenas"), no las horas del sol (Juan,
    // 4-oct: en el agua no hay sombra). Fuera de surf, las "horasIdeales" del lugar; sin
    // "secciones", valen en todas sus secciones.
    const surf = cat === "surf" && p.surf?.mareasBuenas;
    const ideal = surf ? { surf, para: "surfear", paraEn: "surf" }
      : p.horasIdeales && (!c || !p.horasIdeales.secciones || p.horasIdeales.secciones.includes(cat))
        ? p.horasIdeales : null;
    const conMarea = !!p.mareas || !!surf;
    vistaEl.innerHTML = `
      ${c ? `<p class="vista-titulo"><img src="${esc(c.icono)}" alt="">${esc(txt("tituloSeccion", c, p.nombre))}</p>` : ""}
      ${htmlSeccion(c ? textoDeCategoria(p, cat) : textoGeneral(p),
        (ideal ? `<div class="ideal-hoy" hidden></div>` : "") +
        (conMarea ? `<div class="marea" hidden></div>` : ""))}
      ${meetALocal}`;
    if (ideal) llenarIdealHoy(vistaEl.querySelector(".ideal-hoy"), ideal, lng, lat);
    if (conMarea) llenarMarea(vistaEl.querySelector(".marea"), p, lng, lat, ideal, { sinVoz: cat === "surf" && !surf });
  };
  // Abre en la sección que tocaron sobre la 360°; si no, en la categoría con que la persona
  // venía filtrando el mapa
  const filtro = [...categoriasActivas][0];
  pintarVista(opciones.cat || (p.categorias.includes(filtro) ? filtro : null));
  lugarAbierto = { categorias: p.categorias, pintarVista, el, feature, sobre360, vista: () => vistaActual };
  // Cambiar de sección en la ficha (o desde los íconos sobre la 360°) también cambia la
  // categoría del mapa: al salir, quedan a la vista los lugares de la sección que dejó
  if (CATEGORIAS[opciones.cat] && !refrescar) ponerCategoria(opciones.cat);
  panelBody.querySelectorAll(".secciones-lugar button").forEach(b => b.addEventListener("click", () => {
    ponerCategoria(b.dataset.cat);
    pintarVista(b.dataset.cat);
  }));

  asaNombre.textContent = p.nombre;
  if (refrescar) return; // la ficha ya estaba abierta: queda donde estaba
  panel.hidden = false;
  panel.scrollTop = 0;
  // Al tocar una sección sobre la 360°, la ficha sube hasta arriba (pedido de Juan, 3-oct);
  // su ✕ devuelve a la foto. Mientras tanto la foto se queda quieta.
  if (sobre360) congelarFoto(true);
  // En el teléfono la ficha abre en toda la pantalla (Juan, 3-oct); la ✕ vuelve al mapa
  if (anchoMovil.matches) ponerAltura("alta");
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
  const elCerrado = lugarAbierto?.el;
  panel.hidden = true;
  panel.classList.remove("sobre-360");
  lugarAbierto = null;
  soltarAltura();
  desmontarVista3D();
  // Encima de la 360°, cerrar la ficha vuelve a la foto (que vuelve a moverse); el lugar sigue marcado
  congelarFoto(false);
  // En el mapa, el lugar que se estaba viendo queda parpadeando con su nombre, igual que al
  // salir de la 360° (Juan, 3-oct), para buscar otro punto u otra categoría sin perderse
  if (inmersivo.hidden) marcarLugar(elCerrado?.isConnected ? elCerrado : null, { conNombre: true });
}

// El lugar abierto se agranda con un halo. "marcado" suma su nombre y un aro que late: es como
// queda al salir de la foto 360° (ver salirDeLaFoto). Abrir otro lugar o tocar el mapa lo quita.
function marcarLugar(el, { conNombre = false } = {}) {
  document.querySelectorAll(".marker.activo, .marker.marcado")
    .forEach(m => m.classList.remove("activo", "marcado"));
  if (el) el.classList.add("activo");
  if (el && conNombre) el.classList.add("marcado");
  renderMarcadores(); // si el que dejó de estar marcado no es de la categoría elegida, se va
  // El lugar seleccionado lanza sus mini oleadas por las curvas; sin lugar, se apagan
  ondasEn(el ? marcadores.find(m => m.el === el)?.feature.geometry.coordinates ?? null : null);
}

// ---------- Modo inmersivo ----------
// Idea de Juan (3-oct): la foto 360° llena la pantalla; abajo flotan los íconos de sus
// secciones, y al tocar uno sube la ficha con esa sección encima de la foto. Cerrar esa ficha
// vuelve a la foto. Desde el 4-oct se entra con el botón "Ver foto 360°" de la ficha (ya no al
// tocar el lugar), y la ✕ de arriba vuelve a la ficha de la playa que se está viendo.
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

// Juan (4-oct): todo lugar abre su ficha; la foto 360° se abre desde su botón en la ficha
function abrirLugar(feature, el) {
  abrirPanel(feature, el);
}

// ---------- Pasar de una playa a otra (opción 1 de Juan, 3-oct) ----------
// Sobre la foto 360°, deslizar a la izquierda o a la derecha lleva a la siguiente playa con
// foto. En el celular el dedo queda para eso (la foto se recorre moviendo el teléfono); en la
// compu se sigue arrastrando con el mouse y se cambia de playa con las flechas del teclado.
// La primera vez en la visita sale un aviso que lo explica; abajo, unos puntitos dicen cuántas hay.
const tactil = window.matchMedia("(pointer: coarse)").matches;
let lugarInmersivo = null; // id del lugar que muestra la foto

// Los lugares con foto 360°, de norte a sur: deslizar recorre la costa en ese orden
function recorrido360() {
  return marcadores.filter(m => m.feature.properties.foto360)
    .sort((a, b) => b.feature.geometry.coordinates[1] - a.feature.geometry.coordinates[1]);
}

function irAOtraPlaya(paso) {
  const lista = recorrido360();
  const i = lista.findIndex(m => m.feature.properties.id === lugarInmersivo);
  if (lista.length < 2 || i < 0) return;
  const otra = lista[(i + paso + lista.length) % lista.length];
  abrirInmersivo(otra.feature, otra.el, { desde: paso > 0 ? "derecha" : "izquierda" });
}

function pistaYaVista() {
  try {
    if (sessionStorage.getItem("hey-pista-deslizar")) return true;
    sessionStorage.setItem("hey-pista-deslizar", "1");
  } catch {}
  return false;
}

function abrirInmersivo(feature, el, opciones = {}) {
  const p = feature.properties;
  cerrarPanel();
  cerrarInmersivo();
  lugarInmersivo = p.id;
  marcarLugar(el);
  encuadreLibre = false; // ya estamos viendo un lugar: no volver al encuadre general

  const secciones = p.categorias.filter(c => CATEGORIAS[c]).map(c => [c, CATEGORIAS[c]]);
  if (toursDelLugar(p).length) secciones.push(["tours", TAB_TOURS]);
  const lista = recorrido360();
  const variasPlayas = lista.length > 1;
  const pista = variasPlayas && !pistaYaVista() ? `
    <div class="inm-pista" role="status">
      <span class="inm-pista-mano" aria-hidden="true">👆</span>
      <p>${txt(tactil ? "pistaTactil" : "pistaTeclado")}</p>
    </div>` : "";
  const nombre = traducido(p).nombre;
  inmersivo.innerHTML = `
    <div class="inm-360${opciones.desde ? ` entra-${opciones.desde}` : ""}"></div>
    <div class="inm-arriba">
      <h2>${esc(nombre)}</h2>
      <button type="button" class="inm-cerrar" aria-label="${txt("volverFicha")}">✕</button>
    </div>
    <span class="inm-credito">${txt("credito360")}</span>
    ${pista}
    <div class="inm-abajo">
      ${variasPlayas ? `<div class="inm-puntos" aria-hidden="true">
        ${lista.map(m => `<span${m.feature === feature ? ' class="activo"' : ""}></span>`).join("")}
      </div>` : ""}
      <button type="button" class="inm-giro" aria-pressed="false" hidden></button>
      <nav class="inm-secciones" aria-label="${esc(txt("seccionesDe", nombre))}">
        ${secciones.map(([clave, cat]) => `
          <button type="button" data-cat="${clave}">
            <img src="${esc(cat.icono)}" alt=""><span>${esc(rotulo(cat))}</span>
          </button>`).join("")}
      </nav>
    </div>`;
  inmersivo.hidden = false;
  document.body.classList.add("con-inmersivo");

  inmersivo.querySelector(".inm-cerrar").addEventListener("click", salirDeLaFoto);
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
  // Pedido de Juan (3-oct): no una esfera completa, solo de lado a lado. La altura queda fija
  // cerca del horizonte (con el mínimo y el máximo casi iguales el visor la traba ahí), sin
  // mostrar el relleno de la toma, y el teléfono solo mueve la foto en horizontal.
  const toma = typeof p.foto360 === "string" ? { src: p.foto360 } : p.foto360;
  const vfov = 2 * Math.atan(Math.tan(hfov / 2 * rad) * cont.clientHeight / cont.clientWidth) / rad;
  const pitch = Math.min(Math.max(0, (toma.minPitch ?? -90) + vfov / 2), (toma.maxPitch ?? 90) - vfov / 2);
  // El aviso de deslizar se va solo, o apenas la persona toca la pantalla
  const pistaEl = inmersivo.querySelector(".inm-pista");
  if (pistaEl) {
    const quitarPista = () => {
      pistaEl.classList.add("fuera");
      setTimeout(() => pistaEl.remove(), 300);
    };
    setTimeout(quitarPista, 4000);
    inmersivo.addEventListener("pointerdown", quitarPista, { once: true });
  }

  // En el celular, un deslizón rápido de lado a lado cambia de playa
  if (tactil && variasPlayas) {
    let toque = null;
    cont.addEventListener("touchstart", (e) => {
      toque = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null;
    }, { passive: true });
    cont.addEventListener("touchend", (e) => {
      if (!toque) return;
      const dx = e.changedTouches[0].clientX - toque.x;
      const dy = e.changedTouches[0].clientY - toque.y;
      const rapido = Date.now() - toque.t < 800;
      toque = null;
      if (rapido && Math.abs(dx) > 50 && Math.abs(dx) > 1.3 * Math.abs(dy)) irAOtraPlaya(dx < 0 ? 1 : -1);
    });
  }

  crearVisor360(cont, p.foto360, {
    showFullscreenCtrl: false, mouseZoom: true, hfov, minHfov: 30,
    pitch, minPitch: pitch - 0.5, maxPitch: pitch + 0.5,
    draggable: !tactil,         // en el celular el dedo cambia de playa
    disableKeyboardCtrl: true,  // las flechas cambian de playa, no giran la foto
  }).then((v) => {
    if (!cont.isConnected) { v?.destroy(); return; }
    visorInmersivo = v;
    if (!v) return;
    soloHorizontal(v);
    v.on("load", () => soloHorizontal(v));
    prepararGiroscopio(v);
  });

  // Detrás, el mapa ya se acerca al lugar: al volver, la persona está ahí
  map.flyTo({ center: feature.geometry.coordinates, zoom: Math.max(map.getZoom(), 13), duration: 0 });
}

// Con el giroscopio, el visor inclina la foto si el teléfono se ladea ("roll"). Juan quiere
// que el teléfono solo la mueva de lado a lado: el roll queda siempre en 0. (getConfig()
// devuelve la configuración viva del visor; la altura ya está trabada con minPitch/maxPitch.)
function soloHorizontal(v) {
  Object.defineProperty(v.getConfig(), "roll", { get: () => 0, set() {}, configurable: true });
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
    btn.textContent = txt(activo ? "giroActivo" : "giroInactivo");
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
  lugarInmersivo = null;
  inmersivo.hidden = true;
  inmersivo.innerHTML = "";
  document.body.classList.remove("con-inmersivo");
}

// Al salir de la foto se vuelve a la ficha de donde se entró (4-oct). Si se pasó de playa
// deslizando, es la ficha de la última que se vio; el mapa se acerca a ella detrás.
function salirDeLaFoto() {
  const m = marcadores.find(x => x.feature.properties.id === lugarInmersivo);
  cerrarInmersivo();
  if (m) abrirPanel(m.feature, m.el);
}

// Escape: primero cierra la ficha; si no hay ficha, sale de la foto. Con la foto sola, las
// flechas pasan a la playa de al lado.
document.addEventListener("keydown", (e) => {
  if (inmersivo.hidden) return;
  if (e.key === "Escape") {
    if (!panel.hidden) cerrarPanel();
    else salirDeLaFoto();
  } else if (panel.hidden && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    irAOtraPlaya(e.key === "ArrowRight" ? 1 : -1);
  }
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
  const media = Math.round(alto * 0.62);
  if (nombre === "baja") return 60;
  if (nombre === "media") return media;
  // Encima de la 360° la ficha sube casi hasta arriba, dejando una franja de la foto (Juan, 3-oct)
  if (panel.classList.contains("sobre-360")) return alto - 56;
  return alto; // alta: toda la pantalla (Juan, 3-oct: "que se desplegara toda si fuese un teléfono")
}

function ponerAltura(nombre) {
  if (nombre === "baja" && alturaActual !== "baja") alturaAntesDeBajar = alturaActual;
  alturaActual = nombre;
  panel.style.height = pxDeAltura(nombre) + "px";
  panel.classList.toggle("baja", nombre === "baja");
  panel.classList.toggle("completa", nombre === "alta"); // en toda la pantalla se esconde la barra de arriba
  if (nombre === "baja") panel.scrollTop = 0;
  // Sobre la 360°: con la ficha bajada la foto vuelve a moverse; al subirla, se queda quieta
  if (panel.classList.contains("sobre-360") && !panel.hidden) congelarFoto(nombre !== "baja");
  panelAsa.setAttribute("aria-label", txt(nombre === "baja" ? "subirFicha" : "bajarFicha"));
}

// En escritorio (o al cerrar) la ficha vuelve a medirse sola con el CSS
function soltarAltura() {
  panel.style.height = "";
  panel.classList.remove("baja", "completa", "arrastrando");
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
// La vista 3D se queda con el dedo (ahí se gira el lugar), y el campo de texto también.
let gestoHoja = null; // null = sin decidir, "hoja" o "scroll"
panel.addEventListener("touchstart", (e) => {
  gestoHoja = null;
  if (!anchoMovil.matches || e.touches.length !== 1) return;
  if (e.target.closest(".panel-asa, .hero-3d, .marea-grafica, input")) return;
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

// ---------- Estilo del mapa ----------
// Juan (6-oct): de momento, siempre Noche (ver ESTILO arriba); la barra ya no tiene botón
// para elegir. Lo de abajo sirve para cualquiera de los dos estilos.
const estiloActual = ESTILO;

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

// Cuando carga el estilo aplicamos los ajustes y agregamos las capas propias
map.on("style.load", () => {
  const e = ESTILOS[estiloActual];
  if (e.paleta) aplicarPaleta(e.paleta);
  if (estiloActual === "noche") nombresEnBlanco();
  if (terrenoActivo) agregarTerreno();
  agregarCurvas();
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
      attribution: "Mapzen / AWS Terrain Tiles",
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
// Juan (6-oct): las curvas están siempre prendidas, así que ya no tienen botón.

// Si el plugin no cargó (sin conexión al CDN), el mapa sigue funcionando sin curvas
const demCurvas = window.mlcontour
  ? new mlcontour.DemSource({ url: TILES_TERRENO, encoding: "terrarium", maxzoom: 13, worker: true })
  : null;
if (demCurvas) demCurvas.setupMaplibre(maplibregl);

// Metros entre curvas según el zoom: [curva fina, curva maestra]
const SEPARACION_CURVAS = {
  9:  [100, 500],
  11: [50, 250],
  13: [25, 100],
  14: [10, 50],
  15: [5, 25],
};

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
      attribution: "AWS Terrain Tiles",
      // Todas las curvas de una misma altura comparten id: así la ola de luz las enciende juntas
      promoteId: { curvas: "ele" },
    });
    luzPintada.clear(); // fuente nueva: arranca toda apagada
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
  // La ola de luz (ver más abajo): encima de las curvas, apagada mientras no pasa
  if (!map.getLayer("curvas-ola")) {
    map.addLayer({ id: "curvas-ola", type: "line", ...base, filter: enTierra,
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
  map.once("idle", () => olaCurvas());
}

// Neón con brillo sobre el fondo oscuro de Noche; en Pura Vida, turquesa sobrio sin
// brillo, porque sobre arena el resplandor se ve sucio.
function pintarCurvas() {
  if (!map.getLayer("curvas-linea")) return;
  const neon = estiloActual === "noche";
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

  // La ola: blanca casi pura sobre lo oscuro, turquesa fuerte sobre lo claro
  map.setPaintProperty("curvas-ola", "line-color", neon ? "#e8fffd" : "#0fb5bd");
  map.setPaintProperty("curvas-ola", "line-width",
    porZoom(9, ["case", maestra, 2, 1.2], 14, ["case", maestra, 4, 2.4]));
  map.setPaintProperty("curvas-ola", "line-blur", porZoom(9, 0.8, 14, 1.6));
  map.setPaintProperty("curvas-ola", "line-opacity", ["coalesce", ["feature-state", "luz"], 0]);

  map.setPaintProperty("curvas-etiquetas", "text-color", neon ? "#8ffff6" : "#0b6f75");
  map.setPaintProperty("curvas-etiquetas", "text-halo-color",
    neon ? "rgba(3, 14, 22, 0.85)" : "rgba(255, 255, 255, 0.85)");
  map.setPaintProperty("curvas-etiquetas", "text-halo-width", 1.2);
}

// ---------- La ola de luz por las curvas ----------
// Idea de Juan (3-oct): las curvas de nivel simbolizan la conexión (cada línea une todos
// los puntos que están a la misma altura) y tienen que transmitir sinceridad, aventura y
// conexión. Una ola de luz sube por ellas desde el mar hasta la montaña al abrir el mapa y
// cada vez que se abre un lugar: el mapa responde. Sigue la altura real del terreno.
const OLA_TOPE = 800, OLA_PASO = 5, OLA_ANCHO = 70, OLA_DURACION = 2600; // metros y ms
let olaAnimacion = null;
const luzPintada = new Map(); // altura → luz que ya tiene, para no repintar lo que no cambió

// "frentes": las alturas por donde va pasando la luz en este momento
function pintarOla(frentes, intensidad = 1, ancho = OLA_ANCHO) {
  if (!map.getSource("curvas")) return;
  for (let ele = OLA_PASO; ele <= OLA_TOPE; ele += OLA_PASO) {
    const luz = intensidad * Math.max(0, ...frentes.map(f => 1 - Math.abs(ele - f) / ancho));
    if (Math.abs((luzPintada.get(ele) ?? 0) - luz) < 0.01) continue;
    luzPintada.set(ele, luz);
    map.setFeatureState({ source: "curvas", sourceLayer: "curvas", id: ele }, { luz });
  }
}

// Sin "desde", la ola sube del mar a la montaña; con "desde" (una altura), se abre desde ahí
function olaCurvas(desde = null) {
  if (!map.getLayer("curvas-ola")) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  cancelAnimationFrame(olaAnimacion);
  cancelAnimationFrame(dedo.anim);
  dedo.luz = dedo.objetivo = 0;
  const recorrido = desde == null ? OLA_TOPE + 2 * OLA_ANCHO : Math.max(desde, OLA_TOPE - desde) + OLA_ANCHO;
  const inicio = performance.now();
  const paso = (ahora) => {
    const t = Math.min(1, (ahora - inicio) / OLA_DURACION);
    const d = (1 - (1 - t) ** 2) * recorrido; // arranca rápido y se va calmando
    pintarOla(desde == null ? [d - OLA_ANCHO] : [desde + d, desde - d]);
    if (t < 1) olaAnimacion = requestAnimationFrame(paso);
  };
  olaAnimacion = requestAnimationFrame(paso);
}

// La altura de la curva que pasa más cerca de un punto de la pantalla (null si no hay)
function alturaEn(punto, radio = 14) {
  if (!map.getLayer("curvas-linea")) return null;
  const caja = [[punto.x - radio, punto.y - radio], [punto.x + radio, punto.y + radio]];
  const cerca = map.queryRenderedFeatures(caja, { layers: ["curvas-linea"] });
  return cerca.length ? cerca[0].properties.ele : null;
}

// ---------- Las mini oleadas del lugar seleccionado ----------
// Juan (3-oct): solo el lugar seleccionado (el que está abierto o queda marcado, parpadeando)
// lanza mini oleadas de luz por las curvas de nivel, hasta 1 km a su alrededor, como una
// piedra que cae al agua. Siguen saliendo mientras el lugar siga marcado, aunque la persona
// cambie de categoría; se apagan al tocar el mapa o abrir otro lugar. Se dibujan en una capa
// transparente encima del mapa, sobre las mismas curvas reales que muestra el mapa.
const ONDA_RADIO_M = 1000, ONDA_CADA = 700, ONDA_VIDA = 2100; // metros y ms
const ondaCanvas = document.createElement("canvas");
ondaCanvas.className = "onda-curvas";
map.getCanvas().after(ondaCanvas); // debajo de los marcadores, encima del mapa
const ondaCtx = ondaCanvas.getContext("2d");
let ondaLugar = null;      // [lng, lat] del lugar seleccionado
let ondaInicio = 0;
let ondaAnimacion = null;
let ondaCurvas = null;     // las curvas alrededor del lugar, ya pasadas a la pantalla

function ajustarOndaCanvas() {
  const c = map.getCanvas(), dpr = window.devicePixelRatio || 1;
  ondaCanvas.width = c.clientWidth * dpr;
  ondaCanvas.height = c.clientHeight * dpr;
  ondaCanvas.style.width = c.clientWidth + "px";
  ondaCanvas.style.height = c.clientHeight + "px";
  ondaCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ondaCurvas = null;
}
ajustarOndaCanvas();
map.on("resize", ajustarOndaCanvas);
// Si el mapa se mueve o cargan curvas nuevas, se vuelven a leer las curvas alrededor del lugar
map.on("move", () => { ondaCurvas = null; });
map.on("sourcedata", (e) => { if (e.sourceId === "curvas") ondaCurvas = null; });

function ondasEn(coords) {
  ondaLugar = coords;
  ondaInicio = performance.now();
  ondaCurvas = null;
  if (ondaLugar && !ondaAnimacion) ondaAnimacion = requestAnimationFrame(pintarOndas);
}

function leerCurvasAlrededor() {
  const [lng, lat] = ondaLugar;
  const centro = map.project(ondaLugar);
  const borde = map.project([lng + ONDA_RADIO_M / (111320 * Math.cos(lat * Math.PI / 180)), lat]);
  const radio = Math.hypot(borde.x - centro.x, borde.y - centro.y);
  const finas = new Path2D(), maestras = new Path2D();
  const caja = [[centro.x - radio, centro.y - radio], [centro.x + radio, centro.y + radio]];
  for (const f of map.queryRenderedFeatures(caja, { layers: ["curvas-linea"] })) {
    const g = f.geometry;
    const lineas = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
    const camino = f.properties.level > 0 ? maestras : finas;
    for (const linea of lineas) {
      linea.forEach((c, k) => {
        const p = map.project(c);
        if (k) camino.lineTo(p.x, p.y);
        else camino.moveTo(p.x, p.y);
      });
    }
  }
  return { centro, radio, finas, maestras };
}

function pintarOndas(ahora) {
  ondaCtx.clearRect(0, 0, ondaCanvas.width, ondaCanvas.height);
  if (!ondaLugar) { ondaAnimacion = null; return; }
  ondaAnimacion = requestAnimationFrame(pintarOndas);
  if (!map.getLayer("curvas-linea") || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  ondaCurvas ??= leerCurvasAlrededor();
  const { centro, radio, finas, maestras } = ondaCurvas;
  if (radio < 8) return; // tan lejos que 1 km casi no se ve
  const neon = estiloActual === "noche";
  const edad = ahora - ondaInicio;
  const ultima = Math.floor(edad / ONDA_CADA);
  // Las oleadas que están vivas ahora: cada una sale del lugar, se frena y se apaga en 1 km
  for (let k = Math.max(0, ultima - Math.ceil(ONDA_VIDA / ONDA_CADA)); k <= ultima; k++) {
    const t = (edad - k * ONDA_CADA) / ONDA_VIDA;
    if (t <= 0 || t >= 1) continue;
    const r = radio * (1 - (1 - t) ** 2);
    const ancho = Math.max(5, radio * 0.16);
    ondaCtx.save();
    ondaCtx.beginPath();
    ondaCtx.arc(centro.x, centro.y, r, 0, Math.PI * 2);
    ondaCtx.arc(centro.x, centro.y, Math.max(0, r - ancho), 0, Math.PI * 2, true);
    ondaCtx.clip();
    ondaCtx.globalAlpha = 1 - t;
    ondaCtx.strokeStyle = neon ? "#e8fffd" : "#0fb5bd";
    ondaCtx.shadowColor = neon ? "#00f0ff" : "rgba(15, 181, 189, 0.7)";
    ondaCtx.shadowBlur = 8;
    ondaCtx.lineJoin = ondaCtx.lineCap = "round";
    ondaCtx.lineWidth = 1.8;
    ondaCtx.stroke(finas);
    ondaCtx.lineWidth = 3;
    ondaCtx.stroke(maestras);
    ondaCtx.restore();
  }
}

// Cambio de Juan (3-oct): nada de tocar el cerro. Las curvas responden solas mientras la
// persona recorre el mapa con los dedos (arrastrar, acercar, girar): se enciende la curva
// de la altura que pasa por el centro de la pantalla, sube y baja con el terreno, y al
// soltar se apaga suave. Solo con los movimientos de la persona, no con los automáticos.
const DEDO_ANCHO = 30; // metros: brilla la curva de esa altura y apenas sus vecinas
const dedo = { altura: null, luz: 0, objetivo: 0, anim: null };

function seguirDedo() {
  cancelAnimationFrame(dedo.anim);
  const paso = () => {
    dedo.luz += (dedo.objetivo - dedo.luz) * 0.15;
    if (Math.abs(dedo.objetivo - dedo.luz) < 0.01) dedo.luz = dedo.objetivo;
    pintarOla(dedo.altura == null ? [] : [dedo.altura], dedo.luz, DEDO_ANCHO);
    if (dedo.luz !== dedo.objetivo) dedo.anim = requestAnimationFrame(paso);
  };
  dedo.anim = requestAnimationFrame(paso);
}

map.on("move", (e) => {
  if (!e.originalEvent) return;
  const c = map.getContainer();
  const ele = alturaEn({ x: c.clientWidth / 2, y: c.clientHeight / 2 }, 24);
  if (ele == null) return;
  cancelAnimationFrame(olaAnimacion); // si la ola de entrada iba pasando, la persona manda
  dedo.altura = dedo.altura == null ? ele : dedo.altura + (ele - dedo.altura) * 0.5;
  dedo.objetivo = 1;
  seguirDedo();
});
map.on("moveend", () => {
  if (dedo.objetivo === 0) return;
  dedo.objetivo = 0;
  seguirDedo();
});

// ---------- Ayudante de coordenadas (para agregar puntos nuevos) ----------
// Juan (6-oct): el visitante no lo ve. Para cargar un lugar nuevo se abre la página con
// ?coords al final de la dirección (ej. http://localhost:5173/?coords) y aparece abajo a la
// izquierda, como antes.
const conCoords = new URLSearchParams(location.search).has("coords");
if (conCoords) document.getElementById("coords").hidden = false;
else document.getElementById("coords").remove();
const coordsText = document.getElementById("coords-text");
const coordsCopy = document.getElementById("coords-copy");
let ultimaCoord = null;

map.on("click", (e) => {
  // Tocar el mapa (fuera de un lugar) quita la marca que dejó la foto 360°
  if (panel.hidden && inmersivo.hidden) marcarLugar(null);
  if (!conCoords) return;
  const lng = +e.lngLat.lng.toFixed(5);
  const lat = +e.lngLat.lat.toFixed(5);
  ultimaCoord = `[${lng}, ${lat}]`;
  coordsText.innerHTML = `Lat <code>${lat}</code> · Lng <code>${lng}</code> · GeoJSON: <code>${ultimaCoord}</code>`;
  coordsCopy.hidden = false;
  coordsCopy.textContent = txt("copiar");
});

coordsCopy?.addEventListener("click", async () => {
  if (!ultimaCoord) return;
  try {
    await navigator.clipboard.writeText(ultimaCoord);
    coordsCopy.textContent = txt("copiado");
  } catch {
    coordsCopy.textContent = txt("copiarAMano");
  }
});

// ---------- Cambiar de idioma (ver "Idioma" arriba) ----------
// Pone en el idioma elegido todo lo que ya está en pantalla: los textos fijos de la página
// (data-t en index.html), los nombres de las categorías y de los lugares, y
// la ficha abierta, que se vuelve a pintar en la misma sección.
const botonesIdioma = document.querySelectorAll("#idioma button");

function aplicarIdioma() {
  document.documentElement.lang = getIdioma();
  document.title = txt("titulo");
  document.querySelectorAll("[data-t]").forEach(n => { n.textContent = txt(n.dataset.t); });
  document.querySelectorAll("[data-t-title]").forEach(n => { n.title = txt(n.dataset.tTitle); });
  document.querySelectorAll("[data-t-aria]").forEach(n => n.setAttribute("aria-label", txt(n.dataset.tAria)));
  botonesIdioma.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.idioma === getIdioma())));

  for (const b of listaCapasEl.querySelectorAll(".capa")) {
    nombrarFilaCapa(b, b.dataset.cat === "todos" ? CAT_TODAS : CATEGORIAS[b.dataset.cat]);
  }
  marcadores.forEach(m => nombrarMarcador(m.el, m.feature));
  sincronizarCapas(marcadores.filter(m => m.enMapa).length);
  panelAsa.setAttribute("aria-label", txt(alturaActual === "baja" ? "subirFicha" : "bajarFicha"));
  if (conCoords && !ultimaCoord) coordsText.textContent = txt("coordsAyuda");
  if (conCoords) coordsCopy.textContent = txt("copiar");
  sincronizarGiro?.();
  if (dialogoPropuesta.open) (enPrecios ? pintarPrecios : enBarra ? pintarBarra : enArmado ? pintarArmado : pintarPropuestaGratis)();

  if (lugarAbierto) {
    const { feature, el, sobre360, vista } = lugarAbierto;
    abrirPanel(feature, el, { cat: vista(), sobre360, refrescar: true });
  }
}

botonesIdioma.forEach(b => b.addEventListener("click", () => {
  if (b.dataset.idioma === getIdioma()) return;
  setIdioma(b.dataset.idioma);
  try { localStorage.setItem("hey-idioma", getIdioma()); } catch { /* sin almacenamiento: vale para esta visita */ }
  aplicarIdioma();
}));
aplicarIdioma();
