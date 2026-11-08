/* =========================================================
   Hey You ST · Caminatas gratis (reseña paso a paso)
   Un "día gratis": una ruta a pie contada paso a paso, sin pagar entrada. Al desplegar una
   ruta, el mapa deja de mostrar categorías y muestra SOLO sus paradas (filtros → modo ruta),
   y la hoja cuenta la reseña. Los datos viven en data/rutas.js (global RUTAS); las paradas
   con "lugar" se cruzan con los puntos del mapa (config → LUGARES) para encuadrar y ubicar.
   ========================================================= */
import { txt, traducido } from "./i18n.js";
import { esc } from "./util.js";
import { LUGARES, anchoMovil } from "./config.js";
import { map } from "./mapa.js";
import { encuadrarPuntos } from "./mapa.js";
import { activarRuta, limpiarRuta, onSalirDeRuta } from "./filtros.js";
import { panel, cerrarPanel, marcarLugar } from "./panel.js";
import { marcadores } from "./marcadores.js";
import { abrirInmersivo } from "./inmersivo.js";
import { ponerAltura } from "./hoja.js";

const panelBody = document.getElementById("panel-body");

// id de parada -> coordenadas del punto en el mapa (solo las paradas que tienen ficha)
const COORDS_POR_ID = new Map(LUGARES.map(f => [f.properties.id, f.geometry.coordinates]));

// Las coordenadas de una parada: su ficha en el mapa (p.lugar) o las que trae puestas (p.coords).
function coordsDeParada(p) {
  return (p.lugar && COORDS_POR_ID.get(p.lugar)) || p.coords || null;
}

// Las paradas de una ruta que tienen ubicación, en orden, para dibujarlas en el mapa como
// pines numerados. "numero" es el paso en la reseña (1..N), así el pin y el paso coinciden;
// una parada sin coordenadas (ej. ASVO, hasta que tenga ubicación) no sale en el mapa y deja
// su número sin pin. "coords" es el recorrido, para encuadrar.
function paradasEnMapa(ruta) {
  const stops = [];
  const coords = [];
  ruta.paradas.forEach((paradaOriginal, i) => {
    const c = coordsDeParada(paradaOriginal);
    if (!c) return;
    const clave = c.join(",");
    if (stops.some(s => s.coords.join(",") === clave)) return; // sin repetir una misma ubicación
    const p = traducido(paradaOriginal);
    stops.push({ coords: c, nombre: p.nombre, rol: paradaOriginal.rol, numero: i + 1 });
    coords.push(c);
  });
  return { stops, coords };
}

// ---------- Pines de la ruta en el mapa ----------
// En modo ruta ocultamos los marcadores de categoría y dibujamos los nuestros: un pin numerado
// por parada, en orden, para que se lea el recorrido (Playa Grande incluida) de un vistazo.
let marcadoresRuta = [];
function limpiarMarcadoresRuta() {
  marcadoresRuta.forEach(m => m.remove());
  marcadoresRuta = [];
}
function pintarMarcadoresRuta(stops) {
  limpiarMarcadoresRuta();
  for (const s of stops) {
    const el = document.createElement("div");
    el.className = "marker marker-ruta" + (s.rol ? " marker-ruta-" + s.rol : "");
    el.title = s.nombre;
    // Pin de mapa (gota) con el número dentro; la punta marca el punto exacto. El inicio y el
    // final llevan además su rótulo de texto (Inicio / Final) sobre el pin.
    const rotulo = s.rol === "inicio" ? txt("rutaInicio") : s.rol === "meta" ? txt("rutaMeta") : null;
    el.innerHTML =
      `${rotulo ? `<span class="pin-rotulo">${esc(rotulo)}</span>` : ""}` +
      `<div class="pin-cuerpo">${s.numero}</div><div class="pin-punta"></div>`;
    const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat(s.coords).addTo(map);
    marcadoresRuta.push(marker);
  }
}
onSalirDeRuta(limpiarMarcadoresRuta); // al salir del modo ruta (cerrar panel, plegar) se van

