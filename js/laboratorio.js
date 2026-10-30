/* =========================================================
   Hey You ST · Itinerary laboratory
   El laboratorio de itinerarios: arma una propuesta al instante con lo que cuenta el
   visitante (cuántos son, presupuesto, días, gustos), deja que la arme él mismo, prueba
   el precio de un tour y mueve la barra del budget. Todo en un diálogo; nada se guarda.
   Independiente del resto de la UI del mapa: solo usa i18n, util, config y mareas.
   ========================================================= */
import { txt, enIngles, traducido, getIdioma } from "./i18n.js";
import { esc, usd, primeraFrase } from "./util.js";
import { CATEGORIAS, rotulo, LUGARES } from "./config.js";
import { cargarMareas, ventanasIdeales, DIA } from "./mareas.js";

// ---------- Itinerary laboratory (Juan, 24-oct) ----------
// Nació como "propuesta gratis" ("ahora tenemos la posibilidad de ofrecer propuestas gratis") y Juan lo
// llamó Itinerary laboratory. Después pidió que "pueda mostrar un producto de una vez": con lo que cuenta
// el visitante (cuántos son, presupuesto, días, qué le gusta), arma al instante un itinerario con opciones
// por día, todas al mismo precio, y lo abre en propuesta.html. Los tours salen de data/laboratorio.js
// (solo empresas locales con precio cerrado; lo arma scripts/exportar-laboratorio.js). Con ?demo en la
// dirección usa las empresas de ejemplo (data/laboratorio-demo.js, que no se publica). Si no entra nada,
// o si prefiere, le escribe a Juan para que un local se lo arme. La página no guarda nada en un servidor.
export const dialogoPropuesta = document.getElementById("dialogo-propuesta");
const pg = { personas: 2, presupuesto: "", dias: 3, desde: "", gustos: new Set(), nota: "", transporte: null, planes: {} };
const PG_LIMITES = { personas: [1, 30], dias: [1, 14] };
const enDemo = new URLSearchParams(location.search).has("demo");
if (enDemo) {
  const s = document.createElement("script");
  s.src = "data/laboratorio-demo.js";
  document.head.appendChild(s);
}
const catalogoLab = () => (enDemo && typeof LABORATORIO_DEMO !== "undefined" ? LABORATORIO_DEMO
  : typeof LABORATORIO !== "undefined" ? LABORATORIO : { tours: [] });

function fechaPropuesta(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString(enIngles() ? "en-US" : "es-CR", { weekday: "long", month: "long", day: "numeric" });
}
const sumarDias = (iso, n) => {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(a, m - 1, d + n);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
};
const presupuestoPg = () => Math.round(Number(String(pg.presupuesto).replace(",", ".")) || 0);

function mensajePropuestaGratis() {
  return txt("pgMensaje", {
    n: pg.personas, pp: presupuestoPg(), d: pg.dias, desde: pg.desde ? fechaPropuesta(pg.desde) : "",
    nota: [pg.nota.trim(), transporteLab() ? txt("pgQuiereTransporte", textoTransporteLab(transporteLab())) : "",
      Object.keys(pg.planes || {}).some(d => d <= pg.dias && pg.planes[d]) ? txt("pgQuierePlanes", Array.from({ length: pg.dias }, (_, i) => i + 1).filter(d => planDia(d)).map(d => `${txt("abDia", d)}: ${nombrePlan(planDia(d)).replace(/^\S+\s/, "").toLowerCase()}`).join(", ")) : ""].filter(Boolean).join("\n"),
    gustos: [...pg.gustos].filter(k => CATEGORIAS[k]).map(k => rotulo(CATEGORIAS[k]).toLowerCase()),
  });
}
const urlPropuestaGratis = () => `https://wa.me/${CONTACTO_JUAN.whatsapp}?text=${encodeURIComponent(mensajePropuestaGratis())}`;

// Transporte (Juan, 24-oct: "que en el laboratorio y en el itinerario se le pueda sumar un carro o transporte rentado"):
// carro o cuadra por día (todos los días del viaje) o traslado por viaje (solo ida o ida y vuelta). Los vehículos salen de
// cuántos son y cuántos caben en cada uno. No es una actividad: no ocupa días, entra en el precio del paquete.
const transportesLab = () => catalogoLab().transporte || [];
function transporteLab(n = pg.personas) {
  const t = pg.transporte && transportesLab().find(x => x.t === pg.transporte.t);
  if (!t) return null;
  const v = Math.max(1, Math.ceil(n / (t.cap || n))), d = t.tipo === "traslado" ? (pg.transporte.vuelta ? 2 : 1) : pg.dias;
  const q = v * d, total = q <= t.pq.length ? t.pq[q - 1] : t.pq[t.pq.length - 1] / t.pq.length * q;
  return { t, v, d, total, pp: total / n };
}
// "3 × Cuadra (cuadraciclo) · 3 días" / "1 × Traslado aeropuerto · ida y vuelta"
function textoTransporteLab(tr) {
  const nombre = (enIngles() && tr.t.en) || tr.t.es;
  return `${tr.v} × ${nombre} · ${tr.t.tipo === "traslado" ? txt(tr.d >= 2 ? "trIdaVuelta" : "trIda") : txt("trDias", tr.d)}`;
}
// En el link: el transporte, cuántos vehículos y por cuántos días o viajes (t: su id, para cargarlo en el sistema)
function trPayloadLab() {
  const tr = transporteLab();
  return tr ? { tr: Object.assign({ t: tr.t.t, es: tr.t.es }, tr.t.en ? { en: tr.t.en } : {}, { tipo: tr.t.tipo, v: tr.v, d: tr.d }, tr.t.sa ? { sa: tr.t.sa } : {}) } : {};
}

// Lo que paga cada persona en un tour, con n personas y k tours en el paquete (grupos de más de 20, como 20)
const precioLab = (t, n, k) => {
  const fila = t.pp[Math.min(n, t.pp.length) - 1];
  return fila ? fila[Math.min(k, fila.length) - 1] : null;
};
// Lugares libres de un tour un día, de la foto que trae el catálogo (Juan: "conectar disponibilidad por aquello de
// sobreventa"). Sin el día, no hay límite cargado. La reserva se confirma igual en el sistema, que frena si ya no hay.
const libresLab = (t, iso) => (t.lib && t.lib[iso] !== undefined ? t.lib[iso] : Infinity);
// El plan que la persona eligió para un día (Juan, 24-oct: "las personas podrán poner los días que estarán, el
// presupuesto y planes para cada día"): una categoría del mapa (surf, playa, naturaleza…), "libre" (sin tours: va
// una playa) o "" (lo que recomiende el laboratorio). Un día con plan solo lleva tours de ese plan.
const planDia = (d) => (pg.planes || {})[d] || "";
const vaEnElPlan = (t, d) => { const p = planDia(d); return p !== "libre" && (!p || (t.g || []).includes(p)); };
// Un tour de día completo va solo; los de medio día, hasta dos por día, con lugar y en el plan del día. Primero el día
// cuyo plan es justo ese tour, después el menos cargado
function diasLab(tours, dias, cabe) {
  const carga = Array(dias).fill(0), dia = [];
  const orden = tours.map((t, i) => ({ i, peso: t.dc ? 2 : 1 })).sort((a, b) => b.peso - a.peso);
  for (const { i, peso } of orden) {
    let mejor = -1;
    const pref = (d) => (planDia(d + 1) && planDia(d + 1) !== "libre" ? 1 : 0);
    for (let d = 0; d < dias; d++) if (carga[d] + peso <= 2 && cabe(tours[i], d + 1) && (mejor < 0 || pref(d) > pref(mejor) || (pref(d) === pref(mejor) && carga[d] < carga[mejor]))) mejor = d;
    if (mejor < 0) return null;
    carga[mejor] += peso;
    dia[i] = mejor + 1;
  }
  return dia;
}

// Lo que el laboratorio puede usar para el grupo: los tours que salen para esa cantidad, si un tour cabe un día (en su
// plan y con lugar) y hasta cuántas actividades arma (dos por día con tours, cinco como mucho)
function reglasLab() {
  const tr = transporteLab(), n = pg.personas;
  const tours = (catalogoLab().tours || []).filter(t => precioLab(t, n, 1) !== null);
  const cabe = (t, d) => vaEnElPlan(t, d) && (!pg.desde || libresLab(t, sumarDias(pg.desde, d - 1)) >= n);
  const diasConTours = Array.from({ length: pg.dias }, (_, i) => i + 1).filter(d => planDia(d) !== "libre");
  const tope = Math.min(tours.length > 18 ? 4 : 5, diasConTours.length * 2, tours.length);
  return { tr, n, tours, cabe, diasConTours, tope };
}
// Pasa por cada combinación de hasta `tope` tours
function combinacionesLab(tours, tope, visitar) {
  const sumar = (desde, actual) => {
    if (actual.length) visitar(actual);
    if (actual.length >= tope) return;
    for (let i = desde; i < tours.length; i++) sumar(i + 1, actual.concat([tours[i]]));
  };
  sumar(0, []);
}

