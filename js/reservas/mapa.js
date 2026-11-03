/* =========================================================
   Hey You ST · Sistema de reservas · El mapa (MapLibre)
   ---------------------------------------------------------
   El mapa va SIEMPRE al fondo: blanco, sencillo, con las líneas de costa. Encima flota
   el cuerpo del sistema. Cuando la persona abre una actividad, el mapa muestra dónde
   queda; si es el tour a pie (Piedra Colorada), dibuja solo los puntos de ese recorrido
   en orden y enfoca ahí.
   ========================================================= */
import { colorCat } from "./estado.js";

// Recuadro de la zona (Montezuma + Santa Teresa) por si no hay actividades que encuadrar
const LIMITES = [[-85.22, 9.55], [-85.00, 9.70]];

// Estilo claro y minimalista de OpenFreeMap; lo recoloreamos a blanco al cargar.
const ESTILO = "https://tiles.openfreemap.org/styles/positron";

export const map = new maplibregl.Map({
  container: "map",
  style: ESTILO,
  bounds: LIMITES,
  fitBoundsOptions: { padding: 60 },
  attributionControl: { compact: true },
  dragRotate: false,
  pitchWithRotate: false,
});
map.touchZoomRotate.disableRotation();
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

// Al cargar el estilo lo dejamos blanco: fondo blanco pleno, mar en azul suave para que
// la costa se lea, y fuera los íconos de negocios. Lo demás de positron ya es sobrio.
map.on("style.load", () => blanquear());
function blanquear() {
  const capas = map.getStyle().layers || [];
  for (const l of capas) {
    const id = l.id;
    if (l.type === "background") set(id, "background-color", "#ffffff");
    else if (/water|ocean|sea|river|lake/i.test(id) && l.type === "fill") set(id, "fill-color", "#dbeaf0");
    else if (/water|river|stream/i.test(id) && l.type === "line") set(id, "line-color", "#cfe2ea");
    else if (/poi/i.test(id)) hide(id);             // fuera los íconos de comercios
    else if (/^(building)/i.test(id) && l.type === "fill") { set(id, "fill-color", "#f1f1ee"); set(id, "fill-opacity", 0.7); }
    else if (/landcover|landuse|park|wood|grass/i.test(id) && l.type === "fill") set(id, "fill-opacity", 0.5);
  }
  map.once("idle", () => {
    map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
  });
}
function set(id, prop, v) { if (map.getLayer(id)) try { map.setPaintProperty(id, prop, v); } catch { /* capa sin esa prop */ } }
function hide(id) { if (map.getLayer(id)) try { map.setLayoutProperty(id, "visibility", "none"); } catch { /* ignore */ } }

// ---------- Marcadores ----------
let marcadoresGenerales = [];
let marcadoresRuta = [];
let listaActual = [];
let onClickActividad = null;

function limpiar(arr) { arr.forEach(m => m.remove()); arr.length = 0; }

function nodoPunto({ color, pago, numero, etiqueta }) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "mk" + (pago ? " mk-pago" : "") + (numero ? " mk-num" : "");
  el.style.setProperty("--mk", color);
  el.setAttribute("aria-label", etiqueta || "");
  el.innerHTML = numero ? `<span>${numero}</span>` : "";
  return el;
}

// Pinta los marcadores de una lista de actividades (vista explorar).
export function setActividades(lista, onClick) {
  listaActual = lista;
  onClickActividad = onClick;
  dibujarGenerales();
}
function dibujarGenerales() {
  limpiar(marcadoresGenerales);
  for (const a of listaActual) {
    if (!a.coords) continue;
    const el = nodoPunto({ color: colorCat(a.categorias[0]), pago: a.pago, etiqueta: a.nombre?.es });
    el.addEventListener("click", (e) => { e.stopPropagation(); onClickActividad?.(a); });
    const m = new maplibregl.Marker({ element: el }).setLngLat(a.coords).addTo(map);
    marcadoresGenerales.push(m);
  }
}

// ---------- Vistas ----------
const padMovil = () => (window.matchMedia("(max-width: 820px)").matches
  ? { top: 80, bottom: window.innerHeight * 0.62, left: 30, right: 30 }
  : { top: 90, bottom: 90, left: 440, right: 80 });

export function vistaGeneral() {
  quitarRuta();
  marcadoresGenerales.forEach(m => m.getElement().classList.remove("mk-off"));
  const pts = listaActual.map(a => a.coords).filter(Boolean);
  if (!pts.length) { map.fitBounds(LIMITES, { padding: 60, duration: 600 }); return; }
  map.fitBounds(limites(pts), { padding: padMovil(), maxZoom: 13.5, duration: 700 });
}

// Al abrir una actividad: si es ruta/tour con paradas, dibuja solo sus puntos; si no,
// centra y resalta su punto. `onParada(i)` se llama al tocar un punto numerado.
export function enfocarActividad(a, { onParada } = {}) {
  quitarRuta();
  // Atenúa los marcadores generales mientras se ve el detalle
  marcadoresGenerales.forEach(m => m.getElement().classList.add("mk-off"));

  if (a.paradas && a.paradas.length) {
    dibujarRuta(a, onParada);
    const pts = a.paradas.map(p => p.coords);
    map.fitBounds(limites(pts), { padding: padMovil(), maxZoom: 15, duration: 800 });
  } else if (a.coords) {
    const el = nodoPunto({ color: colorCat(a.categorias[0]), pago: a.pago, etiqueta: a.nombre?.es });
    el.classList.add("mk-solo");
    marcadoresRuta.push(new maplibregl.Marker({ element: el }).setLngLat(a.coords).addTo(map));
    map.flyTo({ center: a.coords, zoom: 14, duration: 900, padding: padMovil() });
  }
}

function dibujarRuta(a, onParada) {
  // La línea del recorrido (fuente GeoJSON)
  const coords = a.paradas.map(p => p.coords);
  const geo = { type: "Feature", geometry: { type: "LineString", coordinates: coords } };
  if (map.getSource("ruta")) map.getSource("ruta").setData(geo);
  else {
    map.addSource("ruta", { type: "geojson", data: geo });
    map.addLayer({
      id: "ruta-linea", type: "line", source: "ruta",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#0f8a8f", "line-width": 3, "line-dasharray": [1.5, 1.2], "line-opacity": 0.85 },
    });
  }
  // Un pin numerado por parada (solo los puntos de ESTE tour)
  a.paradas.forEach((p, i) => {
    const el = nodoPunto({ color: "#0f8a8f", numero: p.orden, etiqueta: p.nombre?.es });
    el.dataset.parada = i;
    el.addEventListener("click", (e) => { e.stopPropagation(); onParada?.(i); });
    marcadoresRuta.push(new maplibregl.Marker({ element: el }).setLngLat(p.coords).addTo(map));
  });
}

// Resalta la parada i (la agranda y centra el mapa en ella)
export function resaltarParada(i) {
  marcadoresRuta.forEach(m => m.getElement().classList.toggle("mk-activo", m.getElement().dataset.parada === String(i)));
  const activo = marcadoresRuta.find(m => m.getElement().dataset.parada === String(i));
  if (activo) map.easeTo({ center: activo.getLngLat(), duration: 600, padding: padMovil() });
}

function quitarRuta() {
  limpiar(marcadoresRuta);
  if (map.getLayer("ruta-linea")) map.removeLayer("ruta-linea");
  if (map.getSource("ruta")) map.removeSource("ruta");
}

function limites(pts) {
  return pts.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(pts[0], pts[0]));
}

export function reajustar() { map.resize(); }
