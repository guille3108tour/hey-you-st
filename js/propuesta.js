/* =========================================================
   Hey You ST · Propuesta para que el cliente elija
   ========================================================= */

// Juan (24-oct): "quiero que seamos capaces de poder jugar y que el cliente sienta que puede
// hacer bastante". La propuesta trae, para cada día, dos o tres actividades para elegir, y
// cualquier combinación sale al mismo precio por persona: el presupuesto del cliente. El
// sistema de reservas la arma de modo que hasta la combinación más cara entra en ese precio,
// así que acá no hace falta ningún precio por actividad (el cliente no quiere saber cuánto
// cuesta cada cosa). Al elegir, "Lo quiero" le escribe a Juan con la elección y el código.
//
// La propuesta viaja en el link: propuesta.html#p=<JSON en base64url>. Nunca trae el nombre ni
// el contacto de un operador. Forma del JSON (claves cortas para que el link no sea eterno):
//   { v: 1, c: "HYP-1024-ab12", n: 6, pp: 200, i: "en", iva: 1, ej: 1,
//     d: [ { f: "2026-10-24", s: [ [ { es, en, du, sa, inc, x: ["Fotos del paseo"] }, ... ], ... ] } ] }
// d = días; s = las actividades del día (una o dos); cada una es la lista de opciones.
// Un día sin actividad trae libres: [ { n, t, i, ne, te } ], lugares gratis para elegir uno. Una ruta a pie
// suma ru (su id en data/rutas.js, de donde salen las paradas) y hm (a qué hora llegar ese día, si se sabe).

// ---------- Idioma (como en el mapa: abre en inglés y recuerda lo que eligió cada persona) ----------
const IDIOMAS = ["en", "es"];
let idioma = null;
try {
  const guardado = localStorage.getItem("hey-idioma");
  if (IDIOMAS.includes(guardado)) idioma = guardado;
} catch { /* sin almacenamiento: queda el de la propuesta */ }
const enIngles = () => idioma === "en";