// El itinerario: la combinación que entra en el presupuesto con más actividades y más de lo que le gusta,
// y para cada actividad hasta dos opciones más del mismo tipo de día que entran aunque elija lo más caro.
// El precio del paquete cubre la combinación más cara y nunca pasa del presupuesto: si sobra, se le dice.
// masActividades (la barra del budget): primero la mayor cantidad de actividades, después el plan y los gustos.
function armarItinerario(presupuesto = presupuestoPg(), masActividades = false) {
  // Con transporte, las actividades usan lo que queda del presupuesto después del transporte
  const { tr, n, tours, cabe, diasConTours, tope } = reglasLab();
  const b = presupuesto - (tr ? tr.pp : 0);
  if (!tours.length || b <= 0) return null;
  // Un día con plan también cuenta como algo que le gusta
  const gustos = new Set([...pg.gustos, ...Object.values(pg.planes || {}).filter(p => p && p !== "libre")]);
  const gusta = t => (t.g || []).filter(c => gustos.has(c)).length;
  const planeados = diasConTours.filter(d => planDia(d));
  // Primero que cada día con plan tenga lo suyo; después más actividades y más de lo que le gusta
  const cubiertos = c => planeados.filter(d => c.dia.includes(d)).length;
  const puntaje = masActividades ? c => [c.tours.length, cubiertos(c), c.gusto, c.costo]
    : c => [cubiertos(c), c.tours.length + c.gusto, c.gusto, c.costo];
  const mejorQue = (a, z) => { for (let i = 0; i < a.length; i++) if (a[i] !== z[i]) return a[i] > z[i]; return false; };
  let mejor = null;
  combinacionesLab(tours, tope, (lista) => {
    const k = lista.length;
    const costo = lista.reduce((s, t) => s + (precioLab(t, n, k) ?? Infinity), 0);
    if (costo > b + 0.005) return;
    const dia = diasLab(lista, pg.dias, cabe);
    if (!dia) return;
    const c = { tours: lista, dia, costo, gusto: lista.reduce((s, t) => s + gusta(t), 0) };
    if (!mejor || mejorQue(puntaje(c), puntaje(mejor))) mejor = c;
  });
  if (!mejor) return null;
  const k = mejor.tours.length, p = t => precioLab(t, n, k) ?? Infinity;
  const usados = new Set(mejor.tours.map(t => t.t));
  const slots = mejor.tours.map((t, i) => ({ dia: mejor.dia[i], opciones: [t] })).sort((a, z) => a.dia - z.dia);
  let holgura = b - mejor.costo;
  slots.forEach((sl, i) => {
    const base = sl.opciones[0], techo = p(base) + holgura / (slots.length - i);
    tours.filter(t => !usados.has(t.t) && t.dc === base.dc && p(t) <= techo + 0.005 && cabe(t, sl.dia))
      .sort((x, z) => gusta(z) - gusta(x) || Math.abs(p(x) - p(base)) - Math.abs(p(z) - p(base)))
      .slice(0, 2).forEach(t => { usados.add(t.t); sl.opciones.push(t); });
    holgura -= Math.max(...sl.opciones.map(p)) - p(base);
  });
  const precio = Math.ceil((Math.min(b, Math.ceil(slots.reduce((s, sl) => s + Math.max(...sl.opciones.map(p)), 0))) + (tr ? tr.pp : 0)) * 100) / 100;
  const dias = [];
  slots.forEach(sl => {
    let d = dias.find(x => x.dia === sl.dia);
    if (!d) { d = { dia: sl.dia, s: [] }; dias.push(d); }
    d.s.push(sl.opciones.map(t => opcionLab(t, [])));
  });
  return itinerarioLab(dias, precio, presupuesto);
}
// Lo que viaja en el link de cada opción: su nombre, cómo es, su id y los extras que el cliente le sumó
function opcionLab(t, extras) {
  const sv = (t.sv || []).filter(s => extras.includes(s.i));
  return Object.assign(Object.fromEntries(["es", "en", "du", "sa", "inc", "t"].filter(c => t[c]).map(c => [c, t[c]])),
    sv.length ? { x: sv.map(s => s.es), xi: sv.map(s => s.i) } : {}, sv.length && sv.every(s => s.en) ? { xe: sv.map(s => s.en) } : {});
}
// Días libres para conocer (Juan, 24-oct: "también en el laboratorio se pueden recomendar días free de playa" y "en
// esos días vamos a agregar opciones gratuitas para que las personas conozcan"): cada día sin actividad trae hasta
// tres lugares gratis del mapa para elegir uno, con lo que cuenta un local (data/points.js, los que tienen
// `gratis: true`). Primero los del plan de ese día y los que le gustan; entre días no se repiten mientras alcancen.
// Rutas a pie (Juan, 27-oct: "nuestra primera ruta para agregar en el laboratorio... una actividad low budget"):
// varias paradas gratis en orden, de data/rutas.js. En un día libre son una opción más y van antes que los lugares
// sueltos; ese día sus paradas no salen también como opción aparte.
const RUTAS_LAB = (typeof RUTAS !== "undefined" ? RUTAS : []).map(r => ({ properties: {
  id: r.id, nombre: r.nombre, entrada: r.entrada, icono: r.icono, ruta: r,
  categorias: r.categorias.filter(c => CATEGORIAS[c]), en: r.en && { nombre: r.en.nombre, entrada: r.en.entrada } } }));
