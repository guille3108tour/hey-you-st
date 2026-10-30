/* =========================================================
   Hey You ST · Ficha del lugar (panel)
   La ficha de detalle del lugar: portada 3D, foto 360°, texto por pestaña, tours y
   el botón de cómo llegar. Abre, cierra y marca el lugar en el mapa.
   ========================================================= */
import { txt, traducido } from "./i18n.js";
import { esc } from "./util.js";
import { CATEGORIAS, rotulo, crearIcono, anchoMovil, sinMovimiento, TILES_SATELITE, TILES_TERRENO } from "./config.js";
import { llenarMarea, llenarIdealHoy } from "./mareas.js";
import { map, ondasEn, setEncuadreLibre } from "./mapa.js";
import { ponerCategoria, categoriasActivas } from "./filtros.js";
import { renderMarcadores, marcadores } from "./marcadores.js";
import { abrirInmersivo, congelarFoto, salirDeLaFoto, inmersivo } from "./inmersivo.js";
import { ponerAltura, soltarAltura, asaNombre } from "./hoja.js";

// ---------- Panel de detalle ----------
export const panel = document.getElementById("panel");
const panelBody = document.getElementById("panel-body");
export let lugarAbierto = null; // { categorias, pintarVista } del lugar que muestra el panel
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
export async function crearVisor360(contenedor, foto360, ajustes = {}) {
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
export const TAB_TOURS = { label: "Meet a local", icono: "img/iconos/tours.png" };

export function toursDelLugar(p) {
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
export function abrirPanel(feature, el, opciones = {}) {
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
  setEncuadreLibre(false); // ya estamos viendo un lugar: no volver al encuadre general
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

export function cerrarPanel() {
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
export function marcarLugar(el, { conNombre = false } = {}) {
  document.querySelectorAll(".marker.activo, .marker.marcado")
    .forEach(m => m.classList.remove("activo", "marcado"));
  if (el) el.classList.add("activo");
  if (el && conNombre) el.classList.add("marcado");
  renderMarcadores(); // si el que dejó de estar marcado no es de la categoría elegida, se va
  // El lugar seleccionado lanza sus mini oleadas por las curvas; sin lugar, se apagan
  ondasEn(el ? marcadores.find(m => m.el === el)?.feature.geometry.coordinates ?? null : null);
}

