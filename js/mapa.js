/* =========================================================
   Hey You ST · El mapa (MapLibre)
   La instancia del mapa y su encuadre; el recoloreo del estilo base, el terreno 3D,
   las curvas de nivel neón, la ola de luz y las mini oleadas del lugar marcado.
   Expone `map` (lo usan marcadores, panel e inmersivo) y `ondasEn` (lo llama el panel).
   ========================================================= */
import { LIMITES_LUGARES, margenEncuadre, ESTILO, ESTILOS, TILES_TERRENO } from "./config.js";

// ---------- Mapa ----------
export const map = new maplibregl.Map({
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
// El panel y el modo inmersivo lo apagan al abrir un lugar: a partir de ahí la vista es suya
// y el mapa no vuelve al encuadre general al cambiar de tamaño.
export function setEncuadreLibre(v) { encuadreLibre = v; }

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

export function ondasEn(coords) {
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