const paradasRuta = (f) => (f.properties.ruta ? f.properties.ruta.paradas.map(p => p.lugar).filter(Boolean) : []);
function gratisLibres(vacios) {
  const lugares = RUTAS_LAB.concat(LUGARES.filter(f => f.properties.gratis));
  const veces = new Map(), id = f => f.properties.id || f.properties.nombre;
  return vacios.map(d => {
    const plan = planDia(d);
    const puntaje = f => {
      const c = f.properties.categorias;
      return (plan && plan !== "libre" && c.includes(plan) ? 4 : 0) + c.filter(x => pg.gustos.has(x)).length
        + (f.properties.ruta ? 1 : 0) - 3 * (veces.get(id(f)) || 0);
    };
    const opciones = [];
    for (const f of lugares.slice().sort((a, z) => puntaje(z) - puntaje(a))) {
      if (opciones.length >= 3) break;
      const ya = new Set(opciones.flatMap(o => [id(o), ...paradasRuta(o)]));
      if (!ya.has(id(f)) && !paradasRuta(f).some(p => ya.has(p))) opciones.push(f);
    }
    opciones.forEach(f => veces.set(id(f), (veces.get(id(f)) || 0) + 1));
    return opciones;
  });
}
// El ícono del lugar en el día libre: cascada, playa, naturaleza o atardecer, lo primero que tenga. Una ruta trae el suyo
const iconoLibre = (cats) => (CATEGORIAS[["cascada", "playa", "naturaleza", "atardecer"].find(c => cats.includes(c))] || {}).emoji || "📍";
const iconoDe = (p) => p.icono || iconoLibre(p.categorias);
// A qué hora llegar a la parada que manda la marea (ej. Playa Grande, con la marea baja y en la mañana o la tarde por
// el sol), si el día del viaje cae en el pronóstico de Open-Meteo (8 días). La marea se pide al abrir el laboratorio;
// sin fecha o sin pronóstico, la propuesta dice la regla del local. hm: [[desde, hasta]] en minutos del día, hora tica.
const mareasRutas = new Map();
function prepararMareasRutas() {
  RUTAS_LAB.forEach(({ properties: { id, ruta } }) => {
    const f = ruta.marea && POINTS.features.find(x => x.properties.id === ruta.marea.lugar);
    if (!f || mareasRutas.has(id)) return;
    const [lng, lat] = f.geometry.coordinates;
    cargarMareas(lng, lat).then(m => mareasRutas.set(id, { m, lng, lat })).catch(() => {});
  });
}
function horasRuta(r, iso) {
  const datos = mareasRutas.get(r.id), dia = iso ? Date.parse(iso + "T00:00Z") : NaN;
  if (!datos || !r.marea || isNaN(dia) || dia < datos.m.t[0] || dia > datos.m.t[datos.m.t.length - 1] - DIA / 2) return {};
  const v = ventanasIdeales({ marea: r.marea.tipo, ventana: r.marea.ventana, horas: r.marea.horas }, datos.m, datos.lng, datos.lat)
    .filter(x => x.ini >= dia && x.ini < dia + DIA);
  return { hm: v.map(x => [Math.round((x.ini - dia) / 60e3), Math.round((x.fin - dia) / 60e3)]) };
}
// Lo que viaja en el link de cada lugar de un día libre: su nombre, su primera frase local y su ícono, en los dos idiomas.
// Una ruta lleva además su id (ru: propuesta.html saca las paradas de data/rutas.js) y la hora de llegar ese día (hm)
function diaLibreLab(f, iso) {
  const p = f.properties, en = p.en || {};
  return Object.assign({ n: p.nombre, t: primeraFrase(p.entrada), i: iconoDe(p) },
    en.nombre ? { ne: en.nombre } : {}, en.entrada ? { te: primeraFrase(en.entrada) } : {},
    p.ruta ? Object.assign({ ru: p.id }, horasRuta(p.ruta, iso)) : {});
}
// El itinerario para propuesta.html: cada día con su número (dn), y los días sin actividad como días libres con
// lugares gratis para elegir (libres)
function itinerarioLab(dias, precio, presupuesto = presupuestoPg()) {
  const hoy = new Date();
  const vacios = Array.from({ length: pg.dias }, (_, i) => i + 1).filter(d => !dias.some(x => x.dia === d));
  gratisLibres(vacios).forEach((lugares, i) => {
    if (lugares.length) dias.push({ dia: vacios[i], s: [], libres: lugares.map(f => diaLibreLab(f, pg.desde ? sumarDias(pg.desde, vacios[i] - 1) : null)) });
  });
  return Object.assign({
    v: 1, c: `HYL-${String(hoy.getMonth() + 1).padStart(2, "0")}${String(hoy.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`,
    n: pg.personas, pp: precio, b: presupuesto, i: getIdioma(), lab: 1, ...trPayloadLab(),
    d: dias.sort((a, z) => a.dia - z.dia).map(x => Object.assign(pg.desde ? { f: sumarDias(pg.desde, x.dia - 1) } : {}, { dn: x.dia, s: x.s }, x.libres ? { libres: x.libres } : {})),
  }, enDemo ? { ej: 1 } : {});
}
function linkItinerario(p) {
  let bin = "";
  new TextEncoder().encode(JSON.stringify(p)).forEach(c => { bin += String.fromCharCode(c); });
  return "propuesta.html#p=" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ---------- Lo arma el cliente (Juan, 24-oct) ----------
// "Las personas podrán crear sus propios tours: seleccionar el budget, la cantidad de personas, la cantidad de
// días y agregar opciones; el mismo sistema tira lo que está disponible". En el mismo diálogo, después del
// formulario: elige un día y ve solo lo que tiene lugar ese día para su grupo, cabe en el día y entra en lo que
// le queda del presupuesto. Suma actividades y sus extras; ve cuánto lleva y cuánto le queda, no el precio de
// cada cosa. Paga lo que vale lo que armó, con "más tours, más barato". Igual que el laboratorio del sistema.
const ab = { mios: [], dia: 1 };
export let enArmado = false;
const tourLab = (id) => (catalogoLab().tours || []).find(t => t.t === id);
const pesoLab = (t) => (t && t.dc ? 2 : 1);
const duracionLab = (s) => (!s || !enIngles() ? s || "" : String(s)
  .replace(/día completo/i, "full day").replace(/medio día/i, "half day")
  .replace(/(\d+)\s*horas?\s*y\s*media/i, (_, h) => `${h}.5 hours`).replace(/(\d+)\s*[–-]\s*(\d+)\s*horas/i, "$1–$2 hours")
  .replace(/(\d+)\s*horas?/i, (_, h) => `${h} ${h === "1" ? "hour" : "hours"}`));
// Lo que paga cada persona por lo que armó (null si algo ya no sirve para el grupo)
function cuentaArmado(mios) {
  const n = pg.personas, k = mios.length, tr = transporteLab();
  let total = tr ? tr.total : 0;
  for (const m of mios) {
    const t = tourLab(m.t), p = t && precioLab(t, n, k);
    if (p === null || p === undefined) return null;
    total += p * n + (t.sv || []).filter(s => m.x.includes(s.i)).reduce((s, x) => s + x.p * (x.u === "persona" ? n : 1), 0);
  }
  return Math.ceil(total / n * 100) / 100;
}
const cargaDia = (d) => ab.mios.filter(m => m.dia === d).reduce((s, m) => s + pesoLab(tourLab(m.t)), 0);
const fechaDia = (d) => (pg.desde ? sumarDias(pg.desde, d - 1) : "");
export function pintarArmado(foco) {
  const n = pg.personas, b = presupuestoPg();
  ab.mios = ab.mios.filter(m => m.dia <= pg.dias && tourLab(m.t));
  if (ab.dia > pg.dias) ab.dia = 1;
  // Se elige para un día con lugar y que no sea libre
  const conLugarDia = (d) => cargaDia(d) < 2 && planDia(d) !== "libre";
  if (!conLugarDia(ab.dia)) ab.dia = Array.from({ length: pg.dias }, (_, i) => i + 1).find(conLugarDia) || ab.dia;
  const trA = transporteLab();
  const lleva = ab.mios.length || trA ? cuentaArmado(ab.mios) ?? 0 : 0, queda = Math.round((b - lleva) * 100) / 100;
  const usado = b ? Math.min(100, Math.round(lleva / b * 100)) : 0;
  const nombre = (t) => (enIngles() && t.en) || t.es;
  const meta = (t) => [duracionLab(t.du), t.sa].filter(Boolean).join(" · ");
  const extraNombre = (s) => (enIngles() && s.en) || s.es;
  // Lo disponible para el día elegido: cabe en el día, tiene lugar para el grupo y no está ya ese día
  const libre = 2 - cargaDia(ab.dia);
  const candidatos = (catalogoLab().tours || []).filter(t => precioLab(t, n, 1) !== null && pesoLab(t) <= libre && !ab.mios.some(m => m.dia === ab.dia && m.t === t.t));
  const conLugar = candidatos.filter(t => !pg.desde || libresLab(t, fechaDia(ab.dia)) >= n);
  // Sin presupuesto (llegó desde "Probá el precio"), todo entra y solo se ve cuánto lleva
  const disponibles = conLugar.map(t => ({ t, entra: !b || (cuentaArmado(ab.mios.concat([{ t: t.t, dia: ab.dia, x: [] }])) ?? Infinity) <= b + 0.005,
    gusta: (t.g || []).some(c => pg.gustos.has(c)), plan: !!planDia(ab.dia) && (t.g || []).includes(planDia(ab.dia)) }))
    .sort((x, z) => z.entra - x.entra || z.plan - x.plan || z.gusta - x.gusta || nombre(x.t).localeCompare(nombre(z.t)));
  const dias = Array.from({ length: pg.dias }, (_, i) => i + 1);
  // Los días que siguen vacíos traen lugares gratis para conocer; uno se elige en el itinerario
  const vacios = dias.filter(d => !ab.mios.some(m => m.dia === d));
  const gratis = gratisLibres(vacios);
  const gratisDe = (d) => (gratis[vacios.indexOf(d)] || []).map(f => traducido(f.properties));
  dialogoPropuesta.classList.add("ancho");
  dialogoPropuesta.innerHTML = `
    <form method="dialog" class="pg">
      <button type="submit" class="pg-cerrar" aria-label="${esc(txt("cerrar"))}">✕</button>
      <h2 id="pg-titulo">${esc(txt("abTitulo"))}</h2>
      ${enDemo ? `<p class="pg-demo">${esc(txt("pgDemo"))}</p>` : ""}
      <div class="ab-cuenta" aria-live="polite">
        <span class="ab-precio">${esc(usd(lleva))}</span> <span class="ab-suave">${esc(txt("porPersonaLab"))}</span>
        <div class="ab-barra" role="img" aria-label="${esc(txt("abUsado", usado))}"><span style="width:${usado}%"${queda < 0 ? ' class="pasado"' : ""}></span></div>
        <span class="${b && queda < 0 ? "ab-alerta" : "ab-acento"}">${esc(!b ? txt("abSinPresupuesto") : queda < 0 ? txt("abTePasas", usd(-queda), usd(b)) : txt("abTeQuedan", usd(queda), usd(b)))}${ab.mios.length > 1 ? " " + esc(txt("abMasBarato", ab.mios.length)) : ""}</span>
      </div>
      ${trA ? `<div class="ab-act"><span class="ab-act-txt"><b>🚙 ${esc(txt("abTransporte"))}</b><span>${esc(textoTransporteLab(trA))}</span>${trA.t.sa ? `<span class="ab-suave">${esc(trA.t.sa)}</span>` : ""}</span></div>` : ""}
      ${dias.map(d => {
        const del = ab.mios.filter(m => m.dia === d), lleno = cargaDia(d) >= 2;
        return `<section class="ab-dia${d === ab.dia ? " sel" : ""}" aria-label="${esc(txt("abDia", d))}">
          <div class="ab-dia-top"><b>${esc(txt("abDia", d))}${pg.desde ? ` <span class="ab-suave">${esc(fechaPropuesta(fechaDia(d)))}</span>` : ""}</b>
            ${planDia(d) ? `<span class="ab-plan">${esc(txt("abPlan", nombrePlan(planDia(d))))}</span>` : ""}
            ${planDia(d) === "libre" ? "" : d === ab.dia ? `<span class="ab-acento">${esc(txt("abEligiendo"))}</span>`
              : !lleno ? `<button type="button" class="ab-mas" data-ab="dia" data-d="${d}">${esc(txt("abAgregarDia"))}</button>` : `<span class="ab-suave">${esc(txt("abDiaCompleto"))}</span>`}</div>
          ${!del.length ? (gratisDe(d).length ? `<span class="ab-playa">${esc(txt("libreGratis"))}</span><span class="ab-suave">${gratisDe(d).map(p => `${esc(iconoDe(p))} ${esc(p.nombre)}`).join(" · ")}</span>`
            : `<span class="ab-suave">${esc(txt("abLibre"))}</span>`) : del.map(m => { const t = tourLab(m.t); return `<div class="ab-act">
            <span class="ab-act-txt"><b>${esc(nombre(t))}</b><span class="ab-suave">${esc(meta(t))}</span>
              ${(t.sv || []).length ? `<span class="ab-extras">${t.sv.map(s => `<button type="button" class="ab-extra" data-ab="extra" data-k="${esc(m.k)}" data-x="${esc(s.i)}" aria-pressed="${m.x.includes(s.i)}">${m.x.includes(s.i) ? "✓" : "+"} ${esc(extraNombre(s))}</button>`).join("")}</span>` : ""}</span>
            <button type="button" class="ab-quitar" data-ab="quitar" data-k="${esc(m.k)}" aria-label="${esc(txt("abQuitar", nombre(t)))}">✕</button>
          </div>`; }).join("")}
        </section>`;
      }).join("")}
      <h3 class="ab-h">${esc(txt("abDisponible", ab.dia, pg.desde ? " · " + fechaPropuesta(fechaDia(ab.dia)) : ""))}</h3>
      ${libre <= 0 ? `<p class="ab-suave">${esc(txt("abDiaLleno"))}</p>`
        : !disponibles.length ? `<p class="ab-suave">${esc(txt("abNada"))}</p>`
        : `<div class="ab-lista">${disponibles.map(({ t, entra, gusta, plan }) => `<div class="ab-op${entra ? "" : " no"}">
            <span class="ab-act-txt"><b>${esc(nombre(t))}</b><span class="ab-suave">${esc(meta(t))}${t.dc && !/día completo/i.test(t.du || "") ? " · " + esc(txt("abDiaEntero")) : ""}</span>
              ${plan ? `<span class="ab-acento">✓ ${esc(txt("abVaConTuPlan"))}</span>` : gusta ? `<span class="ab-acento">✨ ${esc(txt("abLeGusta"))}</span>` : ""}</span>
            ${entra ? `<button type="button" class="ab-agregar" data-ab="agregar" data-tour="${esc(t.t)}">${esc(txt("abAgregar"))}</button>` : `<span class="ab-suave">${esc(txt("abNoEntra"))}</span>`}
          </div>`).join("")}</div>`}
      ${candidatos.length > conLugar.length ? `<p class="ab-suave">${esc(txt("abSinLugar", candidatos.length - conLugar.length))}</p>` : ""}
      <button type="button" class="reservar pg-armar" data-ab="ver"${ab.mios.length || trA ? "" : " disabled"}>${esc(txt("abVer"))}</button>
      <button type="button" class="pg-secundario ab-volver" data-ab="volver">${esc(txt("abVolver"))}</button>
    </form>`;
  if (foco) dialogoPropuesta.querySelector(foco)?.focus();
}
// Lo que armó, como itinerario para propuesta.html (una opción por actividad)
function itinerarioArmado() {
  const dias = [];
  ab.mios.forEach(m => {
    let d = dias.find(x => x.dia === m.dia);
    if (!d) { d = { dia: m.dia, s: [] }; dias.push(d); }
    d.s.push([opcionLab(tourLab(m.t), m.x)]);
  });
  return itinerarioLab(dias, cuentaArmado(ab.mios));
}
function accionArmado(b) {
  const a = b.dataset.ab;
  if (a === "dia") { ab.dia = Number(b.dataset.d); pintarArmado(".ab-agregar, .ab-volver"); return; }
  if (a === "agregar") {
    ab.mios.push({ k: Math.random().toString(36).slice(2, 8), t: b.dataset.tour, dia: ab.dia, x: [] });
    // Si el día se llenó, pasa al próximo día con lugar
    if (cargaDia(ab.dia) >= 2) { const sig = Array.from({ length: pg.dias }, (_, i) => i + 1).find(d => cargaDia(d) < 2); if (sig) ab.dia = sig; }
    guardarPg(); pintarArmado(".ab-agregar, .ab-volver"); return;
  }
  if (a === "quitar") { ab.mios = ab.mios.filter(m => m.k !== b.dataset.k); guardarPg(); pintarArmado(".ab-volver"); return; }
  if (a === "extra") {
    const m = ab.mios.find(x => x.k === b.dataset.k), x = b.dataset.x;
    if (m) m.x = m.x.includes(x) ? m.x.filter(y => y !== x) : m.x.concat([x]);
    guardarPg(); pintarArmado(`[data-k="${b.dataset.k}"][data-x="${x}"]`); return;
  }
  if (a === "ver") { guardarPg(); location.href = linkItinerario(itinerarioArmado()); return; }
  if (a === "volver") { enArmado = false; dialogoPropuesta.classList.remove("ancho"); pintarPropuestaGratis(); dialogoPropuesta.querySelector("#pg-armar-yo")?.focus(); }
}

// ---------- Probá el precio de un tour (Juan, 24-oct) ----------
// "La persona podrá escoger un tour y experimentar el precio por persona dependiendo de la cantidad de personas".
// Elige un tour y cambia cuántos son: ve lo que paga cada persona, cómo baja con el grupo y cuánto más baja si lo
// suma a un paquete con más tours. De ahí puede arrancar su itinerario con ese tour.
const simu = { t: "", n: 0 };
export let enPrecios = false;
const TAMANOS_SIMU = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
export function pintarPrecios(foco) {
  const tours = (catalogoLab().tours || []).filter(t => t.pp.some(Boolean));
  if (!simu.n) simu.n = pg.personas;
  const t = tours.find(x => x.t === simu.t) || tours.find(x => (x.g || []).some(c => pg.gustos.has(c))) || tours[0];
  if (!t) return;
  simu.t = t.t;
  const nombre = (x) => (enIngles() && x.en) || x.es;
  const pp = precioLab(t, simu.n, 1);
  let antes = null;
  const filas = TAMANOS_SIMU.map(n => ({ n, p: precioLab(t, n, 1) })).filter(f => f.p !== null && f.p !== undefined).map(f => {
    const baja = antes !== null && f.p < antes - 0.005;
    antes = f.p;
    return Object.assign(f, { baja });
  });
  dialogoPropuesta.classList.add("ancho");
  dialogoPropuesta.innerHTML = `
    <form method="dialog" class="pg">
      <button type="submit" class="pg-cerrar" aria-label="${esc(txt("cerrar"))}">✕</button>
      <h2 id="pg-titulo">${esc(txt("ppTitulo"))}</h2>
      ${enDemo ? `<p class="pg-demo">${esc(txt("pgDemo"))}</p>` : ""}
      <p class="pg-intro">${esc(txt("ppIntro"))}</p>
      <label class="pg-campo"><span class="pg-etiqueta">${esc(txt("ppTour"))}</span>
        <select id="pp-tour">${tours.map(x => `<option value="${esc(x.t)}"${x.t === t.t ? " selected" : ""}>${esc(nombre(x))}</option>`).join("")}</select></label>
      <span class="ab-suave">${esc([duracionLab(t.du), t.sa, t.inc].filter(Boolean).join(" · "))}</span>
      <div class="pg-campo">
        <span class="pg-etiqueta" id="pp-n-l">${esc(txt("pgPersonas"))}</span>
        <div class="pg-paso" role="group" aria-labelledby="pp-n-l">
          <button type="button" data-sim="menos" aria-label="${esc(txt("pgMenos", txt("pgPersonas")))}">−</button>
          <output aria-live="polite">${simu.n}</output>
          <button type="button" data-sim="mas" aria-label="${esc(txt("pgMas", txt("pgPersonas")))}">+</button>
        </div>
      </div>
      <div class="ab-cuenta" aria-live="polite">
        ${pp === null || pp === undefined ? `<span class="ab-alerta">${esc(txt("ppNoSale", simu.n))}</span>`
          : `<span><span class="ab-precio">${esc(usd(pp))}</span> <span class="ab-suave">${esc(txt("porPersonaLab"))} · ${esc(txt("ppTotal", usd(pp * simu.n)))}</span></span>
             ${[2, 3, 4].map(k => ({ k, p: precioLab(t, simu.n, k) })).filter(x => x.p !== null && x.p < pp - 0.005).slice(-1).map(x => `<span class="ab-acento">${esc(txt("ppPaquete", x.k, usd(x.p)))}</span>`).join("")}`}
      </div>
      <h3 class="ab-h">${esc(txt("ppComo"))}</h3>
      <div class="pp-tabla" role="list">${filas.map(f => `<div class="pp-fila${f.n === simu.n ? " actual" : ""}" role="listitem">
        <span>${esc(txt("ppFila", f.n))}</span><b>${esc(usd(f.p))}</b>${f.baja ? `<span class="ab-acento">↓ ${esc(txt("ppBaja"))}</span>` : "<span></span>"}</div>`).join("")}</div>
      <button type="button" class="reservar pg-armar" data-sim="armar"${pp === null || pp === undefined ? " disabled" : ""}>${esc(txt("ppArmar"))}</button>
      <button type="button" class="pg-secundario ab-volver" data-sim="volver">${esc(txt("abVolver"))}</button>
    </form>`;
  if (foco) dialogoPropuesta.querySelector(foco)?.focus();
}
function accionPrecios(b) {
  const a = b.dataset.sim;
  if (a === "menos" || a === "mas") { simu.n = Math.min(PG_LIMITES.personas[1], Math.max(1, simu.n + (a === "mas" ? 1 : -1))); pintarPrecios(`[data-sim="${a}"]`); return; }
  if (a === "volver") { enPrecios = false; dialogoPropuesta.classList.remove("ancho"); pintarPropuestaGratis(); dialogoPropuesta.querySelector("#pg-probar")?.focus(); return; }
  if (a === "armar") {
    // Arranca su itinerario con ese tour el día 1, para ese grupo
    pg.personas = simu.n;
    if (!ab.mios.some(m => m.t === simu.t)) ab.mios.push({ k: Math.random().toString(36).slice(2, 8), t: simu.t, dia: 1, x: [] });
    enPrecios = false; enArmado = true; guardarPg(); pintarArmado("#pg-titulo");
  }
}

// ---------- Más budget, más actividades (Juan, 24-oct) ----------
// "Quiero que haya una parte donde solo aparezca una barra donde las personas puedan ver que mientras más budget por
// persona, más actividades para hacer; el mismo laboratorio con opciones diferentes". Mueve la barra y el laboratorio
// arma al instante lo más que entra. Debajo de la barra se ve desde cuánto entra cada actividad más. Cada actividad
// trae sus opciones y se elige una ("me gustó mucho que las personas pueden seleccionar una de varias opciones por
// día"); todas salen al mismo precio. Usa el plan de cada día, los gustos, la fecha y el transporte del formulario.
// "Solo 1" (Juan, 24-oct: "que la persona sea capaz de agregar 'si quiero solo hacer una actividad', y con el número
// de personas se ven precios más económicos"): la barra muestra las actividades que entran en su budget, cada una con
// lo que paga cada persona de su grupo, y paga la que elige. Al sumar personas, esos precios bajan.
const barra = { b: 0, sel: {}, p: null, niveles: [], cuantas: 0, ops: [] };
export let enBarra = false;
const BARRA_PASO = 5;
const LETRAS_LAB = "ABCDEFGHIJKLMNOP";
// Desde cuánto por persona entran 1, 2, 3… actividades en los días del viaje (con lugar y en el plan de cada día),
// en pasos de la barra. Si dos niveles caen en el mismo paso, queda el de más actividades.
function escaleraLab() {
  const { tr, n, tours, cabe, tope } = reglasLab();
  const minimo = [];
  combinacionesLab(tours, tope, (lista) => {
    const k = lista.length, costo = lista.reduce((s, t) => s + (precioLab(t, n, k) ?? Infinity), 0);
    if (costo < (minimo[k] ?? Infinity) && diasLab(lista, pg.dias, cabe)) minimo[k] = costo;
  });
  const niveles = [];
  minimo.forEach((c, k) => niveles.push({ k, desde: Math.ceil((c + (tr ? tr.pp : 0)) / BARRA_PASO) * BARRA_PASO }));
  return niveles.filter((x, i) => !niveles.slice(i + 1).some(y => y.desde <= x.desde));
}
// Solo 1: cada actividad que sale para el grupo, el primer día en que cabe y lo que paga cada persona (con transporte),
// de la más barata a la más cara
function unaLab() {
  const { tr, n, tours, cabe } = reglasLab();
  return tours.map(t => {
    const dia = Array.from({ length: pg.dias }, (_, i) => i + 1).find(d => cabe(t, d));
    return dia ? { t, dia, pp: Math.ceil((precioLab(t, n, 1) + (tr ? tr.pp : 0)) * 100) / 100 } : null;
  }).filter(Boolean).sort((a, z) => a.pp - z.pp);
}
// Solo 1: desde cuánto se ven 1, 2, 3… opciones
function nivelesUna(ops) {
  const niveles = [];
  ops.forEach((o, i) => {
    const desde = Math.ceil(o.pp / BARRA_PASO) * BARRA_PASO, ult = niveles[niveles.length - 1];
    if (ult && ult.desde === desde) ult.k = i + 1; else niveles.push({ k: i + 1, desde });
  });
  return niveles;
}
// El itinerario para el budget de la barra. Con "Solo 1", la actividad elegida (si no eligió, la que más le gusta y
// mejor entra) a su propio precio, y los demás días libres con lugares gratis
function armarBarra() {
  if (barra.cuantas !== 1) { barra.p = armarItinerario(barra.b, true); return; }
  barra.ops = unaLab().filter(o => o.pp <= barra.b + 0.005);
  if (!barra.ops.length) { barra.p = null; return; }
  const gustos = new Set([...pg.gustos, ...Object.values(pg.planes || {}).filter(p => p && p !== "libre")]);
  const gusta = o => (o.t.g || []).filter(c => gustos.has(c)).length;
  const elegida = barra.ops.find(o => o.t.t === barra.sel.una) || barra.ops.slice().sort((a, z) => gusta(z) - gusta(a) || z.pp - a.pp)[0];
  barra.sel.una = elegida.t.t;
  barra.p = itinerarioLab([{ dia: elegida.dia, s: [[opcionLab(elegida.t, [])]] }], elegida.pp, barra.b);
}
// Lo que pagaría cada persona por lo mismo con un grupo más grande (Juan: "con el número de personas se ven precios
// más económicos"): el primer tamaño, hasta 5 personas más, en que baja
function conUnoMas(p) {
  const actividades = p.d.flatMap(d => d.s), k = actividades.length;
  for (let n = pg.personas + 1; n <= Math.min(pg.personas + 5, PG_LIMITES.personas[1]); n++) {
    const tr = transporteLab(n);
    let suma = 0;
    for (const s of actividades) {
      const precios = s.map(o => { const t = tourLab(o.t); return t ? precioLab(t, n, k) : null; });
      if (precios.some(x => x === null || x === undefined)) return null;
      suma += Math.max(...precios);
    }
    const pp = Math.ceil((suma + (tr ? tr.pp : 0)) * 100) / 100;
    if (pp < p.pp - 0.5) return { n, pp };
  }
  return null;
}
function avisoBarra() {
  if (!(catalogoLab().tours || []).length) return txt("pgSinTours");
  if (Array.from({ length: pg.dias }, (_, i) => i + 1).every(d => planDia(d) === "libre")) return txt("pgTodoLibre");
  return txt("bbSinLugar");
}
// La opción elegida de cada actividad ("día-actividad"); si ya no está entre las opciones, la primera
const elegidaBarra = (clave, s) => Math.max(0, s.findIndex(o => o.t === barra.sel[clave]));
// El lugar gratis elegido de un día libre ("día-libre")
const libreElegido = (d) => Math.max(0, (d.libres || []).findIndex(l => l.n === barra.sel[`${d.dn}-libre`]));
export function pintarBarra(foco) {
  const una = barra.cuantas === 1;
  const niveles = barra.niveles = una ? nivelesUna(unaLab()) : escaleraLab();
  // Con "las que entren", la barra llega un poco más allá del último nivel, para que se vean más opciones; con
  // "solo 1", hasta la actividad más cara
  const min = niveles.length ? niveles[0].desde : 0, ultimo = niveles.length ? niveles[niveles.length - 1].desde : 0;
  const max = Math.max(min + 50, una ? Math.ceil(ultimo / 10) * 10 : Math.ceil(ultimo * 1.25 / 50) * 50);
  const inicio = niveles.length ? (una ? niveles[Math.min(2, niveles.length - 1)] : niveles[1] || niveles[0]).desde : 0;
  if (niveles.length) barra.b = Math.min(max, Math.max(min, Math.round((barra.b || inicio) / BARRA_PASO) * BARRA_PASO));
  const pct = (v) => (v - min) / (max - min) * 100;
  // La marca va debajo del centro de la perilla (24 px), que no llega a los bordes de la barra
  const marca = (v) => `calc(${pct(v).toFixed(2)}% + ${(12 - 0.24 * pct(v)).toFixed(1)}px)`;
  // Las marcas muy juntas se pisan: queda la de más actividades (u opciones), salvo la primera
  const marcas = [];
  niveles.forEach(x => {
    const ult = marcas[marcas.length - 1];
    if (!ult || pct(x.desde) - pct(ult.desde) >= 9) marcas.push(x); else if (marcas.length > 1) marcas[marcas.length - 1] = x;
  });
  dialogoPropuesta.classList.add("ancho");
  dialogoPropuesta.innerHTML = `
    <form method="dialog" class="pg">
      <button type="submit" class="pg-cerrar" aria-label="${esc(txt("cerrar"))}">✕</button>
      <h2 id="pg-titulo">${esc(txt("bbTitulo"))}</h2>
      ${enDemo ? `<p class="pg-demo">${esc(txt("pgDemo"))}</p>` : ""}
      <p class="pg-intro">${esc(txt(una ? "bbIntroUna" : "bbIntro"))}</p>
      <div class="pg-fila">
        ${pasoPropuesta("personas", txt("pgPersonas"))}
        ${pasoPropuesta("dias", txt("pgDias"))}
      </div>
      <div class="pg-campo">
        <span class="pg-etiqueta" id="bb-modo-l">${esc(txt("bbModo"))}</span>
        <div class="bb-modo" role="group" aria-labelledby="bb-modo-l">
          ${[[0, "bbModoTodas"], [1, "bbModoUna"]].map(([k, t]) => `<button type="button" data-bb="cuantas" data-k="${k}" aria-pressed="${barra.cuantas === k}">${esc(txt(t))}</button>`).join("")}
        </div>
      </div>
      ${!niveles.length ? `<p class="pg-aviso" role="status">${esc(avisoBarra())}</p>` : `
      <div class="bb-barra">
        <div class="bb-top"><label class="pg-etiqueta" for="bb-b">${esc(txt("bbPresupuesto"))}</label><output class="ab-precio" id="bb-valor" for="bb-b">${esc(usd(barra.b))}</output></div>
        <input type="range" class="bb-rango" id="bb-b" min="${min}" max="${max}" step="${BARRA_PASO}" value="${barra.b}">
        <div class="bb-marcas">${marcas.map(x => `<button type="button" class="bb-marca" data-bb="nivel" data-b="${x.desde}" style="left:${marca(x.desde)}" aria-label="${esc(txt(una ? "bbMarcaUna" : "bbMarca", x.k, usd(x.desde)))}"><b>${x.k}</b><span>${esc(usd(x.desde))}</span></button>`).join("")}</div>
      </div>
      <div class="bb-resumen" id="bb-resumen" aria-live="polite"></div>
      <div class="bb-dias" id="bb-dias"></div>
      <button type="button" class="reservar pg-armar" data-bb="ver">${esc(txt("abVer"))}</button>`}
      <button type="button" class="pg-secundario ab-volver" data-bb="volver">${esc(txt("abVolver"))}</button>
    </form>`;
  if (niveles.length) { armarBarra(); pintarResultadoBarra(); }
  if (foco) dialogoPropuesta.querySelector(foco)?.focus();
}
// Lo que cambia al mover la barra o elegir una opción; la barra no se vuelve a dibujar, para no cortar el arrastre
function pintarResultadoBarra(foco) {
  const p = barra.p, niveles = barra.niveles, una = barra.cuantas === 1, rango = dialogoPropuesta.querySelector("#bb-b");
  rango.style.setProperty("--lleno", `${(barra.b - Number(rango.min)) / (Number(rango.max) - Number(rango.min)) * 100}%`);
  dialogoPropuesta.querySelector("#bb-valor").textContent = usd(barra.b);
  dialogoPropuesta.querySelectorAll(".bb-marca").forEach(m => m.classList.toggle("ok", Number(m.dataset.b) <= barra.b));
  dialogoPropuesta.querySelector('[data-bb="ver"]').disabled = !p;
  const resumen = dialogoPropuesta.querySelector("#bb-resumen"), dias = dialogoPropuesta.querySelector("#bb-dias");
  if (!p) { resumen.innerHTML = `<span class="ab-alerta">${esc(avisoBarra())}</span>`; dias.innerHTML = ""; return; }
  const nombre = (o) => (enIngles() && o.en) || o.es;
  const meta = (o) => [duracionLab(o.du), o.sa].filter(Boolean).join(" · ");
  const texto = (o) => `<span class="ab-act-txt"><b>${esc(nombre(o))}</b>${meta(o) ? `<span class="ab-suave">${esc(meta(o))}</span>` : ""}</span>`;
  const sig = niveles.find(x => x.desde > barra.b), mas = conUnoMas(p);
  const libres = p.d.filter(d => (d.libres || []).length).length;
  const lineaMas = mas ? `<span>${esc(txt("bbSiFueran", mas.n, usd(mas.pp)))}</span>` : "";
  const lineaLibres = libres ? `<span class="ab-suave">${esc(txt("bbLibres", libres))}</span>` : "";
  if (una) {
    const elegida = barra.ops.find(o => o.t.t === barra.sel.una);
    resumen.innerHTML = `
      <span class="bb-cuantas"><b>${barra.ops.length}</b> ${esc(txt("bbOpcionesUna", barra.ops.length))}</span>
      <span>${esc(txt("bbUnaPrecio", nombre(elegida.t), usd(elegida.pp), usd(elegida.pp * pg.personas)))}</span>
      ${lineaMas}
      <span class="ab-acento">${esc(sig ? txt("bbOtraOpcion", usd(sig.desde - barra.b)) : txt("bbTodasOpciones"))}</span>
      ${lineaLibres}`;
  } else {
    const k = p.d.reduce((s, d) => s + d.s.length, 0), maxK = niveles[niveles.length - 1].k;
    const sobra = Math.floor(barra.b - p.pp);
    resumen.innerHTML = `
      <span class="bb-cuantas"><b>${k}</b> ${esc(txt("bbCuantas", k, pg.dias))}</span>
      <span class="bb-puntos" aria-hidden="true">${Array.from({ length: Math.max(k, maxK) }, (_, i) => `<i${i < k ? ' class="si"' : ""}></i>`).join("")}</span>
      <span>${esc(txt("bbPaquete", usd(p.pp)))}${sobra >= BARRA_PASO ? " " + esc(txt("bbSobra", usd(sobra))) : ""}</span>
      ${lineaMas}
      <span class="ab-acento">${esc(sig ? txt("bbOtra", usd(sig.desde - barra.b), sig.k) : txt("bbTodo"))}</span>
      ${lineaLibres}`;
  }
  // Solo 1: las actividades que entran, cada una con lo que paga cada persona
  const lista = una ? `<div class="bb-act" role="group" aria-label="${esc(txt("bbElegi", barra.ops.length))}">
      <span class="bb-elegi">${esc(txt("bbElegi", barra.ops.length))}</span>
      ${barra.ops.map((o, jj) => `<button type="button" class="bb-op" data-bb="una" data-tour="${esc(o.t.t)}" aria-pressed="${o.t.t === barra.sel.una}">
        <span class="bb-letra" aria-hidden="true">${LETRAS_LAB[jj] || ""}</span>${texto(o.t)}
        <span class="bb-pp"><b>${esc(usd(o.pp))}</b><span class="ab-suave">${esc(txt("porPersonaLab"))}</span></span></button>`).join("")}
    </div>
    <h3 class="ab-h">${esc(txt("bbTuItinerario"))}</h3>` : "";
  dias.innerHTML = lista + p.d.map(d => `<section class="ab-dia" aria-label="${esc(txt("abDia", d.dn))}">
      <div class="ab-dia-top"><b>${esc(txt("abDia", d.dn))}${d.f ? ` <span class="ab-suave">${esc(fechaPropuesta(d.f))}</span>` : ""}</b>
        ${planDia(d.dn) ? `<span class="ab-plan">${esc(txt("abPlan", nombrePlan(planDia(d.dn))))}</span>` : ""}</div>
      ${(d.libres || []).length ? `<div class="bb-act" role="group" aria-label="${esc(txt("libreGratis"))}">
        <span class="ab-playa">${esc(txt("libreGratis"))}</span>
        ${d.libres.length > 1 ? `<span class="bb-elegi">${esc(txt("bbElegi", d.libres.length))}</span>` : ""}
        ${d.libres.map((l, jj) => {
          const txtLugar = `<span class="ab-act-txt"><b>${esc(l.i || "")} ${esc((enIngles() && l.ne) || l.n)}</b><span class="ab-suave">${esc((enIngles() && l.te) || l.t)}</span></span>`;
          return d.libres.length > 1 ? `<button type="button" class="bb-op" data-bb="libre" data-c="${d.dn}-libre" data-lugar="${esc(l.n)}" aria-pressed="${jj === libreElegido(d)}">
            <span class="bb-letra" aria-hidden="true">${LETRAS_LAB[jj]}</span>${txtLugar}</button>` : `<div class="ab-act">${txtLugar}</div>`;
        }).join("")}
      </div>` : ""}
      ${d.s.map((s, si) => {
        const clave = `${d.dn}-${si}`, j = elegidaBarra(clave, s);
        const titulo = [d.s.length > 1 ? txt("bbActividad", si + 1) : "", s.length > 1 ? txt("bbElegi", s.length) : ""].filter(Boolean).join(" · ");
        return `<div class="bb-act" role="group"${titulo ? ` aria-label="${esc(titulo)}"` : ""}>
          ${titulo ? `<span class="bb-elegi">${esc(titulo)}</span>` : ""}
          ${s.length > 1 ? s.map((o, jj) => `<button type="button" class="bb-op" data-bb="op" data-c="${clave}" data-tour="${esc(o.t)}" aria-pressed="${jj === j}">
              <span class="bb-letra" aria-hidden="true">${LETRAS_LAB[jj]}</span>${texto(o)}</button>`).join("")
            : `<div class="ab-act">${texto(s[0])}</div>`}
        </div>`;
      }).join("")}
    </section>`).join("");
  if (foco) dialogoPropuesta.querySelector(foco)?.focus();
}
function accionBarra(b) {
  const a = b.dataset.bb;
  if (a === "nivel") {
    barra.b = Number(b.dataset.b);
    pg.presupuesto = String(barra.b);
    dialogoPropuesta.querySelector("#bb-b").value = barra.b;
    armarBarra();
    pintarResultadoBarra();
    return;
  }
  if (a === "cuantas") { barra.cuantas = Number(b.dataset.k); pintarBarra(`[data-bb="cuantas"][data-k="${b.dataset.k}"]`); return; }
  if (a === "una") { barra.sel.una = b.dataset.tour; armarBarra(); pintarResultadoBarra(`[data-bb="una"][data-tour="${b.dataset.tour}"]`); return; }
  if (a === "op") { barra.sel[b.dataset.c] = b.dataset.tour; pintarResultadoBarra(`[data-c="${b.dataset.c}"][data-tour="${b.dataset.tour}"]`); return; }
  if (a === "libre") { barra.sel[b.dataset.c] = b.dataset.lugar; pintarResultadoBarra(`[data-c="${b.dataset.c}"][data-lugar="${CSS.escape(b.dataset.lugar)}"]`); return; }
  if (a === "ver" && barra.p) {
    // propuesta.html abre con lo que eligió en cada actividad (e), y ahí puede cambiarlo. En los días libres, el lugar
    // elegido va primero
    const e = barra.p.d.flatMap(d => d.s.map((s, si) => elegidaBarra(`${d.dn}-${si}`, s)));
    const d = barra.p.d.map(x => (x.libres ? Object.assign({}, x, { libres: [x.libres[libreElegido(x)], ...x.libres.filter((_, j) => j !== libreElegido(x))] }) : x));
    guardarPg();
    location.href = linkItinerario(Object.assign({}, barra.p, { d }, e.some(Boolean) ? { e } : {}));
    return;
  }
  if (a === "volver") { enBarra = false; guardarPg(); dialogoPropuesta.classList.remove("ancho"); pintarPropuestaGratis(); dialogoPropuesta.querySelector("#pg-barra")?.focus(); }
}

function pasoPropuesta(clave, etiqueta) {
  return `
    <div class="pg-campo">
      <span class="pg-etiqueta" id="pg-${clave}-l">${esc(etiqueta)}</span>
      <div class="pg-paso" role="group" aria-labelledby="pg-${clave}-l">
        <button type="button" data-paso="${clave}" data-d="-1" aria-label="${esc(txt("pgMenos", etiqueta))}">−</button>
        <output id="pg-${clave}" aria-live="polite">${pg[clave]}</output>
        <button type="button" data-paso="${clave}" data-d="1" aria-label="${esc(txt("pgMas", etiqueta))}">+</button>
      </div>
    </div>`;
}

// El plan de cada día: lo que recomiende el laboratorio, una categoría del mapa o un día libre
function opcionesPlan() {
  return [["", txt("planCualquiera")], ...Object.entries(CATEGORIAS).map(([k, cat]) => [k, `${cat.emoji} ${rotulo(cat)}`]), ["libre", txt("planLibre")]];
}
function diaCorto(d) {
  if (!pg.desde) return txt("abDia", d);
  const [a, m, dd] = sumarDias(pg.desde, d - 1).split("-").map(Number);
  return `${txt("abDia", d)} · ${new Date(a, m - 1, dd).toLocaleDateString(enIngles() ? "en-US" : "es-CR", { weekday: "short", day: "numeric", month: "numeric" })}`;
}
const htmlPlanes = () => Array.from({ length: pg.dias }, (_, i) => i + 1).map(d => `
  <label class="pg-plan"><span>${esc(diaCorto(d))}</span>
    <select data-plan="${d}" aria-label="${esc(txt("pgPlanDe", d))}">${opcionesPlan().map(([k, l]) => `<option value="${esc(k)}"${planDia(d) === k ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`).join("");
const nombrePlan = (p) => (opcionesPlan().find(([k]) => k === p) || ["", ""])[1];
// Al cambiar los días o la fecha, los planes se vuelven a dibujar (un renglón por día)
const refrescarPlanes = () => {
  const f = dialogoPropuesta.querySelector("#pg-planes");
  if (f) f.innerHTML = `<legend class="pg-etiqueta">${esc(txt("pgPlanes"))}</legend>${htmlPlanes()}`;
};

export function pintarPropuestaGratis() {
  const hoy = new Date();
  const minimo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  dialogoPropuesta.innerHTML = `
    <form method="dialog" class="pg">
      <button type="submit" class="pg-cerrar" aria-label="${esc(txt("cerrar"))}">✕</button>
      <h2 id="pg-titulo">${esc(txt("pgTitulo"))}</h2>
      ${enDemo ? `<p class="pg-demo">${esc(txt("pgDemo"))}</p>` : ""}
      <p class="pg-intro">${esc(txt("pgIntro"))}</p>
      <div class="pg-fila">
        ${pasoPropuesta("personas", txt("pgPersonas"))}
        ${pasoPropuesta("dias", txt("pgDias"))}
      </div>
      <fieldset class="pg-planes" id="pg-planes">
        <legend class="pg-etiqueta">${esc(txt("pgPlanes"))}</legend>
        ${htmlPlanes()}
      </fieldset>
      <div class="pg-fila">
        <label class="pg-campo"><span class="pg-etiqueta">${esc(txt("pgPresupuesto"))}</span>
          <input id="pg-presupuesto" type="number" min="0" step="10" inputmode="numeric" placeholder="150" value="${esc(pg.presupuesto)}"></label>
        <label class="pg-campo"><span class="pg-etiqueta">${esc(txt("pgDesde"))}</span>
          <input id="pg-desde" type="date" min="${minimo}" value="${esc(pg.desde)}"></label>
      </div>
      <fieldset class="pg-gustos">
        <legend class="pg-etiqueta">${esc(txt("pgGustos"))}</legend>
        ${Object.entries(CATEGORIAS).map(([k, cat]) => `
          <label class="pg-chip"><input type="checkbox" value="${esc(k)}" ${pg.gustos.has(k) ? "checked" : ""}><span>${esc(cat.emoji)} ${esc(rotulo(cat))}</span></label>`).join("")}
      </fieldset>
      ${transportesLab().length ? `<div class="pg-fila">
        <label class="pg-campo"><span class="pg-etiqueta">${esc(txt("pgTransporte"))}</span>
          <select id="pg-transporte"><option value="">${esc(txt("pgSinTransporte"))}</option>${transportesLab().map(t => `<option value="${esc(t.t)}"${pg.transporte && pg.transporte.t === t.t ? " selected" : ""}>${esc((enIngles() && t.en) || t.es)}</option>`).join("")}</select></label>
        ${transporteLab() && transporteLab().t.tipo === "traslado" ? `<label class="pg-check"><input type="checkbox" id="pg-vuelta"${pg.transporte.vuelta ? " checked" : ""}> ${esc(txt("pgVuelta"))}</label>`
          : transporteLab() ? `<span class="pg-check">${esc(textoTransporteLab(transporteLab()))}</span>` : ""}
      </div>` : ""}
      <label class="pg-campo"><span class="pg-etiqueta">${esc(txt("pgNota"))}</span>
        <textarea id="pg-nota" rows="2" placeholder="${esc(txt("pgNotaPista"))}">${esc(pg.nota)}</textarea></label>
      <p class="pg-aviso" id="pg-aviso" role="status" hidden></p>
      <button type="button" class="reservar pg-armar" id="pg-armar">${esc(txt("pgArmar"))}</button>
      ${(catalogoLab().tours || []).length ? `<button type="button" class="pg-armar pg-armar-yo" id="pg-barra">${esc(txt("pgBarra"))}</button>` : ""}
      <button type="button" class="pg-armar pg-armar-yo" id="pg-armar-yo">${esc(txt("pgArmarYo"))}</button>
      ${(catalogoLab().tours || []).length ? `<button type="button" class="pg-armar pg-armar-yo" id="pg-probar">${esc(txt("pgProbar"))}</button>` : ""}
      <a class="pg-secundario" id="pg-enviar" href="${esc(urlPropuestaGratis())}" target="_blank" rel="noopener">${esc(txt("pgEnviar"))}</a>
      <p class="pg-letra">${esc(txt("pgLetraChica"))}</p>
    </form>`;
}

const actualizarEnvioPropuesta = () => {
  dialogoPropuesta.querySelector("#pg-enviar").href = urlPropuestaGratis();
  dialogoPropuesta.querySelector("#pg-aviso").hidden = true;
};
const guardarPg = () => {
  try { sessionStorage.setItem("hey-lab", JSON.stringify({ ...pg, gustos: [...pg.gustos], armado: ab.mios })); } catch { /* sin almacenamiento */ }
};
function abrirLaboratorio() {
  try {
    const g = JSON.parse(sessionStorage.getItem("hey-lab") || "null");
    if (g) { ab.mios = g.armado || []; delete g.armado; Object.assign(pg, g, { gustos: new Set(g.gustos || []) }); }
  } catch { /* sin almacenamiento: arranca de cero */ }
  enArmado = false;
  enPrecios = false;
  enBarra = false;
  dialogoPropuesta.classList.remove("ancho");
  pintarPropuestaGratis();
  dialogoPropuesta.showModal();
  prepararMareasRutas();
}
dialogoPropuesta.addEventListener("click", (e) => {
  if (e.target === dialogoPropuesta) { dialogoPropuesta.close(); return; } // tocar afuera la cierra
  const ba = e.target.closest("[data-ab]");
  if (ba) { accionArmado(ba); return; }
  const bs = e.target.closest("[data-sim]");
  if (bs) { accionPrecios(bs); return; }
  const bb = e.target.closest("[data-bb]");
  if (bb) { accionBarra(bb); return; }
  if (e.target.closest("#pg-barra")) { enBarra = true; barra.b = presupuestoPg(); guardarPg(); pintarBarra("#pg-titulo"); dialogoPropuesta.scrollTop = 0; return; }
  if (e.target.closest("#pg-probar")) { enPrecios = true; simu.n = pg.personas; pintarPrecios("#pg-titulo"); dialogoPropuesta.scrollTop = 0; return; }
  if (e.target.closest("#pg-armar-yo")) {
    const aviso = dialogoPropuesta.querySelector("#pg-aviso");
    if (!presupuestoPg()) { aviso.textContent = txt("pgSinPresupuesto"); aviso.hidden = false; dialogoPropuesta.querySelector("#pg-presupuesto").focus(); return; }
    if (!(catalogoLab().tours || []).length) { aviso.textContent = txt("pgSinTours"); aviso.hidden = false; return; }
    enArmado = true;
    guardarPg();
    pintarArmado("#pg-titulo");
    dialogoPropuesta.scrollTop = 0;
    return;
  }
  if (e.target.closest("#pg-armar")) {
    const aviso = dialogoPropuesta.querySelector("#pg-aviso");
    if (!presupuestoPg()) { aviso.textContent = txt("pgSinPresupuesto"); aviso.hidden = false; dialogoPropuesta.querySelector("#pg-presupuesto").focus(); return; }
    const p = armarItinerario();
    const tr = transporteLab();
    const todoLibre = Array.from({ length: pg.dias }, (_, i) => i + 1).every(d => planDia(d) === "libre");
    if (!p) { aviso.textContent = todoLibre ? txt("pgTodoLibre") : tr && tr.pp >= presupuestoPg() ? txt("pgTransporteCaro") : txt((catalogoLab().tours || []).length ? "pgNoEntra" : "pgSinTours", pg.personas, `$${presupuestoPg()}`); aviso.hidden = false; return; }
    guardarPg();
    location.href = linkItinerario(p);
    return;
  }
  const b = e.target.closest("[data-paso]");
  if (!b) return;
  const clave = b.dataset.paso, [min, max] = PG_LIMITES[clave];
  pg[clave] = Math.min(max, Math.max(min, pg[clave] + Number(b.dataset.d)));
  // En la barra del budget, otro grupo u otros días cambian desde cuánto entra cada actividad
  if (enBarra) { guardarPg(); pintarBarra(`[data-paso="${clave}"][data-d="${b.dataset.d}"]`); return; }
  dialogoPropuesta.querySelector(`#pg-${clave}`).textContent = pg[clave];
  if (clave === "dias") refrescarPlanes();
  actualizarEnvioPropuesta();
});
dialogoPropuesta.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "bb-b") { barra.b = Number(t.value); pg.presupuesto = t.value; armarBarra(); pintarResultadoBarra(); return; }
  if (t.id === "pg-presupuesto") pg.presupuesto = t.value;
  else if (t.id === "pp-tour") { simu.t = t.value; pintarPrecios("#pp-tour"); return; }
  else if (t.id === "pg-desde") { pg.desde = t.value; refrescarPlanes(); }
  else if (t.id === "pg-nota") pg.nota = t.value;
  else if (t.id === "pg-transporte") {
    // Los traslados arrancan en ida y vuelta; la casilla aparece o se va según lo elegido
    pg.transporte = t.value ? { t: t.value, vuelta: true } : null;
    pintarPropuestaGratis();
    dialogoPropuesta.querySelector("#pg-transporte")?.focus();
    return;
  }
  else if (t.id === "pg-vuelta") { if (pg.transporte) pg.transporte.vuelta = t.checked; }
  else if (t.dataset.plan) { pg.planes = Object.assign({}, pg.planes, { [t.dataset.plan]: t.value }); }
  else if (t.type === "checkbox") { if (t.checked) pg.gustos.add(t.value); else pg.gustos.delete(t.value); }
  actualizarEnvioPropuesta();
});
document.getElementById("btn-propuesta").addEventListener("click", abrirLaboratorio);
// "Volver al laboratorio" desde un itinerario: la página abre con #laboratorio y lo que había puesto
if (location.hash === "#laboratorio") {
  history.replaceState(null, "", location.pathname + location.search);
  abrirLaboratorio();
}
