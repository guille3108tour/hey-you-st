/* =========================================================
   Hey You ST · Marea, surf y sol
   La matemática de la marea (Open-Meteo) y su dibujo: las horas buenas de hoy,
   los tramos para surfear y la curva del día. La usan el panel y el laboratorio.
   ========================================================= */
import { txt, enIngles, traducido, ETAPAS_EN } from "./i18n.js";
import { esc } from "./util.js";

// ---------- Ideal para ir hoy ----------
// Pedido de Juan (3-oct): cruzar las horas buenas de cada lugar ("horasIdeales", lo que cuenta
// un local) con la tabla de mareas. Marea baja = de 2 h antes a 2 h después de la más baja
// (criterio de Juan). La marea viene de Open-Meteo: gratis, sin clave, pide que se le cite.
// Todo se calcula en hora de Costa Rica, aunque el visitante tenga el teléfono en otra zona:
// las horas se guardan como milisegundos "de reloj tico" (la hora local leída como UTC).
const TZ_CR = "America/Costa_Rica";
export const HORA = 3600e3, DIA = 24 * HORA;
const mareasCache = new Map();

export function cargarMareas(lng, lat) {
  const clave = `${lat.toFixed(1)},${lng.toFixed(1)}`;
  if (!mareasCache.has(clave)) {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
      `&minutely_15=sea_level_height_msl&timezone=${encodeURIComponent(TZ_CR)}&forecast_days=8`;
    mareasCache.set(clave, fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`Open-Meteo ${r.status}`)))
      .then(j => ({ t: j.minutely_15.time.map(s => Date.parse(s + "Z")), h: j.minutely_15.sea_level_height_msl }))
      .catch(e => { mareasCache.delete(clave); throw e; }));
  }
  return mareasCache.get(clave);
}

function ahoraCR() {
  const f = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ_CR, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date());
  return Date.parse(f.replace(" ", "T") + "Z");
}

// Todas las mareas altas y bajas de la serie, con su hora y su nivel
function extremosConNivel({ t, h }) {
  const out = [];
  for (let i = 1; i < h.length - 1; i++) {
    if (h[i] == null || h[i - 1] == null || h[i + 1] == null) continue;
    if (h[i] <= h[i - 1] && h[i] < h[i + 1]) out.push({ t: t[i], h: h[i], tipo: "baja" });
    if (h[i] >= h[i - 1] && h[i] > h[i + 1]) out.push({ t: t[i], h: h[i], tipo: "alta" });
  }
  return out;
}

// Momentos de marea más baja (o más alta) de la serie
function extremosMarea(mareas, tipo) {
  return extremosConNivel(mareas).filter(e => e.tipo === tipo).map(e => e.t);
}

// Nivel del mar a cualquier hora, entre dos datos de 15 minutos
function nivelEn({ t, h }, ms) {
  const paso = t[1] - t[0];
  const i = Math.min(t.length - 2, Math.max(0, Math.floor((ms - t[0]) / paso)));
  return h[i] + ((h[i + 1] ?? h[i]) - h[i]) * (ms - t[i]) / paso;
}

// Ventanas donde coinciden las horas buenas del lugar con la marea que conviene. Si el local
// no dio horas, vale mientras hay luz (del amanecer al atardecer de ese día). "ventana" son las
// horas antes y después de la marea (por defecto [-2, 2]; ej. [0, 2] = cuando empieza a bajar).
export function ventanasIdeales(ideal, mareas, lng, lat) {
  if (ideal.surf) return tramosSurf(ideal.surf, mareas, lng, lat).buenas;
  const rangos = (ideal.horas || []).map(r => r.split("-").map(s => {
    const [hh, mm] = s.split(":").map(Number);
    return hh * HORA + mm * 60e3;
  }));
  const [antes, despues] = ideal.ventana || [-2, 2];
  const out = [];
  for (const m of extremosMarea(mareas, ideal.marea)) {
    const dia = Math.floor(m / DIA) * DIA;
    // Las horas alrededor de la marea pueden cruzar la medianoche
    for (const d of [dia - DIA, dia, dia + DIA]) {
      const sol = rangos.length ? null : solCR(d, lat, lng);
      for (const [a, b] of sol ? [[sol.sale * 60e3, sol.pone * 60e3]] : rangos) {
        const ini = Math.max(m + antes * HORA, d + a), fin = Math.min(m + despues * HORA, d + b);
        if (fin - ini >= 30 * 60e3) out.push({ ini, fin, marea: m });
      }
    }
  }
  return out.sort((x, y) => x.ini - y.ini);
}

