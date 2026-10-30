/* =========================================================
   Hey You ST · Modo inmersivo (360°)
   El modo inmersivo: la foto 360° a pantalla completa, el giroscopio y el paso de
   una playa a otra.
   ========================================================= */
import { txt, traducido } from "./i18n.js";
import { esc } from "./util.js";
import { CATEGORIAS, rotulo, sinMovimiento } from "./config.js";
import { map, setEncuadreLibre } from "./mapa.js";
import { marcadores } from "./marcadores.js";
import { abrirPanel, cerrarPanel, marcarLugar, panel, toursDelLugar, TAB_TOURS, crearVisor360 } from "./panel.js";

// ---------- Modo inmersivo ----------
// Idea de Juan (3-oct): la foto 360° llena la pantalla; abajo flotan los íconos de sus
// secciones, y al tocar uno sube la ficha con esa sección encima de la foto. Cerrar esa ficha
// vuelve a la foto. Desde el 4-oct se entra con el botón "Ver foto 360°" de la ficha (ya no al
// tocar el lugar), y la ✕ de arriba vuelve a la ficha de la playa que se está viendo.
export const inmersivo = document.getElementById("inmersivo");
let visorInmersivo = null;
export let sincronizarGiro = null; // actualiza el botón del giroscopio (ver prepararGiroscopio)
let fotoCongelada = null;   // { giro } mientras la ficha tapa la foto

// Pedido de Juan (3-oct): mientras se lee una sección, la foto de atrás se queda quieta (sin
// girar sola ni seguir el teléfono) para no distraer del texto; al cerrar o bajar la ficha,
// vuelve a moverse como estaba.
export function congelarFoto(congelar) {
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
export function abrirLugar(feature, el) {
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

export function abrirInmersivo(feature, el, opciones = {}) {
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
export function salirDeLaFoto() {
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

