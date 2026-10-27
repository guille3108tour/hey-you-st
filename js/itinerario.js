/* =========================================================
   Hey You ST · Itinerario confirmado del cliente
   ========================================================= */

// Juan (24-oct): "quiero que el cliente pueda recibir un itinerario con actividades". Después de reservar,
// Juan le manda desde el sistema de reservas un solo link con su viaje día por día: cada tour con su fecha,
// hora, punto de salida, qué incluye y si ya está confirmado. Los días sin tour entre el primero y el último
// se recomiendan como días libres con lugares gratis para conocer, con lo que cuenta un local (data/points.js). Nunca lleva el
// nombre ni el contacto de un operador, ni datos del cliente: solo lo que hace falta para el viaje.
//
// El itinerario viaja en el link: itinerario.html#p=<JSON en base64url>. Forma del JSON:
//   { v: 1, c: "HYC-1024-01", n: 6, i: "en", ej: 1,
//     a: [ { f: "2026-10-25", h: "08:00", es, en, du, sa, inc, x: ["Fotos"], xe: [...], cod: "HY-1024-03", ok: 1 } ] }

// ---------- Idioma (como en el mapa y en la propuesta) ----------
const IDIOMAS = ["en", "es"];
let idioma = null;
try {
  const guardado = localStorage.getItem("hey-idioma");
  if (IDIOMAS.includes(guardado)) idioma = guardado;
} catch { /* sin almacenamiento: queda el del itinerario */ }
const enIngles = () => idioma === "en";