// ---------- Horas buenas y no tan buenas para surfear (Juan, 4-oct) ----------
// En surf no cuentan las horas del sol ("en medio del agua no hay sombras"): solo la marea.
// Cada subida o bajada se parte en tercios: baja (el tercio más bajo), media y alta.
// "surf.mareasBuenas" dice en cuáles trabaja la ola (ej. Playa Hermosa: ["baja", "media"]);
// el resto del día con luz queda como "no tan buena". De noche no se marca nada.
function etapaMarea(extremos, h, ms) {
  const i = extremos.findIndex(e => e.t > ms);
  if (i < 1 || h == null) return null;
  const [a, b] = [extremos[i - 1].h, extremos[i].h];
  const f = (h - Math.min(a, b)) / (Math.abs(b - a) || 1);
  return f < 1 / 3 ? "baja" : f < 2 / 3 ? "media" : "alta";
}

function tramosSurf(buenas, mareas, lng, lat) {
  const extremos = extremosConNivel(mareas);
  const out = { buenas: [], noTan: [] };
  const soles = new Map();
  let actual = null; // { tipo, ini } del tramo que se está armando
  const cerrar = (t) => {
    if (actual && t - actual.ini >= 30 * 60e3) out[actual.tipo].push({ ini: actual.ini, fin: t });
    actual = null;
  };
  mareas.t.forEach((t, i) => {
    const d = Math.floor(t / DIA) * DIA;
    if (!soles.has(d)) soles.set(d, solCR(d, lat, lng));
    const sol = soles.get(d);
    const deDia = t >= d + sol.sale * 60e3 && t <= d + sol.pone * 60e3;
    const etapa = deDia ? etapaMarea(extremos, mareas.h[i], t) : null;
    const tipo = etapa ? (buenas.includes(etapa) ? "buenas" : "noTan") : null;
    if (tipo !== (actual?.tipo ?? null)) {
      cerrar(t);
      if (tipo) actual = { tipo, ini: t };
    }
  });
  cerrar(mareas.t[mareas.t.length - 1]);
  return out;
}

// "baja a media", "media a alta"... para decirlo en palabras ("low to mid" en inglés)
function etapasEnPalabras(etapas) {
  return etapas.map(e => enIngles() ? ETAPAS_EN[e] : e).join(enIngles() ? " to " : " a ");
}

