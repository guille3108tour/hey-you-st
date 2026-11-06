/* =========================================================
   Hey You ST · Servicios a domicilio
   Lo que un nómada pide y nosotros le resolvemos (limpieza, y lo que vaya pidiendo la gente).
   Va en un diálogo propio, con botón de WhatsApp, igual que el laboratorio. Los servicios
   están en data/servicios.js. NO van en el mapa: son a domicilio, no un lugar.
   Solo usa i18n y util; el WhatsApp sale de contacto.js (CONTACTO_JUAN, global).
   ========================================================= */
import { txt, traducido } from "./i18n.js";
import { esc } from "./util.js";

export const dialogoServicios = document.getElementById("dialogo-servicios");
const btnServicios = document.getElementById("btn-servicios");

const catalogo = () => (typeof SERVICIOS !== "undefined" ? SERVICIOS : []);

// Mismo criterio que los tours (js/panel.js): si el servicio trae "local" + "whatsapp", el
// botón le escribe directo a esa persona; si no, le escribe a Juan para coordinar. "Vi en
// Hey You ST" queda en el mensaje para saber que vino por la guía.
function botonWhatsApp(mensaje, etiqueta, numero) {
  if (!numero) return `<span class="reservar reservar-pronto">${esc(txt("reservasPronto"))}</span>`;
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  return `<a class="reservar" href="${esc(url)}" target="_blank" rel="noopener">${esc(etiqueta)}</a>`;
}

function htmlServicio(servOriginal) {
  const s = traducido(servOriginal);
  const local = s.local && s.whatsapp ? s.local : null;
  const numero = local ? s.whatsapp : CONTACTO_JUAN.whatsapp;
  const meta = [
    s.disponibilidad ? `🕗 ${esc(s.disponibilidad)}` : "",
    s.zona ? `📍 ${esc(s.zona)}` : "",
  ].filter(Boolean).join("<br>");
  const modalidades = (s.modalidades || []).map(m => `
      <div class="serv-modalidad">
        <p class="serv-modalidad-fila">
          <span class="serv-modalidad-nombre">${esc(m.nombre)}</span>
          ${m.precio ? `<span class="serv-modalidad-precio">${esc(m.precio)}</span>` : ""}
        </p>
        <p class="serv-modalidad-texto">${esc(m.texto)}</p>
      </div>`).join("");
  return `
    <article class="serv-card">
      <h3 class="serv-titulo-card">${esc(s.titulo)}${s.equipo ? ` · ${esc(s.equipo)}` : ""}</h3>
      ${meta ? `<p class="serv-meta">${meta}</p>` : ""}
      ${s.incluye?.length ? `<div class="datos">${s.incluye.map(i => `<span class="dato">${esc(i)}</span>`).join("")}</div>` : ""}
      <p class="serv-texto">${esc(s.texto)}</p>
      ${modalidades}
      ${!s.modalidades?.length && s.precio ? `<p class="serv-precio">${esc(s.precio)}</p>` : ""}
      ${botonWhatsApp(
        txt("mensajeServicio", local || "Juan", s.titulo),
        txt("botonServicio", local || "Juan"),
        numero)}
    </article>`;
}

export function pintarServicios() {
  const servicios = catalogo();
  dialogoServicios.innerHTML = `
    <div class="pg serv">
      <button type="button" class="pg-cerrar" data-serv="cerrar" aria-label="${esc(txt("cerrar"))}">✕</button>
      <h2 id="serv-titulo">${esc(txt("serviciosTitulo"))}</h2>
      <p class="pg-intro">${esc(txt("serviciosIntro"))}</p>
      ${servicios.length
        ? servicios.map(htmlServicio).join("")
        : `<p class="pg-intro">${esc(txt("serviciosPronto"))}</p>`}
    </div>`;
}

// Al cambiar de idioma con el diálogo abierto, app.js lo vuelve a pintar (como con el laboratorio)
export function repintarServicios() {
  if (dialogoServicios.open) pintarServicios();
}

function abrirServicios() {
  pintarServicios();
  dialogoServicios.showModal();
  dialogoServicios.scrollTop = 0;
}

dialogoServicios.addEventListener("click", (e) => {
  if (e.target === dialogoServicios) { dialogoServicios.close(); return; } // tocar afuera cierra
  if (e.target.closest("[data-serv='cerrar']")) dialogoServicios.close();
});
btnServicios.addEventListener("click", abrirServicios);