const DIAS = [["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]];
const MESES = [["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]];

// Cada texto es [español, inglés]; los que llevan datos son funciones
const TEXTOS = {
  titulo:       ["Tu propuesta · Hey You ST", "Your trip plan · Hey You ST"],
  kicker:       ["Tu propuesta", "Your trip plan"],
  // Las que arma el Itinerary laboratory del mapa al instante
  kickerLab:    ["Tu itinerario", "Your itinerary"],
  sobra:        [(b, s) => `Tu presupuesto era ${b} por persona: te sobran ${s} para sumar algo más con un local.`,
                 (b, s) => `Your budget was ${b} per person: you have ${s} left to add something else with a local.`],
  volverLab:    ["← Probar otra combinación en el laboratorio", "← Try another combination in the laboratory"],
  resumen:      [(n, d) => `${n} ${n === 1 ? "persona" : "personas"} · ${d} ${d === 1 ? "día" : "días"}`,
                 (n, d) => `${n} ${n === 1 ? "person" : "people"} · ${d} ${d === 1 ? "day" : "days"}`],
  desde:        [f => `desde el ${f}`, f => `from ${f}`],
  porPersona:   ["por persona", "per person"],
  todoIncluido: [iva => `todo incluido${iva ? ", con impuestos" : ""}`, iva => `all included${iva ? ", taxes included" : ""}`],
  // Juan (24-oct): "mientras más tours, más barato la opción; quiero que notemos eso". Es el promedio del
  // paquete, no el precio de cada actividad.
  // Días libres (Juan, 24-oct): los días sin actividad traen lugares gratis para conocer, con lo que cuenta un local
  // Transporte rentado (Juan, 24-oct): carro o cuadra por día, o traslado
  trTitulo:     ["🚙 Tu transporte", "🚙 Your transport"],
  trIncluido:   ["Incluido en el precio del paquete.", "Included in the package price."],
  trDias:       [d => `${d} ${d === 1 ? "día" : "días"}`, d => `${d} ${d === 1 ? "day" : "days"}`],
  trIda:        ["solo ida", "one way"],
  trIdaVuelta:  ["ida y vuelta", "round trip"],
  trMsg:        [x => `Transporte: ${x}`, x => `Transport: ${x}`],
  diaLibre:     ["🆓 Día libre · lugares gratis para conocer", "🆓 Free day · free places to explore"],
  diaLibreNota: ["Gratis: un día para disfrutar por tu cuenta, con el consejo de un local.", "Free: a day to enjoy on your own, with a local's tip."],
  diaLibreUno:  ["Gratis: elegí uno para disfrutar por tu cuenta, con el consejo de un local.", "Free: pick one to enjoy on your own, with a local's tip."],
  diaLibreMsg:  [n => `día libre en ${n}`, n => `free day at ${n}`],
  // Rutas a pie (Juan, 27-oct): la hora de llegar sale de la marea del pronóstico, si el día cae en él
  rutaLlegar:   [(l, r) => `Ese día, llegá a ${l} ${r}`, (l, r) => `That day, reach ${l} ${r}`],
  rutaEntre:    [(a, b) => `entre ${a} y ${b}`, (a, b) => `between ${a} and ${b}`],
  rutaO:        [" o ", " or "],
  rutaNoCalza:  ["Ese día la marea baja no cae ni en la mañana ni en la tarde: mejor hacela otro día.",
                 "That day, low tide falls neither in the morning nor in the afternoon: it is better to do it another day."],
  rutaMarea:    ["marea de Open-Meteo", "tide from Open-Meteo"],
  porActividad: [(k, p) => `${k} actividades: cada una te sale a ${p} por persona. Entre más actividades, más barata sale cada una.`,
                 (k, p) => `${k} activities: each one comes to ${p} per person. The more activities, the less each one costs.`],
  explica:      ["Elegí lo que más te guste de cada día. Cualquier combinación sale al mismo precio.",
                 "Pick what you like best each day. Every combination is the same price."],
  dia:          [n => `Día ${n}`, n => `Day ${n}`],
  actividad:    [n => `Actividad ${n}`, n => `Activity ${n}`],
  incluye:     ["Incluye", "Includes"],
  conExtras:    ["Con extras incluidos", "Extras included"],
  tuPlan:       ["Tu plan", "Your plan"],
  total:        [t => `${t} en total`, t => `${t} in total`],
  loQuiero:     ["Lo quiero", "I want this plan"],
  cambiar:      ["Quiero cambiar algo", "I'd like to change something"],
  letraChica:   ["Sin pagos en línea: te confirmamos todo por WhatsApp con locales de confianza.",
                 "No online payment: we confirm everything on WhatsApp with trusted locals."],
  ejemplo:      ["Propuesta de ejemplo: estos tours no son reales.", "Example plan: these tours are not real."],
  rotoTitulo:   ["Este link está incompleto", "This link is incomplete"],
  rotoTexto:    ["Puede que se haya cortado al copiarlo. Escribinos y te mandamos la propuesta de nuevo.",
                 "It may have been cut off when copied. Message us and we'll send your plan again."],
  rotoBoton:    ["Pedir la propuesta de nuevo", "Ask for the plan again"],
  rotoMensaje:  ["Hola Juan 👋 Vi en Hey You ST que el link de mi propuesta no abre. ¿Me lo mandás de nuevo?",
                 "Hi Juan 👋 I saw on Hey You ST that my trip plan link doesn't open. Could you send it again?"],
  // Lo que le llega a Juan: la elección en palabras y, al final, el código para cargarla en el sistema
  mensaje:      [(lineas, n, pp, codigo, eleccion) => `Hola Juan 👋 Vi mi propuesta en Hey You ST y la quiero:\n${lineas}\nSomos ${n}, ${pp} por persona.\nCódigo: ${codigo} · ${eleccion}`,
                 (lineas, n, pp, codigo, eleccion) => `Hi Juan 👋 I saw my trip plan on Hey You ST and I want it:\n${lineas}\nWe are ${n}, ${pp} per person.\nCode: ${codigo} · ${eleccion}`],
  mensajeCambio: [(codigo) => `Hola Juan 👋 Vi mi propuesta en Hey You ST (${codigo}) y quiero cambiar algo: `,
                  (codigo) => `Hi Juan 👋 I saw my trip plan on Hey You ST (${codigo}) and I'd like to change something: `],
};

function txt(clave, ...datos) {
  const v = TEXTOS[clave][enIngles() ? 1 : 0];
  return typeof v === "function" ? v(...datos) : v;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const usd = (n) => { const v = Math.round((Number(n) || 0) * 100) / 100; return "$" + v.toLocaleString("en-US", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
const parseISO = (s) => { const p = String(s).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const validISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
function fechaLarga(s) {
  const d = parseISO(s), k = enIngles() ? 1 : 0;
  return enIngles() ? `${DIAS[1][d.getDay()]}, ${MESES[1][d.getMonth()]} ${d.getDate()}` : `${DIAS[0][d.getDay()]} ${d.getDate()} de ${MESES[k][d.getMonth()]}`;
}
function fechaCorta(s) {
  const d = parseISO(s);
  return enIngles() ? `${DIAS[1][d.getDay()].slice(0, 3)} ${MESES[1][d.getMonth()].slice(0, 3)} ${d.getDate()}` : `${DIAS[0][d.getDay()].slice(0, 3)} ${d.getDate()}/${d.getMonth() + 1}`;
}
// La duración viene en español ("2 horas y media", "día completo"); en inglés se traduce lo común
function duracion(s) {
  if (!s || !enIngles()) return s || "";
  return String(s)
    .replace(/día completo/i, "full day").replace(/medio día/i, "half day")
    .replace(/(\d+)\s*horas?\s*y\s*media/i, (_, h) => `${h}.5 hours`)
    .replace(/(\d+)\s*[–-]\s*(\d+)\s*horas/i, "$1–$2 hours")
    .replace(/(\d+)\s*horas?/i, (_, h) => `${h} ${h === "1" ? "hour" : "hours"}`);
}

// ---------- Leer la propuesta del link ----------
function leerPropuesta() {
  const m = location.hash.match(/[#&]p=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64 + "===".slice((b64.length + 3) % 4)), c => c.charCodeAt(0));
    const p = JSON.parse(new TextDecoder().decode(bytes));
    const ok = p && p.v === 1 && p.c && Number(p.n) > 0 && Number(p.pp) > 0 && Array.isArray(p.d) && p.d.length &&
      p.d.every(d => Array.isArray(d.s) && (d.s.length || d.libre || (Array.isArray(d.libres) && d.libres.length)) && d.s.every(s => Array.isArray(s) && s.length));
    return ok ? p : null;
  } catch { return null; }
}

const P = leerPropuesta();
if (!idioma) idioma = P && IDIOMAS.includes(P.i) ? P.i : "en";
// La elección: una opción por actividad, numeradas de corrido (1, 2, 3…) como las lee Juan. Si ya eligió en la
// barra del budget del laboratorio, el link trae lo elegido (e) y arranca con eso
const eleccion = P ? P.d.flatMap(d => d.s).map((s, k) => {
  const j = Array.isArray(P.e) ? P.e[k] : 0;
  return Number.isInteger(j) && j >= 0 && j < s.length ? j : 0;
}) : [];
const LETRAS = "ABCDEFGH";
// Los lugares gratis de un día libre (los links viejos traen uno solo, en libre) y cuál eligió en cada día
const libresDe = (d) => (Array.isArray(d.libres) && d.libres.length ? d.libres : d.libre ? [d.libre] : []);
const eleccionLibre = P ? P.d.map(() => 0) : [];

const raiz = document.getElementById("propuesta");

function nombreDe(o) { return (enIngles() && o.en) || o.es; }
const nombreLibre = (l) => (enIngles() && l.ne) || l.n;
const fraseLibre = (l) => (enIngles() && l.te) || l.t;
// Las rutas a pie (data/rutas.js, Juan 27-oct): cuánto se camina, a qué hora llegar y sus paradas en orden
const rutaDe = (l) => (l.ru && typeof RUTAS !== "undefined" ? RUTAS.find(r => r.id === l.ru) : null);
const enIdioma = (o) => (enIngles() && o && o.en ? { ...o, ...o.en } : o || {});
const horaMin = (min) => { const h = Math.floor(min / 60) % 24; return `${h % 12 || 12}:${String(min % 60).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`; };
function htmlRuta(l) {
  const r = rutaDe(l);
  if (!r) return "";
  const t = enIdioma(r), marea = enIdioma(r.marea);
  const lugar = enIdioma(r.paradas.find(p => p.lugar && p.lugar === (r.marea || {}).lugar)).nombre || "";
  const hoy = !Array.isArray(l.hm) ? ""
    : l.hm.length ? txt("rutaLlegar", lugar, l.hm.map(([a, b]) => txt("rutaEntre", horaMin(a), horaMin(b))).join(txt("rutaO")))
    : txt("rutaNoCalza");
  return `<span class="ruta">
    ${t.camino ? `<span class="opcion-meta">🚶 ${esc(t.camino)}</span>` : ""}
    ${marea.texto ? `<span class="opcion-meta">🌊 ${esc(marea.texto)}</span>` : ""}
    ${hoy ? `<span class="opcion-extra">🕐 ${esc(hoy)} <span class="ruta-fuente">(${esc(txt("rutaMarea"))})</span></span>` : ""}
    <span class="ruta-paradas">${r.paradas.map(p => { const q = enIdioma(p); return `<span class="ruta-parada">
      <span><b>${esc(q.nombre)}</b>${q.min ? `<span class="ruta-min"> · ${esc(q.min)}</span>` : ""}</span>
      <span class="opcion-meta">${esc(q.texto)}</span></span>`; }).join("")}</span>
    ${(t.notas || []).map(n => `<span class="opcion-meta">• ${esc(n)}</span>`).join("")}
  </span>`;
}
// "3 × Cuadra (cuadraciclo) · 3 días" / "1 × Traslado aeropuerto · ida y vuelta"
const textoTr = (tr) => `${tr.v} × ${(enIngles() && tr.en) || tr.es} · ${tr.tipo === "traslado" ? txt(tr.d >= 2 ? "trIdaVuelta" : "trIda") : txt("trDias", tr.d)}`;

function htmlOpcion(o, num, j) {
  const id = `op-${num}-${j}`;
  const meta = [duracion(o.du), o.sa].filter(Boolean).join(" · ");
  const extras = (o.x || []).length
    ? (enIngles() ? (o.xe && o.xe.length === o.x.length ? `${txt("incluye")}: ${o.xe.join(", ")}` : txt("conExtras")) : `${txt("incluye")}: ${o.x.join(", ").toLowerCase()}`)
    : "";
  const incluye = !enIngles() && o.inc ? o.inc : enIngles() && o.ince ? o.ince : "";
  return `
    <label class="opcion" for="${id}">
      <input type="radio" id="${id}" name="act-${num}" value="${j}" ${eleccion[num - 1] === j ? "checked" : ""}>
      <span class="opcion-letra" aria-hidden="true">${LETRAS[j]}</span>
      <span class="opcion-txt">
        <span class="opcion-nombre">${esc(nombreDe(o))}</span>
        ${meta ? `<span class="opcion-meta">${esc(meta)}</span>` : ""}
        ${incluye ? `<span class="opcion-meta">${esc(incluye)}</span>` : ""}
        ${extras ? `<span class="opcion-extra">✨ ${esc(extras)}</span>` : ""}
      </span>
    </label>`;
}

function htmlLibre(l, i, j) {
  const id = `libre-${i}-${j}`;
  return `
    <label class="opcion" for="${id}">
      <input type="radio" id="${id}" name="libre-${i}" value="${j}" ${eleccionLibre[i] === j ? "checked" : ""}>
      <span class="opcion-letra" aria-hidden="true">${LETRAS[j]}</span>
      <span class="opcion-txt">
        <span class="opcion-nombre">${esc([l.i, nombreLibre(l)].filter(Boolean).join(" "))}</span>
        ${fraseLibre(l) ? `<span class="opcion-meta">${esc(fraseLibre(l))}</span>` : ""}
        ${htmlRuta(l)}
      </span>
    </label>`;
}

function mensajeLoQuiero() {
  let num = 0;
  const lineas = P.d.map((d, i) => {
    if (!d.s.length && libresDe(d).length) return `${txt("dia", d.dn || i + 1)}${validISO(d.f) ? " · " + fechaCorta(d.f) : ""}: ${txt("diaLibreMsg", nombreLibre(libresDe(d)[eleccionLibre[i]] || libresDe(d)[0]))}`;
    const elegidas = d.s.map(s => s[eleccion[num++]]);
    return `${txt("dia", d.dn || i + 1)}${validISO(d.f) ? " · " + fechaCorta(d.f) : ""}: ${elegidas.map(o => nombreDe(o) + ((o.x || []).length ? (enIngles() ? " (+ " + ((o.xe || []).length === o.x.length ? o.xe : o.x).join(", ").toLowerCase() + ")" : " (con " + o.x.join(", ").toLowerCase() + ")") : "")).join(" + ")}`;
  }).join("\n") + (P.tr ? "\n" + txt("trMsg", textoTr(P.tr)) : "");
  let codigos = eleccion.map((j, k) => `${k + 1}${LETRAS[j]}`).join(" ");
  // Del laboratorio no hay una propuesta guardada en el sistema: van el día de inicio y cada tour con su día
  if (P.lab) {
    let k = 0;
    // "t1x2y3@2:fotos,almuerzo": el tour, su día y los extras que el cliente le sumó
    const ids = P.d.flatMap((d, i) => d.s.map(s => { const o = s[eleccion[k++]]; return `${o.t}@${d.dn || i + 1}${(o.xi || []).length ? ":" + o.xi.join(",") : ""}`; }));
    const inicio = P.d.find(d => validISO(d.f));
    // "t1x2y3*3*2": el transporte, cuántos vehículos y por cuántos días o viajes
    codigos += (inicio ? ` · ${inicio.f}` : "") + ` · ${ids.concat(P.tr && P.tr.t ? [`${P.tr.t}*${P.tr.v}*${P.tr.d}`] : []).join(" ")}`;
  }
  return txt("mensaje", lineas, P.n, usd(P.pp), P.c, codigos);
}
const waUrl = (msg) => `https://wa.me/${CONTACTO_JUAN.whatsapp}?text=${encodeURIComponent(msg)}`;

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
  const dias = P.d.length, primera = P.d.find(d => validISO(d.f));
  const actividades = eleccion.length;
  let num = 0;
  raiz.innerHTML = `
    ${P.ej ? `<p class="aviso" role="note">${esc(txt("ejemplo"))}</p>` : ""}
    <section class="portada">
      <span class="kicker">${esc(txt(P.lab ? "kickerLab" : "kicker"))}</span>
      <h1><span class="precio">${esc(usd(P.pp))}</span> <span class="precio-por">${esc(txt("porPersona"))}</span></h1>
      <p class="resumen">${esc(txt("resumen", P.n, dias))}${primera ? " · " + esc(txt("desde", fechaLarga(primera.f))) : ""} · ${esc(txt("todoIncluido", P.iva))}</p>
      ${actividades > 1 && !P.tr ? `<p class="por-actividad">${esc(txt("porActividad", actividades, usd(P.pp / actividades)))}</p>` : ""}
      ${P.b - P.pp >= 5 ? `<p class="por-actividad">${esc(txt("sobra", usd(P.b), usd(P.b - P.pp)))}</p>` : ""}
      ${P.d.some(d => d.s.some(o => o.length > 1)) ? `<p class="explica">${esc(txt("explica"))}</p>` : ""}
    </section>
    ${P.tr ? `<section class="tarjeta"><div class="libre"><span class="libre-titulo">${esc(txt("trTitulo"))}</span>
      <b>${esc(textoTr(P.tr))}</b>${P.tr.sa ? `<span class="opcion-meta">${esc(P.tr.sa)}</span>` : ""}<span class="opcion-extra">${esc(txt("trIncluido"))}</span></div></section>` : ""}
    ${P.d.map((d, i) => `
      <section class="tarjeta dia" aria-labelledby="dia-${i}">
        <h2 id="dia-${i}">${esc(txt("dia", d.dn || i + 1))}${validISO(d.f) ? ` <span>${esc(fechaLarga(d.f))}</span>` : ""}</h2>
        ${d.s.map(s => {
          num++;
          return `<fieldset class="actividad">
            ${d.s.length > 1 ? `<legend>${esc(txt("actividad", d.s.indexOf(s) + 1))}</legend>` : `<legend class="sr">${esc(txt("dia", d.dn || i + 1))}</legend>`}
            ${s.map((o, j) => htmlOpcion(o, num, j)).join("")}
          </fieldset>`;
        }).join("")}
        ${!d.s.length && libresDe(d).length ? `<div class="libre"><span class="libre-titulo">${esc(txt("diaLibre"))}</span>
          ${libresDe(d).length > 1 ? `<fieldset class="actividad"><legend class="sr">${esc(txt("diaLibre"))}</legend>${libresDe(d).map((l, j) => htmlLibre(l, i, j)).join("")}</fieldset>`
            : `<b>${esc([libresDe(d)[0].i, nombreLibre(libresDe(d)[0])].filter(Boolean).join(" "))}</b><span class="opcion-meta">${esc(fraseLibre(libresDe(d)[0]))}</span>${htmlRuta(libresDe(d)[0])}`}
          <span class="opcion-extra">${esc(txt(libresDe(d).length > 1 ? "diaLibreUno" : "diaLibreNota"))}</span></div>` : ""}
      </section>`).join("")}
    <section class="cierre" aria-live="polite">
      <div class="cierre-txt">
        <span class="kicker">${esc(txt("tuPlan"))}</span>
        <b>${esc(usd(P.pp))} ${esc(txt("porPersona"))}</b>
        <span>${esc(txt("total", usd(P.pp * P.n)))}</span>
      </div>
      <a class="boton" id="lo-quiero" href="${esc(waUrl(mensajeLoQuiero()))}" target="_blank" rel="noopener">${esc(txt("loQuiero"))}</a>
    </section>
    <p class="letra-chica">${esc(txt("letraChica"))} <a href="${esc(waUrl(txt("mensajeCambio", P.c)))}" target="_blank" rel="noopener">${esc(txt("cambiar"))}</a></p>
    ${P.lab ? `<p class="letra-chica"><a href="./${P.ej ? "?demo" : ""}#laboratorio">${esc(txt("volverLab"))}</a></p>` : ""}`;
}

// Al elegir otra opción solo cambia el mensaje de "Lo quiero": el precio es el mismo
raiz.addEventListener("change", (e) => {
  const m = e.target.name && e.target.name.match(/^act-(\d+)$/), ml = e.target.name && e.target.name.match(/^libre-(\d+)$/);
  if (!m && !ml) return;
  if (m) eleccion[Number(m[1]) - 1] = Number(e.target.value);
  else eleccionLibre[Number(ml[1])] = Number(e.target.value);
  const boton = document.getElementById("lo-quiero");
  if (boton) boton.href = waUrl(mensajeLoQuiero());
});

document.querySelectorAll("#idioma button").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.idioma === idioma) return;
  idioma = b.dataset.idioma;
  try { localStorage.setItem("hey-idioma", idioma); } catch { /* sin almacenamiento: vale para esta visita */ }
  pintar();
}));
pintar();