// ---------- Abrir el panel de caminatas ----------
let rutaDesplegada = null; // id de la ruta cuya reseña está abierta (una a la vez)

export function abrirCaminatas() {
  rutaDesplegada = null;
  limpiarRuta();
  panel.classList.add("panel-ruta");
  panel.classList.remove("sobre-360");

  const tarjetas = RUTAS.map(htmlTarjetaRuta).join("");
  panelBody.innerHTML = `
    <div class="caminatas">
      <header class="caminatas-cab">
        <h2>${esc(txt("caminatasTitulo"))}</h2>
        <p>${esc(txt("caminatasIntro"))}</p>
      </header>
      <div class="caminatas-lista">${tarjetas}</div>
    </div>`;

  panelBody.querySelectorAll("[data-ruta-toggle]").forEach(btn =>
    btn.addEventListener("click", () => alternarRuta(btn.dataset.rutaToggle)));
  panelBody.querySelectorAll("[data-parada-coords]").forEach(btn =>
    btn.addEventListener("click", () => verParadaEnMapa(btn.dataset.paradaCoords)));
  panelBody.querySelectorAll("[data-parada-360]").forEach(btn =>
    btn.addEventListener("click", () => verParada360(btn.dataset.parada360)));

  panel.hidden = false;
  panel.scrollTop = 0;
  if (anchoMovil.matches) ponerAltura("alta");
}

// Tarjeta de una ruta: cabecera siempre visible + reseña plegable (data/rutas.js).
function htmlTarjetaRuta(rutaOriginal) {
  const r = traducido(rutaOriginal);
  const meta = [txt("rutaGratis"), txt("rutaAPie"), r.camino].filter(Boolean)
    .map(m => `<span class="caminata-chip">${esc(m)}</span>`).join("");
  return `
    <article class="caminata" data-ruta="${esc(r.id)}">
      <button type="button" class="caminata-cab" data-ruta-toggle="${esc(r.id)}" aria-expanded="false">
        <span class="caminata-icono" aria-hidden="true">${esc(r.icono || "🥾")}</span>
        <span class="caminata-cab-txt">
          <span class="caminata-nombre">${esc(r.nombre)}</span>
          <span class="caminata-chips">${meta}</span>
          <span class="caminata-entrada">${esc(r.entrada || "")}</span>
        </span>
        <span class="caminata-flecha" aria-hidden="true">▾</span>
      </button>
      <div class="caminata-reseña" hidden>${htmlResena(rutaOriginal)}</div>
    </article>`;
}

