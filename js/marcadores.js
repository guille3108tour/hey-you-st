/* =========================================================
   Hey You ST · Marcadores
   Los marcadores del mapa: los crea, los pinta por categoría y los muestra/oculta.
   ========================================================= */
import { traducido } from "./i18n.js";
import { CATEGORIAS, crearIcono, LUGARES } from "./config.js";
import { map } from "./mapa.js";
import { sincronizarCapas, categoriasActivas } from "./filtros.js";
import { abrirLugar } from "./inmersivo.js";

// ---------- Marcadores ----------
export const marcadores = []; // { feature, marker, el }

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
export function nombrarMarcador(el, feature) {
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
export function renderMarcadores() {
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
