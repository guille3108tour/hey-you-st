/* =========================================================
   Hey You ST · Filtros (categorías)
   La barra lateral de categorías: prende una a la vez y cuenta los lugares visibles.
   ========================================================= */
import { txt } from "./i18n.js";
import { CATEGORIAS, rotulo, CAT_TODAS, crearIcono } from "./config.js";
import { renderMarcadores } from "./marcadores.js";
import { cerrarPanel, lugarAbierto, panel } from "./panel.js";

// ---------- Filtros (barra lateral de categorías) ----------
// Un Set vacío significa "todas": es el estado inicial y al que vuelve el botón
// "Todas". Se pueden tener varias categorías prendidas al mismo tiempo.
export const listaCapasEl = document.getElementById("capas-lista");
const conteoEl = document.getElementById("capas-conteo");
export const categoriasActivas = new Set();

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
export function nombrarFilaCapa(b, cat) {
  b.setAttribute("aria-label", rotulo(cat)); // se ve solo el ícono (desde el 3-oct también en compu)
  b.title = rotulo(cat); // en compu, el nombre aparece al pasar el mouse
  b.querySelector(".capa-label").textContent = rotulo(cat);
}

// Deja prendida solo esa categoría, sin alternar: la usa la ficha cuando la persona cambia de
// sección, para que al salir el mapa muestre los lugares de la sección que dejó (Juan, 4-oct)
export function ponerCategoria(clave) {
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
export function sincronizarCapas(visibles) {
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