// La reseña paso a paso: aviso del mapa, marea, paradas en orden y notas.
function htmlResena(rutaOriginal) {
  const r = traducido(rutaOriginal);
  const marea = rutaOriginal.marea ? traducido(rutaOriginal.marea) : null;

  const pasos = rutaOriginal.paradas.map((paradaOriginal, i) => {
    const p = traducido(paradaOriginal);
    const coords = coordsDeParada(paradaOriginal);
    const verMapa = coords
      ? `<button type="button" class="parada-mapa" data-parada-coords="${coords.join(",")}">${esc(txt("rutaVerEnMapa"))}</button>`
      : "";
    // 360° del punto: aparece solo si la parada es un punto de la guía con foto 360° (las fotos
    // se agregan al punto en data/points.js; sin foto, no sale el botón).
    const m360 = paradaOriginal.lugar && marcadores.find(x => x.feature.properties.id === paradaOriginal.lugar);
    const ver360 = m360 && m360.feature.properties.foto360
      ? `<button type="button" class="parada-360" data-parada-360="${esc(paradaOriginal.lugar)}">${esc(txt("rutaVer360"))}</button>`
      : "";
    // Todas las paradas van numeradas; inicio/meta/comida suman su insignia de texto.
    const rol = paradaOriginal.rol;
    const BADGE = { inicio: "rutaInicio", meta: "rutaMeta", comida: "rutaComida" };
    const marca = i + 1;
    const badge = BADGE[rol] ? `<span class="parada-badge badge-${rol}">${esc(txt(BADGE[rol]))}</span>` : "";
    return `
      <li class="parada${rol ? " parada-" + rol : ""}">
        <span class="parada-num">${marca}</span>
        <div class="parada-cuerpo">
          ${badge}
          <h4 class="parada-nombre">${esc(p.nombre)}${p.min ? ` <span class="parada-min">· ${esc(p.min)}</span>` : ""}</h4>
          <p class="parada-texto">${esc(p.texto)}</p>
          <div class="parada-acciones">${verMapa}${ver360}</div>
        </div>
      </li>`;
  }).join("");

  const notas = (r.notas || []).map(n => `<li>${esc(n)}</li>`).join("");

  return `
    <p class="caminata-aviso">🗺️ ${esc(txt("rutaSoloEnMapa"))}</p>
    ${marea ? `<p class="caminata-marea">🌊 ${esc(marea.texto)}</p>` : ""}
    <ol class="paradas">${pasos}</ol>
    ${notas ? `<div class="caminata-notas"><h5>${esc(txt("rutaNotas"))}</h5><ul>${notas}</ul></div>` : ""}`;
}

// Desplegar / plegar una ruta. Desplegar enciende el modo ruta (mapa = solo sus paradas) y
// encuadra; plegar (o abrir otra) apaga el modo ruta.
function alternarRuta(id) {
  const abrir = rutaDesplegada !== id;
  panelBody.querySelectorAll(".caminata").forEach(art => {
    const esta = art.dataset.ruta === id && abrir;
    art.classList.toggle("abierta", esta);
    art.querySelector(".caminata-reseña").hidden = !esta;
    art.querySelector("[data-ruta-toggle]").setAttribute("aria-expanded", String(esta));
  });

  if (!abrir) {
    rutaDesplegada = null;
    limpiarRuta(); // apaga el modo ruta y, vía el hook, borra los marcadores temporales
    return;
  }
  rutaDesplegada = id;
  const ruta = RUTAS.find(r => r.id === id);
  const { stops, coords } = paradasEnMapa(ruta);
  activarRuta(new Set());       // oculta los marcadores de categoría (dibujamos pines numerados)
  pintarMarcadoresRuta(stops);  // un pin numerado por parada, en orden (Playa Grande incluida)
  encuadrarPuntos(coords);      // encuadra el recorrido completo
  // En el celular la hoja tapa el mapa: se baja un poco para que se vea el encuadre.
  if (anchoMovil.matches) ponerAltura("media");
  panelBody.querySelector(`.caminata[data-ruta="${CSS.escape(id)}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// "Ver en el mapa" de una parada: vuela a ese punto y lo marca, sin cerrar la reseña.
function verParadaEnMapa(coordsStr) {
  const coords = coordsStr.split(",").map(Number);
  map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 15), duration: 700 });
  const m = marcadores.find(x => x.feature.geometry.coordinates.join(",") === coordsStr);
  if (m) marcarLugar(m.el, { conNombre: true });
  if (anchoMovil.matches) ponerAltura("baja");
}

// "Ver foto 360°" de una parada: abre el visor inmersivo del punto (reutiliza el de la ficha).
function verParada360(id) {
  const m = marcadores.find(x => x.feature.properties.id === id);
  if (m && m.feature.properties.foto360) abrirInmersivo(m.feature, m.el);
}

// El botón de la barra superior
document.getElementById("btn-caminatas")?.addEventListener("click", () => {
  // Si ya está abierto el panel de caminatas, el botón lo cierra (vuelve al mapa).
  if (!panel.hidden && panel.classList.contains("panel-ruta")) cerrarPanel();
  else abrirCaminatas();
});
