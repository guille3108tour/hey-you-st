/* =========================================================
   Hey You ST · Hoja deslizable
   La hoja deslizable del celular: la ficha sube y baja con el dedo o con un toque.
   ========================================================= */
import { txt } from "./i18n.js";
import { anchoMovil } from "./config.js";
import { congelarFoto } from "./inmersivo.js";

// La hoja arrastra el mismo #panel que arma panel.js. Tomamos la referencia por nuestra
// cuenta (en vez de importarla de panel.js) porque la usamos al cargar el módulo y, con el
// ciclo panel↔hoja, el binding importado todavía estaría sin inicializar (TDZ).
const panel = document.getElementById("panel");

// ---------- Hoja deslizable (solo celular) ----------
// Pedido de Juan (29-sep): la ficha se baja y se sube como las hojas del iPhone. Tiene tres
// alturas: "baja" (una barrita con el nombre, para seguir explorando el mapa), "media" (al
// abrir un lugar) y "alta" (para leer todo). Se arrastra desde la agarradera, o desde el
// contenido cuando está arriba del todo; al soltar se acomoda en la altura más cercana, o
// en la siguiente si el gesto fue rápido. Un toque en la agarradera baja o sube la hoja.
export const panelAsa = document.getElementById("panel-asa");
export const asaNombre = document.getElementById("panel-asa-nombre");
const ALTURAS = ["baja", "media", "alta"];
export let alturaActual = "media";
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

export function ponerAltura(nombre) {
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
export function soltarAltura() {
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