function horaCR(ms) {
  const d = new Date(ms), h = d.getUTCHours();
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`;
}
function rangoCR(ini, fin) {
  const [a, b] = [horaCR(ini), horaCR(fin)];
  return a.slice(-4) === b.slice(-4) ? `${a.slice(0, -5)} – ${b}` : `${a} – ${b}`;
}

// Juan (3-oct): dos líneas, hoy y mañana, arriba de los bloques, en inglés como él las
// escribió ("Best time to go today at xxx" / "Best time to go tomorrow xxx"). Desde que la
// página es bilingüe (6-oct), en español salen en español.
export async function llenarIdealHoy(el, ideal, lng, lat) {
  let ventanas;
  try { ventanas = ventanasIdeales(ideal, await cargarMareas(lng, lat), lng, lat); }
  catch (e) { console.warn("Sin datos de marea:", e); return; }
  if (!el.isConnected) return; // la persona ya cambió de pestaña o de lugar
  const ahora = ahoraCR();
  const hoy = Math.floor(ahora / DIA);
  const proximas = ventanas.filter(v => v.fin > ahora);
  if (!proximas.length) return;
  const delDia = (n) => proximas.filter(v => Math.floor(v.ini / DIA) === hoy + n);
  const horas = (vs) => vs.length
    ? vs.map(v => v.ini <= ahora ? txt("ahoraHasta", horaCR(v.fin)) : rangoCR(v.ini, v.fin)).join(txt("y"))
    : txt("sinVentana");
  const linea = (texto, valor) => `<span class="ideal-linea">🕐 ${esc(texto)}: <strong>${esc(valor)}</strong></span>`;
  const [vHoy, vManana] = [delDia(0), delDia(1)];
  // Si ni hoy ni mañana hay ventana, se avisa cuál es la próxima
  const proxima = !vHoy.length && !vManana.length
    ? linea(txt("proximaBuena", txt("dias")[new Date(proximas[0].ini).getUTCDay()]), rangoCR(proximas[0].ini, proximas[0].fin))
    : "";
  // "para" / "paraEn": para qué es la hora, cuando no sirve para todos (ej. El Chorro: solo a pie)
  const para = (enIngles() ? ideal.paraEn : ideal.para) || txt("paraDefecto");
  const marea = ideal.surf
    ? txt("mareaDeSurf", etapasEnPalabras(ideal.surf))
    : ideal.ventana?.[0] === 0
      ? txt("alEmpezarA", ideal.marea)
      : txt("conMarea", ideal.marea);
  el.innerHTML = `
    ${linea(txt("mejorHoy", para), horas(vHoy))}
    ${linea(txt("mejorManana", para), horas(vManana))}
    ${proxima}
    <span class="ideal-detalle">${esc(marea)} · ${txt("datosMarea")}:
      <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></span>`;
  el.hidden = false;
}

// ---------- La marea del lugar, hora por hora ----------
// Idea de Juan (3-oct): hablar de las mareas con la gente es su sello. La curva muestra el mar
// de hoy, mañana o pasado en ese lugar; la persona mueve la hora con la barra (o con el dedo
// sobre la curva), la bolita sigue al mar y abajo sale lo que Guille cuenta de esa marea en
// ese lugar ("mareas" en data/points.js). Solo sale donde hay esa voz local.
// Juan (4-oct): la curva muestra siempre la mejor hora para ir ese día ("horasIdeales"):
// una franja dorada sobre la curva y la hora escrita arriba; al tocarla, la bolita va ahí.
const MAREA_W = 320, MAREA_X0 = 10, MAREA_X1 = 310, MAREA_Y0 = 30, MAREA_Y1 = 100;

// Amanecer y atardecer aproximados (fórmula de la NOAA), en minutos del día en hora tica
function solCR(diaMs, lat, lng) {
  const n = Math.round((diaMs - Date.UTC(new Date(diaMs).getUTCFullYear(), 0, 1)) / DIA) + 1;
  const g = 2 * Math.PI / 365 * (n - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const rad = Math.PI / 180, la = lat * rad;
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(la) * Math.cos(dec)) - Math.tan(la) * Math.tan(dec)) / rad;
  const CR = -360; // UTC-6, Costa Rica no cambia la hora
  return { sale: 720 - 4 * (lng + ha) - eq + CR, pone: 720 - 4 * (lng - ha) - eq + CR };
}

// "sinVoz": en Surf sin "surf.mareasBuenas", la voz de Guille sobre la marea habla de estar en
// la playa, no de la ola: la caja no sale para no confundir.
export async function llenarMarea(el, p, lng, lat, ideal = null, { sinVoz = false } = {}) {
  let mareas;
  try { mareas = await cargarMareas(lng, lat); }
  catch (e) { console.warn("Sin datos de marea:", e); return; }
  if (!el.isConnected) return; // la persona ya cambió de pestaña o de lugar
  const ahora = ahoraCR();
  const hoy = Math.floor(ahora / DIA) * DIA;
  const minutoAhora = Math.floor((ahora - hoy) / 60e3 / 15) * 15;
  const extremos = extremosConNivel(mareas);
  // En surf: horas buenas (doradas) y no tan buenas, solo por la marea (Juan, 4-oct)
  const surf = ideal?.surf ? tramosSurf(ideal.surf, mareas, lng, lat) : null;
  const ideales = surf ? surf.buenas : ideal ? ventanasIdeales(ideal, mareas, lng, lat) : [];
  // La misma escala para los tres días, así se comparan a simple vista
  const visibles = mareas.h.filter((v, i) => v != null && mareas.t[i] >= hoy && mareas.t[i] <= hoy + 3 * DIA);
  if (!visibles.length) return;
  const bajo = Math.min(...visibles), alto = Math.max(...visibles);
  const X = (m) => MAREA_X0 + m / 1440 * (MAREA_X1 - MAREA_X0);
  const Y = (v) => MAREA_Y1 - (v - bajo) / (alto - bajo || 1) * (MAREA_Y1 - MAREA_Y0);
  const nombres = [txt("hoy"), txt("manana"), txt("dias")[new Date(hoy + 2 * DIA).getUTCDay()]];
  const voz = p.mareas || {};
  let dia = 0, minuto = minutoAhora;

  el.innerHTML = `
    <div class="marea-cabeza">
      <span class="marea-titulo">${esc(txt("mareaEn", p.nombre))}</span>
      <div class="marea-dias" role="group" aria-label="${txt("dia")}">
        ${nombres.map((n, i) => `<button type="button" data-dia="${i}">${n}</button>`).join("")}
      </div>
    </div>
    <div class="marea-hud" aria-live="polite">
      <div class="marea-estado">
        <span class="marea-flecha" aria-hidden="true"></span>
        <div><strong></strong><span class="marea-siguiente"></span></div>
      </div>
      <div class="marea-reloj">
        <span class="marea-hora"></span>
        <span class="marea-nivel"></span>
      </div>
    </div>
    ${ideal ? `<p class="marea-ideal"></p>` : ""}
    <svg class="marea-grafica" viewBox="0 0 ${MAREA_W} 130" role="img" aria-label="${txt("curvaAria")}">
      <defs>
        <linearGradient id="marea-agua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#22e6df" stop-opacity="0.45">
            <animate attributeName="stop-opacity" values="0.3;0.55;0.3" dur="4s" repeatCount="indefinite"/>
          </stop>
          <stop offset="1" stop-color="#22e6df" stop-opacity="0.02"/>
        </linearGradient>
        <filter id="marea-brillo" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect class="marea-noche"/><rect class="marea-noche"/>
      <g class="marea-franjas"></g>
      <g class="marea-rejilla">${[180, 360, 540, 720, 900, 1080, 1260].map(m =>
        `<line x1="${X(m)}" x2="${X(m)}" y1="${MAREA_Y0 - 12}" y2="${MAREA_Y1 + 6}"/>`).join("")}</g>
      <path class="marea-area" fill="url(#marea-agua)"/>
      <path class="marea-linea" filter="url(#marea-brillo)"/>
      <path class="marea-linea-ideal" filter="url(#marea-brillo)"/>
      <g class="marea-ext"></g>
      <g class="marea-eje"></g>
      <line class="marea-guia" y1="${MAREA_Y0 - 12}" y2="${MAREA_Y1 + 6}"/>
      <circle class="marea-sonar" r="6">
        <animate attributeName="r" values="6;22" dur="2.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.8;0" dur="2.2s" repeatCount="indefinite"/>
      </circle>
      <circle class="marea-halo" r="10"/>
      <circle class="marea-punto" r="5.5" filter="url(#marea-brillo)"/>
    </svg>
    <div class="marea-control">
      <input type="range" class="marea-barra" min="0" max="1425" step="15" aria-label="${txt("horaDelDia")}">
      <button type="button" class="marea-ahora">${txt("ahora")}</button>
    </div>
    <div class="marea-voz"><span class="marea-voz-titulo"></span><p></p></div>
    <span class="ideal-detalle">${txt("fuentesMarea")}: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>
      · ${txt("solAproximado")}</span>`;

  const $ = (s) => el.querySelector(s);
  const svg = $(".marea-grafica"), barra = $(".marea-barra"), botonAhora = $(".marea-ahora");
  const ponerAttrs = (nodo, attrs) => Object.entries(attrs).forEach(([k, v]) => nodo.setAttribute(k, v));
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) el.querySelectorAll("animate").forEach(a => a.remove());

  // En el teléfono, mientras la persona mueve la hora, un toquecito por cada hora y uno más
  // fuerte al pasar por la marea más alta o más baja (solo donde el teléfono lo permite)
  let tocando = false, ultimaHora = null, ultimoPico = null;
  const vibrar = (ms) => { if (tocando && navigator.vibrate) navigator.vibrate(ms); };

  const pintarDia = () => {
    const d0 = hoy + dia * DIA;
    el.querySelectorAll(".marea-dias button")
      .forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.dia === dia)));
    const puntos = [];
    mareas.t.forEach((t, i) => {
      if (t >= d0 && t <= d0 + DIA && mareas.h[i] != null)
        puntos.push(`${X((t - d0) / 60e3).toFixed(1)} ${Y(mareas.h[i]).toFixed(1)}`);
    });
    const linea = "M" + puntos.join(" L");
    $(".marea-linea").setAttribute("d", linea);
    $(".marea-area").setAttribute("d", `${linea} L${MAREA_X1} ${MAREA_Y1 + 6} L${MAREA_X0} ${MAREA_Y1 + 6} Z`);

    // La noche va más oscura: la playa se vive de día
    const sol = solCR(d0, lat, lng);
    const yNoche = MAREA_Y0 - 12, altoNoche = MAREA_Y1 + 6 - yNoche;
    const [noche1, noche2] = el.querySelectorAll(".marea-noche");
    ponerAttrs(noche1, { x: MAREA_X0, y: yNoche, width: X(sol.sale) - MAREA_X0, height: altoNoche });
    ponerAttrs(noche2, { x: X(sol.pone), y: yNoche, width: MAREA_X1 - X(sol.pone), height: altoNoche });
    $(".marea-eje").innerHTML = `
      <text class="sol" x="${X(sol.sale)}" y="126" text-anchor="middle">☀ ${horaCR(d0 + sol.sale * 60e3)}</text>
      <text x="${X(720)}" y="126" text-anchor="middle">12 p.m.</text>
      <text class="sol" x="${X(sol.pone)}" y="126" text-anchor="middle">🌅 ${horaCR(d0 + sol.pone * 60e3)}</text>`;

    // La mejor hora para ir ese día: franja dorada, ese tramo de la curva resaltado y la hora
    // escrita arriba de la curva (cada hora es un botón que lleva la bolita al inicio)
    // En surf, además, las horas no tan buenas van en una franja apagada (Juan, 4-oct)
    if (ideal) {
      const delDia = (lista) => lista.filter(v => v.fin > d0 && v.ini < d0 + DIA)
        .map(v => ({ ini: Math.max(v.ini, d0), fin: Math.min(v.fin, d0 + DIA) }));
      const buenas = delDia(ideales), noTan = surf ? delDia(surf.noTan) : [];
      const xEn = (t) => X((t - d0) / 60e3);
      const tramo = ({ ini, fin }) => "M" + [ini, ...mareas.t.filter(t => t > ini && t < fin), fin]
        .map(t => `${xEn(t).toFixed(1)} ${Y(nivelEn(mareas, t)).toFixed(1)}`).join(" L");
      const franja = (v, clase) => `<rect${clase ? ` class="${clase}"` : ""} x="${xEn(v.ini)}" y="${yNoche}" ` +
        `width="${xEn(v.fin) - xEn(v.ini)}" height="${altoNoche}" rx="3"/>`;
      $(".marea-franjas").innerHTML = noTan.map(v => franja(v, "no-tan")).join("") + buenas.map(v => franja(v)).join("");
      $(".marea-linea-ideal").setAttribute("d", buenas.map(tramo).join(" "));
      const horas = (vs) => vs.map(v => {
        const m = Math.min(1425, Math.ceil((v.ini - d0) / 60e3 / 15) * 15);
        const paso = v.fin <= ahora; // hoy, la que ya se fue queda escrita pero apagada
        return `<button type="button" data-m="${m}"${paso ? ` class="pasada"` : ""}>${esc(rangoCR(v.ini, v.fin))}</button>` +
          (paso ? ` <small>${txt("yaPaso")}</small>` : "");
      }).join(txt("y"));
      const para = esc((enIngles() ? ideal.paraEn : ideal.para) || txt("paraDefecto"));
      $(".marea-ideal").innerHTML = surf
        ? `<span class="marea-ideal-linea"><span aria-hidden="true">★</span> ${txt("horasSurf", buenas.length ? horas(buenas) : txt("ningunaEsteDia"))}</span>` +
          (noTan.length ? `<span class="marea-ideal-linea no-tan">${txt("noTanBuenas", horas(noTan))}</span>` : "")
        : buenas.length
          ? `<span aria-hidden="true">★</span> ${txt("mejorHoraPara", para, horas(buenas))}`
          : `<span aria-hidden="true">★</span> ${txt("sinHoraIdeal", para)}`;
    }

    $(".marea-ext").innerHTML = extremos.filter(e => e.t >= d0 && e.t < d0 + DIA).map(e => {
      const m = (e.t - d0) / 60e3, x = X(m), y = Y(e.h);
      const tx = Math.min(MAREA_X1 - 32, Math.max(MAREA_X0 + 32, x));
      return `<g data-m="${m}"><circle cx="${x}" cy="${y}" r="2.5"/>` +
        `<text x="${tx}" y="${e.tipo === "alta" ? y - 7 : y + 14}" text-anchor="middle">` +
        `${txt("extremo", e.tipo, horaCR(e.t))}</text></g>`;
    }).join("");
  };

  const actualizar = () => {
    const ms = hoy + dia * DIA + minuto * 60e3;
    const v = nivelEn(mareas, ms), x = X(minuto), y = Y(v);
    ponerAttrs($(".marea-punto"), { cx: x, cy: y });
    ponerAttrs($(".marea-halo"), { cx: x, cy: y });
    ponerAttrs($(".marea-guia"), { x1: x, x2: x });
    ponerAttrs($(".marea-sonar"), { cx: x, cy: y });
    // Las etiquetas de alta y baja se apartan cuando la bolita pasa encima
    el.querySelectorAll(".marea-ext g")
      .forEach(g => { g.style.opacity = Math.abs(+g.dataset.m - minuto) < 75 ? 0.15 : 1; });
    barra.value = minuto;
    barra.style.setProperty("--p", `${minuto / 1425 * 100}%`);

    const [reloj, sufijo] = horaCR(ms).split(" ");
    $(".marea-hora").innerHTML = `${reloj}<small>${sufijo}</small>`;
    $(".marea-nivel").textContent = txt("nivel", Math.round((v - bajo) / (alto - bajo || 1) * 100));

    const hora = Math.floor(minuto / 60);
    if (ultimaHora !== null && hora !== ultimaHora) vibrar(6);
    ultimaHora = hora;
    const pico = extremos.find(e => Math.abs(e.t - ms) < 8 * 60e3) || null;
    if (pico && pico !== ultimoPico) vibrar(30);
    ultimoPico = pico;

    const sube = nivelEn(mareas, ms + 15 * 60e3) > v;
    const cerca = extremos.find(e => Math.abs(e.t - ms) <= HORA);
    const prox = extremos.find(e => e.t > ms);
    let siguiente = "";
    if (prox) {
      siguiente = prox === cerca ? txt("picoA", prox.tipo, horaCR(prox.t)) : txt("haciaA", prox.tipo, horaCR(prox.t));
      if (Math.floor(prox.t / DIA) !== Math.floor(ms / DIA)) siguiente += txt("diaSiguiente");
    }
    $(".marea-flecha").textContent = cerca ? (cerca.tipo === "alta" ? "▲" : "▼") : (sube ? "↗" : "↘");
    $(".marea-estado strong").textContent = cerca
      ? txt("mareaTipo", cerca.tipo) : txt(sube ? "subiendo" : "bajando");
    $(".marea-siguiente").textContent = siguiente;

    // Criterio de Juan: la marea "está" baja (o alta) de 2 h antes a 2 h después de su punto
    const enAhora = dia === 0 && minuto === minutoAhora;
    const ventana = extremos.find(e => Math.abs(e.t - ms) <= 2 * HORA);
    const viene = sube ? "alta" : "baja";
    let titulo, texto;
    if (surf) {
      // En surf, la caja dice si esa hora es buena para la ola, solo por la marea (Juan, 4-oct)
      titulo = txt(enAhora ? "surfAhora" : "surfAEsaHora");
      const dentro = (w) => w.ini <= ms && ms < w.fin;
      const buena = surf.buenas.some(dentro), noTan = surf.noTan.some(dentro);
      const gusta = txt("olaGusta", etapasEnPalabras(ideal.surf));
      texto = buena ? `${txt("horaBuena", etapaMarea(extremos, v, ms))} ${gusta}`
        : noTan ? `${txt("horaNoTan", etapaMarea(extremos, v, ms))} ${gusta}`
        : txt("deNoche");
      const prox = !buena && surf.buenas.find(w => w.ini > ms);
      if (prox) {
        const mismoDia = Math.floor(prox.ini / DIA) === Math.floor(ms / DIA);
        texto += txt("proximaHoraBuena", mismoDia ? "" : txt("dias")[new Date(prox.ini).getUTCDay()], horaCR(prox.ini));
      }
    } else if (ventana && voz[ventana.tipo]) {
      titulo = txt(enAhora ? "guilleAhora" : "guilleAEsaHora");
      texto = voz[ventana.tipo];
    } else if (voz[viene]) {
      titulo = txt("guilleViene");
      texto = voz[viene];
    } else {
      const otra = viene === "alta" ? "baja" : "alta";
      titulo = txt("guilleConMarea", otra);
      texto = voz[otra];
    }
    $(".marea-voz").hidden = !texto || sinVoz;
    $(".marea-voz-titulo").textContent = titulo;
    $(".marea-voz p").textContent = texto || "";
    botonAhora.hidden = enAhora;
  };

  barra.addEventListener("input", () => { tocando = true; minuto = +barra.value; actualizar(); });
  barra.addEventListener("change", () => { tocando = false; });
  botonAhora.addEventListener("click", () => {
    tocando = false;
    if (dia !== 0) { dia = 0; pintarDia(); }
    minuto = minutoAhora;
    actualizar();
  });
  el.querySelectorAll(".marea-dias button").forEach(b => b.addEventListener("click", () => {
    tocando = false;
    dia = +b.dataset.dia;
    pintarDia();
    actualizar();
  }));
  $(".marea-ideal")?.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-m]");
    if (!b) return;
    tocando = false;
    minuto = +b.dataset.m;
    actualizar();
  });
  // Con el dedo o el mouse sobre la curva también se mueve la hora
  const desdePuntero = (e) => {
    const r = svg.getBoundingClientRect();
    const vx = (e.clientX - r.left) / r.width * MAREA_W;
    minuto = Math.min(1425, Math.max(0, Math.round((vx - MAREA_X0) / (MAREA_X1 - MAREA_X0) * 1440 / 15) * 15));
    actualizar();
  };
  let arrastrando = false;
  svg.addEventListener("pointerdown", (e) => {
    arrastrando = tocando = true;
    try { svg.setPointerCapture(e.pointerId); } catch { /* sin captura igual sigue al dedo */ }
    desdePuntero(e);
  });
  svg.addEventListener("pointermove", (e) => { if (arrastrando) desdePuntero(e); });
  ["pointerup", "pointercancel"].forEach(t => svg.addEventListener(t, () => { arrastrando = tocando = false; }));

  pintarDia();
  actualizar();
  el.hidden = false;
}
