/* =========================================================
   Hey You ST · Península de Nicoya — lógica del mapa
   ========================================================= */

import { getIdioma, setIdioma, enIngles, ETAPAS_EN, txt, traducido } from "./i18n.js";
import { esc, usd, primeraFrase } from "./util.js";
import {
  CATEGORIAS, rotulo, CAT_TODAS, crearIcono, LUGARES, LIMITES_LUGARES,
  anchoMovil, margenEncuadre, sinMovimiento, TILES_SATELITE, TILES_TERRENO, ESTILOS, ESTILO,
} from "./config.js";
import { cargarMareas, ventanasIdeales, llenarMarea, llenarIdealHoy, DIA } from "./mareas.js";
import { map, ondasEn, setEncuadreLibre } from "./mapa.js";
import {
  dialogoPropuesta, enArmado, enPrecios, enBarra,
  pintarArmado, pintarPrecios, pintarBarra, pintarPropuestaGratis,
} from "./laboratorio.js";

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
  setEncuadreLibre(false); // ya estamos viendo un lugar: no volver al encuadre general

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
