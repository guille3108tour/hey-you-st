/* =========================================================
   Hey You ST · Península de Nicoya — lógica del mapa
   ========================================================= */

import { getIdioma, setIdioma, txt } from "./i18n.js";
import { CATEGORIAS, CAT_TODAS } from "./config.js";
import { map } from "./mapa.js";
import {
  dialogoPropuesta, enArmado, enPrecios, enBarra,
  pintarArmado, pintarPrecios, pintarBarra, pintarPropuestaGratis,
} from "./laboratorio.js";
import { sincronizarCapas, nombrarFilaCapa, listaCapasEl } from "./filtros.js";
import { renderMarcadores, nombrarMarcador, marcadores } from "./marcadores.js";
import { abrirPanel, marcarLugar, lugarAbierto, panel } from "./panel.js";
import { inmersivo, sincronizarGiro } from "./inmersivo.js";
import { alturaActual, panelAsa } from "./hoja.js";

// Primer render: con el mapa y los marcadores ya creados (en sus módulos), se muestran
// según la categoría activa (al abrir, ninguna). Antes corría al final de la sección de
// marcadores; ahora es el arranque explícito de la app.
renderMarcadores();

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