const DIAS = [["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]];
const MESES = [["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]];

const TEXTOS = {
  titulo:       ["Tu itinerario · Hey You ST", "Your itinerary · Hey You ST"],
  kicker:       ["Tu itinerario", "Your itinerary"],
  resumen:      [(n, d) => `${n} ${n === 1 ? "persona" : "personas"} · ${d} ${d === 1 ? "día" : "días"}`,
                 (n, d) => `${n} ${n === 1 ? "person" : "people"} · ${d} ${d === 1 ? "day" : "days"}`],
  reserva:      [c => `Reserva ${c}`, c => `Booking ${c}`],
  dia:          [n => `Día ${n}`, n => `Day ${n}`],
  horaPend:     ["Hora por confirmar", "Time to be confirmed"],
  salida:       ["Salida", "Meeting point"],
  incluye:      ["Incluye", "Includes"],
  extras:       ["Extras", "Extras"],
  confirmado:   ["Confirmado", "Confirmed"],
  porConfirmar: ["Por confirmar", "To be confirmed"],
  trTitulo:     ["🚙 Tu transporte", "🚙 Your transport"],
  trDesde:      [f => `desde el ${f}`, f => `from ${f}`],
  trDias:       [d => `${d} ${d === 1 ? "día" : "días"}`, d => `${d} ${d === 1 ? "day" : "days"}`],
  trIda:        ["solo ida", "one way"],
  trIdaVuelta:  ["ida y vuelta", "round trip"],
  diaLibre:     ["🆓 Día libre · lugares gratis para conocer", "🆓 Free day · free places to explore"],
  diaLibreNota: ["Elegí uno para disfrutar por tu cuenta, con el consejo de un local. No tiene costo.", "Pick one to enjoy on your own, with a local's tip. No cost."],
  cambios:      ["¿Algo cambia? Escribinos", "Anything changes? Message us"],
  mensajeCambio: [c => `Hola Juan 👋 Vi mi itinerario en Hey You ST (${c}) y quiero cambiar algo: `,
                  c => `Hi Juan 👋 I saw my itinerary on Hey You ST (${c}) and I'd like to change something: `],
  verMapa:      ["Ver el mapa de Hey You ST", "See the Hey You ST map"],
  letraChica:   ["Guardá este link: es tu itinerario. Los horarios los confirma cada local; si algo cambia, te avisamos por WhatsApp.",
                 "Save this link: it's your itinerary. Each local confirms the times; if anything changes, we'll let you know on WhatsApp."],
  ejemplo:      ["Itinerario de ejemplo: estos tours no son reales.", "Example itinerary: these tours are not real."],
  rotoTitulo:   ["Este link está incompleto", "This link is incomplete"],
  rotoTexto:    ["Puede que se haya cortado al copiarlo. Escribinos y te mandamos tu itinerario de nuevo.",
                 "It may have been cut off when copied. Message us and we'll send your itinerary again."],
  rotoBoton:    ["Pedir el itinerario de nuevo", "Ask for the itinerary again"],
  rotoMensaje:  ["Hola Juan 👋 Vi en Hey You ST que el link de mi itinerario no abre. ¿Me lo mandás de nuevo?",
                 "Hi Juan 👋 I saw on Hey You ST that my itinerary link doesn't open. Could you send it again?"],
};
function txt(clave, ...datos) {
  const v = TEXTOS[clave][enIngles() ? 1 : 0];
  return typeof v === "function" ? v(...datos) : v;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const validISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const parseISO = (s) => { const p = String(s).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sumarDias = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoDe(d); };
function fechaLarga(s) {
  const d = parseISO(s);
  return enIngles() ? `${DIAS[1][d.getDay()]}, ${MESES[1][d.getMonth()]} ${d.getDate()}` : `${DIAS[0][d.getDay()]} ${d.getDate()} de ${MESES[0][d.getMonth()]}`;
}
function rango(a, z) {
  const da = parseISO(a), dz = parseISO(z), k = enIngles() ? 1 : 0;
  if (a === z) return fechaLarga(a);
  const mismoMes = da.getMonth() === dz.getMonth();
  return enIngles()
    ? `${MESES[k][da.getMonth()]} ${da.getDate()} – ${mismoMes ? "" : MESES[k][dz.getMonth()] + " "}${dz.getDate()}`
    : `${da.getDate()}${mismoMes ? "" : " de " + MESES[k][da.getMonth()]} al ${dz.getDate()} de ${MESES[k][dz.getMonth()]}`;
}
// La duración viene en español; en inglés se traduce lo común (como en la propuesta)
function duracion(s) {
  if (!s || !enIngles()) return s || "";
  return String(s)
    .replace(/día completo/i, "full day").replace(/medio día/i, "half day")
    .replace(/(\d+)\s*horas?\s*y\s*media/i, (_, h) => `${h}.5 hours`)
    .replace(/(\d+)\s*[–-]\s*(\d+)\s*horas/i, "$1–$2 hours")
    .replace(/(\d+)\s*horas?/i, (_, h) => `${h} ${h === "1" ? "hour" : "hours"}`);
}
const primeraFrase = (s) => { const m = String(s || "").match(/^.*?[.!?](\s|$)/); return (m ? m[0] : String(s || "")).trim(); };

// ---------- Leer el itinerario del link ----------
function leerItinerario() {
  const m = location.hash.match(/[#&]p=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64 + "===".slice((b64.length + 3) % 4)), c => c.charCodeAt(0));
    const p = JSON.parse(new TextDecoder().decode(bytes));
    return p && p.v === 1 && Array.isArray(p.a) && p.a.length && p.a.every(x => validISO(x.f) && x.es) ? p : null;
  } catch { return null; }
}
const P = leerItinerario();
if (!idioma) idioma = P && IDIOMAS.includes(P.i) ? P.i : "en";

// Los lugares gratis del mapa para los días libres (Juan, 24-oct: "en esos días vamos a agregar opciones gratuitas para
// que las personas conozcan"): hasta tres por día, y el día siguiente sigue con los que no salieron
const GRATIS = (typeof POINTS !== "undefined" ? POINTS.features : []).filter(f => f.properties.gratis && !f.properties.negocio);
const ICONO_LIBRE = { cascada: "💧", playa: "🏖️", naturaleza: "🌿", atardecer: "🌅" };
const iconoLibre = (cats) => ICONO_LIBRE[Object.keys(ICONO_LIBRE).find(c => (cats || []).includes(c))] || "📍";
const traducida = (p) => (enIngles() && p.en ? { ...p, ...p.en } : p);
// Las rutas a pie (data/rutas.js, Juan 27-oct) van primero en los días libres; el mismo día, sus paradas no salen aparte
const RUTAS_LIBRES = (typeof RUTAS !== "undefined" ? RUTAS : []).map(r => ({ properties: { ...r, ruta: r } }));
const OPCIONES_LIBRES = RUTAS_LIBRES.concat(GRATIS);
const idLibre = (p) => p.id || p.nombre;
const paradasDe = (p) => (p.ruta ? p.ruta.paradas.map(x => x.lugar).filter(Boolean) : []);
// Hasta tres por día, y el día siguiente sigue con los que no salieron
function libresDelDia(k) {
  const out = [];
  for (let j = 0; j < OPCIONES_LIBRES.length && out.length < 3; j++) {
    const p = OPCIONES_LIBRES[(k * 3 + j) % OPCIONES_LIBRES.length].properties;
    const ya = new Set(out.flatMap(o => [idLibre(o), ...paradasDe(o)]));
    if (!ya.has(idLibre(p)) && !paradasDe(p).some(x => ya.has(x))) out.push(p);
  }
  return out;
}
// Una ruta: cuánto se camina, la regla de la marea y sus paradas en orden (como en la propuesta)
function htmlRuta(r) {
  const t = traducida(r), marea = traducida(r.marea || {});
  return `<span class="ruta">
    ${t.camino ? `<span class="opcion-meta">🚶 ${esc(t.camino)}</span>` : ""}
    ${marea.texto ? `<span class="opcion-meta">🌊 ${esc(marea.texto)}</span>` : ""}
    <span class="ruta-paradas">${r.paradas.map(p => { const q = traducida(p); return `<span class="ruta-parada">
      <span><b>${esc(q.nombre)}</b>${q.min ? `<span class="ruta-min"> · ${esc(q.min)}</span>` : ""}</span>
      <span class="opcion-meta">${esc(q.texto)}</span></span>`; }).join("")}</span>
    ${(t.notas || []).map(n => `<span class="opcion-meta">• ${esc(n)}</span>`).join("")}
  </span>`;
}

const raiz = document.getElementById("itinerario");
const waUrl = (msg) => `https://wa.me/${CONTACTO_JUAN.whatsapp}?text=${encodeURIComponent(msg)}`;
const nombre = (a) => (enIngles() && a.en) || a.es;

function htmlActividad(a) {
  const extras = (a.x || []).length ? ((enIngles() && (a.xe || []).length === a.x.length) ? a.xe : a.x) : [];
  return `
    <div class="it-act">
      <span class="it-hora${a.h ? "" : " pend"}">${esc(a.h || txt("horaPend"))}</span>
      <div class="it-txt">
        <b>${esc(nombre(a))}</b>
        ${a.du ? `<span class="opcion-meta">${esc(duracion(a.du))}</span>` : ""}
        ${a.sa ? `<span class="opcion-meta">${esc(txt("salida"))}: ${esc(a.sa)}</span>` : ""}
        ${!enIngles() && a.inc ? `<span class="opcion-meta">${esc(txt("incluye"))}: ${esc(a.inc)}</span>` : ""}
        ${extras.length ? `<span class="opcion-extra">✨ ${esc(txt("extras"))}: ${esc(extras.join(", "))}</span>` : ""}
        <span class="it-estado ${a.ok ? "ok" : "pend"}">${esc(a.ok ? txt("confirmado") : txt("porConfirmar"))}${a.cod ? " · " + esc(a.cod) : ""}</span>
      </div>
    </div>`;
}

function pintar() {
  document.documentElement.lang = idioma;
  document.title = txt("titulo");
  document.querySelectorAll("#idioma button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.idioma === idioma)));
  if (!P) {
    raiz.innerHTML = `
      <section class="tarjeta roto">
        <h1>${esc(txt("rotoTitulo"))}</h1>
        <p>${esc(txt("rotoTexto"))}</p>
        <a class="boton" href="${esc(waUrl(txt("rotoMensaje")))}" target="_blank" rel="noopener">${esc(txt("rotoBoton"))}</a>
      </section>`;
    return;
  }
  // El transporte va aparte de los días (Juan, 24-oct): carro o cuadra por días, o traslados
  const transporte = P.a.filter(a => a.tr), actividades = P.a.filter(a => !a.tr);
  const fechas = (actividades.length ? actividades : transporte).map(a => a.f).sort();
  let desde = fechas[0], hasta = fechas[fechas.length - 1];
  // El viaje cubre también los días de la renta: lo que queda sin tour sale como día libre para conocer
  transporte.forEach(a => {
    if (a.f < desde) desde = a.f;
    const fin = a.tr.tipo === "traslado" ? a.f : sumarDias(a.f, (a.tr.d || 1) - 1);
    if (fin > hasta) hasta = fin;
  });
  const dias = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) dias.push(f);
  let libres = 0;
  raiz.innerHTML = `
    ${P.ej ? `<p class="aviso" role="note">${esc(txt("ejemplo"))}</p>` : ""}
    <section class="portada">
      <span class="kicker">${esc(txt("kicker"))}</span>
      <h1 class="it-titulo">${esc(rango(desde, hasta).replace(/^./, c => c.toUpperCase()))}</h1>
      <p class="resumen">${esc(txt("resumen", P.n, dias.length))}${P.c ? " · " + esc(txt("reserva", P.c)) : ""}</p>
    </section>
    ${transporte.length ? `<section class="tarjeta"><span class="libre-titulo">${esc(txt("trTitulo"))}</span>
      ${transporte.map(a => `<div class="it-act"><div class="it-txt"><b>${esc(a.tr.v + " × " + nombre(a) + " · " + (a.tr.tipo === "traslado" ? txt(a.tr.d >= 2 ? "trIdaVuelta" : "trIda") : txt("trDias", a.tr.d)))}</b>
        <span class="opcion-meta">${esc(txt("trDesde", fechaLarga(a.f)))}${a.h ? " · " + esc(a.h) : ""}</span>${a.sa ? `<span class="opcion-meta">${esc(a.sa)}</span>` : ""}
        <span class="it-estado ${a.ok ? "ok" : "pend"}">${esc(a.ok ? txt("confirmado") : txt("porConfirmar"))}${a.cod ? " · " + esc(a.cod) : ""}</span></div></div>`).join("")}</section>` : ""}
    ${dias.map((f, i) => {
      const del = actividades.filter(a => a.f === f).sort((a, z) => String(a.h || "99").localeCompare(String(z.h || "99")));
      const lugares = del.length ? [] : libresDelDia(libres);
      if (lugares.length) libres++;
      return `<section class="tarjeta dia" aria-labelledby="dia-${i}">
        <h2 id="dia-${i}">${esc(txt("dia", i + 1))} <span>${esc(fechaLarga(f))}</span></h2>
        ${del.length ? del.map(htmlActividad).join("")
          : lugares.length ? `<div class="libre"><span class="libre-titulo">${esc(txt("diaLibre"))}</span>
              ${lugares.map(p => { const t = traducida(p); return `<div class="libre-op"><b>${esc((p.icono || iconoLibre(p.categorias)) + " " + t.nombre)}</b>
                <span class="opcion-meta">${esc(primeraFrase(t.entrada))}</span>${p.ruta ? htmlRuta(p.ruta) : ""}</div>`; }).join("")}
              <span class="opcion-extra">${esc(txt("diaLibreNota"))}</span></div>` : ""}
      </section>`;
    }).join("")}
    <p class="letra-chica">${esc(txt("letraChica"))}</p>
    <p class="letra-chica"><a href="${esc(waUrl(txt("mensajeCambio", P.c || "")))}" target="_blank" rel="noopener">${esc(txt("cambios"))}</a> · <a href="./">${esc(txt("verMapa"))}</a></p>`;
}

document.querySelectorAll("#idioma button").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.idioma === idioma) return;
  idioma = b.dataset.idioma;
  try { localStorage.setItem("hey-idioma", idioma); } catch { /* sin almacenamiento: vale para esta visita */ }
  pintar();
}));
pintar();
