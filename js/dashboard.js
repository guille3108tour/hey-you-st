/* =========================================================
   Hey You ST · Panel del agente
   =========================================================
   Herramienta de Juan, en el navegador, sin servidor. Hace tres cosas:
     1. Guarda tus tours con precios (neto del proveedor y precio al cliente) y sus
        caracteristicas (surf, food, sunset...). Muestra el margen por tour.
     2. Toma el perfil del turista -estadia, con quien viaja, cuantos, que le gusta- y
        arma la propuesta dia por dia, con el calendario ordenado y el margen del paquete.
        Segun los intereses, marca que tours le calzan.
     3. Genera el link de propuesta e itinerario, con el MISMO formato base64url que leen
        propuesta.html e itinerario.html, listo para WhatsApp.
   Todo se guarda en localStorage de ese navegador. Nada viaja a un servidor. */

"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const usd = (n) => "$" + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
const numero = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

// --- fechas (local, sin zonas horarias raras) ---
const dosDig = (n) => String(n).padStart(2, "0");
const isoDe = (d) => `${d.getFullYear()}-${dosDig(d.getMonth() + 1)}-${dosDig(d.getDate())}`;
const hoyISO = () => isoDe(new Date());
const parseISO = (s) => { const p = String(s).split("-").map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1); };
const sumarDias = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoDe(d); };
const diffDias = (a, z) => Math.round((parseISO(z) - parseISO(a)) / 86400000);
const validISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechaCorta(iso) { if (!validISO(iso)) return ""; const d = parseISO(iso); return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`; }

// --- perfil: con quien viaja y que le gusta (sirven para elegir tours; no viajan en el link) ---
const SEGMENTOS = [
  { k: "solo", t: "Solo" }, { k: "pareja", t: "Pareja" }, { k: "familia", t: "Familia" }, { k: "amigos", t: "Amigos" },
];
const INTERESES = [
  { k: "relax", t: "Relajación" }, { k: "tours", t: "Tours" }, { k: "extremo", t: "Extremo" }, { k: "surf", t: "Surf" },
  { k: "caminata", t: "Caminatas chill" }, { k: "sunset", t: "Sunset" }, { k: "food", t: "Food" },
];
const etiquetaInteres = (k) => (INTERESES.find(i => i.k === k) || {}).t || k;

// --- base64url: mismo ida y vuelta que js/propuesta.js ---
function b64url(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = "";
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const urlDe = (pagina, hash) => new URL(pagina, location.href).href + "#p=" + hash;

// --- almacenamiento ---
const LS_CAT = "hey-dash-catalogo";
const LS_PROP = "hey-dash-propuesta";
function leerLS(clave) { try { return JSON.parse(localStorage.getItem(clave) || "null"); } catch { return null; } }
function guardarLS(clave, v) { try { localStorage.setItem(clave, JSON.stringify(v)); } catch { /* modo privado */ } }

// Etiquetas de ejemplo para sembrar los tours del mapa; el agente las ajusta a gusto
const TAGS_SEMILLA = { "surf-hermosa": ["surf"], "isla-tortuga": ["tours", "food", "relax"], "pesca-cabuya": ["tours", "food"] };
function sembrarCatalogo() {
  if (typeof TOURS === "undefined") return [];
  return TOURS.map(t => ({
    id: t.id,
    es: t.titulo || "", en: (t.en && t.en.titulo) || "",
    du: t.duracion || "", due: (t.en && t.en.duracion) || "",
    sa: t.salida || "",
    inc: Array.isArray(t.incluye) ? t.incluye.join(" · ") : "",
    ince: t.en && Array.isArray(t.en.incluye) ? t.en.incluye.join(" · ") : "",
    tags: TAGS_SEMILLA[t.id] ? [...TAGS_SEMILLA[t.id]] : [],
    neto: null, cliente: null,
  }));
}

let catalogo = leerLS(LS_CAT) || sembrarCatalogo();
const nuevoDia = () => ({ libre: false, hora: "", ok: false, tours: [], libreNombre: "", libreTip: "" });
let prop = leerLS(LS_PROP) || {
  n: 2, pp: 150, inicio: hoyISO(), salida: "", segmento: "", intereses: [], i: "en", iva: true, ej: false, tel: "",
  dias: [nuevoDia(), nuevoDia(), nuevoDia()],
};
if (!Array.isArray(prop.intereses)) prop.intereses = [];
function nuevoCodigo() { const d = new Date(); const r = Math.random().toString(36).slice(2, 6); return `${dosDig(d.getMonth() + 1)}${dosDig(d.getDate())}-${r}`; }
if (!prop.cod) prop.cod = nuevoCodigo();
const guardarCat = () => guardarLS(LS_CAT, catalogo);
const guardarProp = () => guardarLS(LS_PROP, prop);
const tourPorId = (id) => catalogo.find(t => t.id === id);
// Tours cuyas caracteristicas coinciden con lo que le gusta al turista
const calza = (t) => prop.intereses.length && (t.tags || []).some(x => prop.intereses.includes(x));

/* =========================================================
   PESTAÑAS
   ========================================================= */
$$("#tabs button").forEach(b => b.addEventListener("click", () => {
  const t = b.dataset.tab;
  $$("#tabs button").forEach(x => { const on = x === b; x.classList.toggle("activo", on); x.setAttribute("aria-selected", String(on)); });
  $("#tab-propuesta").hidden = t !== "propuesta";
  $("#tab-catalogo").hidden = t !== "catalogo";
  if (t === "catalogo") pintarCatalogo();
}));

/* =========================================================
   CATÁLOGO: tus tours, precios y características
   ========================================================= */
let editandoId = null;
let formTags = [];   // las características que se están marcando en el formulario

function chipsTags(sel, marcadas, onToggle) {
  const cont = $(sel);
  cont.innerHTML = INTERESES.map(i => `
    <button type="button" class="op-chip ${marcadas.includes(i.k) ? "sel" : ""}" data-tag="${i.k}">${esc(i.t)}</button>`).join("");
  $$("[data-tag]", cont).forEach(b => b.addEventListener("click", () => onToggle(b.dataset.tag)));
}

function pintarFormTags() {
  chipsTags("#cat-tags", formTags, (k) => {
    formTags = formTags.includes(k) ? formTags.filter(x => x !== k) : [...formTags, k];
    pintarFormTags();
  });
}

function pintarCatalogo() {
  const tabla = $("#cat-tabla");
  if (!catalogo.length) {
    tabla.innerHTML = `<tr><td class="vacio">Todavía no hay tours. Agregá uno arriba o recargá desde el mapa.</td></tr>`;
    return;
  }
  tabla.innerHTML = `
    <thead><tr>
      <th>Tour</th><th>Características</th><th class="num">Neto</th><th class="num">Cliente</th><th class="num">Margen</th><th></th>
    </tr></thead>
    <tbody>
      ${catalogo.map(t => {
        const hay = t.neto != null && t.cliente != null;
        const m = hay ? t.cliente - t.neto : null;
        const pct = hay && t.cliente ? Math.round((m / t.cliente) * 100) : null;
        return `<tr>
          <td><b>${esc(t.es || t.en || "(sin nombre)")}</b>${t.sa ? `<br><span class="margen-no">${esc(t.sa)}</span>` : ""}</td>
          <td>${(t.tags || []).length ? (t.tags || []).map(k => `<span class="tag-mini">${esc(etiquetaInteres(k))}</span>`).join(" ") : "<span class='margen-no'>—</span>"}</td>
          <td class="num">${t.neto != null ? usd(t.neto) : "—"}</td>
          <td class="num">${t.cliente != null ? usd(t.cliente) : "—"}</td>
          <td class="num ${hay ? "margen-ok" : "margen-no"}">${hay ? `${usd(m)}${pct != null ? ` · ${pct}%` : ""}` : "—"}</td>
          <td class="acc-td">
            <button type="button" class="mini editar" data-ed="${esc(t.id)}">Editar</button>
            <button type="button" class="mini borrar" data-del="${esc(t.id)}">Borrar</button>
          </td>
        </tr>`;
      }).join("")}
    </tbody>`;
  $$("#cat-tabla [data-ed]").forEach(b => b.addEventListener("click", () => cargarEnFormulario(b.dataset.ed)));
  $$("#cat-tabla [data-del]").forEach(b => b.addEventListener("click", () => borrarTour(b.dataset.del)));
}

function cargarEnFormulario(id) {
  const t = tourPorId(id);
  if (!t) return;
  editandoId = id;
  $("#c-es").value = t.es || ""; $("#c-en").value = t.en || "";
  $("#c-du").value = t.du || ""; $("#c-sa").value = t.sa || "";
  $("#c-inc").value = t.inc || ""; $("#c-ince").value = t.ince || "";
  $("#c-neto").value = t.neto ?? ""; $("#c-cliente").value = t.cliente ?? "";
  formTags = [...(t.tags || [])]; pintarFormTags();
  $("#cat-titulo").textContent = "Editar tour";
  $("#cat-cancelar").hidden = false;
  $("#c-es").focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limpiarFormulario() {
  editandoId = null;
  ["c-es", "c-en", "c-du", "c-sa", "c-inc", "c-ince", "c-neto", "c-cliente"].forEach(id => { $("#" + id).value = ""; });
  formTags = []; pintarFormTags();
  $("#cat-titulo").textContent = "Agregar tour";
  $("#cat-cancelar").hidden = true;
}

$("#cat-guardar").addEventListener("click", () => {
  const es = $("#c-es").value.trim(), en = $("#c-en").value.trim();
  if (!es && !en) { $("#c-es").focus(); return; }
  const datos = {
    es, en,
    du: $("#c-du").value.trim(), due: "",
    sa: $("#c-sa").value.trim(),
    inc: $("#c-inc").value.trim(), ince: $("#c-ince").value.trim(),
    tags: [...formTags],
    neto: numero($("#c-neto").value), cliente: numero($("#c-cliente").value),
  };
  if (editandoId) {
    Object.assign(tourPorId(editandoId), datos);
  } else {
    const base = (es || en).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24) || "tour";
    let id = base, k = 2;
    while (tourPorId(id)) id = `${base}-${k++}`;
    catalogo.push({ id, ...datos });
  }
  guardarCat();
  limpiarFormulario();
  pintarCatalogo();
  pintarDias();
  pintarPreview();
});

$("#cat-cancelar").addEventListener("click", limpiarFormulario);

$("#cat-reseed").addEventListener("click", () => {
  if (!confirm("Esto reemplaza tu catálogo con los tours de data/tours.js (perdés precios y características que hayas puesto). ¿Seguir?")) return;
  catalogo = sembrarCatalogo();
  guardarCat();
  limpiarFormulario();
  pintarCatalogo();
  pintarDias();
  pintarPreview();
});

function borrarTour(id) {
  const t = tourPorId(id);
  if (!t) return;
  if (!confirm(`¿Borrar "${t.es || t.en}"?`)) return;
  catalogo = catalogo.filter(x => x.id !== id);
  prop.dias.forEach(d => { d.tours = d.tours.filter(x => x !== id); });
  guardarCat(); guardarProp();
  pintarCatalogo(); pintarDias(); pintarPreview();
}

/* =========================================================
   PERFIL DEL TURISTA: con quién viaja y qué le gusta
   ========================================================= */
function pintarPerfil() {
  const seg = $("#perfil-segmento");
  seg.innerHTML = SEGMENTOS.map(s => `<button type="button" class="op-chip ${prop.segmento === s.k ? "sel" : ""}" data-seg="${s.k}">${esc(s.t)}</button>`).join("");
  $$("[data-seg]", seg).forEach(b => b.addEventListener("click", () => {
    prop.segmento = prop.segmento === b.dataset.seg ? "" : b.dataset.seg;
    guardarProp(); pintarPerfil();
  }));

  chipsTags("#perfil-intereses", prop.intereses, (k) => {
    prop.intereses = prop.intereses.includes(k) ? prop.intereses.filter(x => x !== k) : [...prop.intereses, k];
    guardarProp(); pintarPerfil(); pintarDias();   // los días resaltan los que calzan
  });

  const sug = catalogo.filter(calza);
  $("#perfil-sugerencias").innerHTML = prop.intereses.length
    ? (sug.length
        ? `Le calzan: ${sug.map(t => `<b>${esc(t.es || t.en)}</b>`).join(" · ")}`
        : "Ningún tour del catálogo calza con esos intereses todavía — etiquetalos en \"Tours y precios\".")
    : "Marcá los intereses y te digo qué tours le calzan.";
}

/* =========================================================
   PROPUESTA: datos del viaje
   ========================================================= */
function bindCampo(sel, clave, tipo) {
  const el = $(sel);
  const asignar = () => {
    if (tipo === "num") prop[clave] = numero(el.value);
    else if (tipo === "bool") prop[clave] = el.checked;
    else prop[clave] = el.value;
    if (clave === "inicio" || clave === "salida") { ajustarDiasAEstadia(); pintarDias(); }
    guardarProp(); pintarPreview();
  };
  el.addEventListener("input", asignar);
  el.addEventListener("change", asignar);
}
function cargarCampos() {
  $("#p-personas").value = prop.n ?? "";
  $("#p-pp").value = prop.pp ?? "";
  $("#p-inicio").value = validISO(prop.inicio) ? prop.inicio : hoyISO();
  $("#p-salida").value = validISO(prop.salida) ? prop.salida : "";
  $("#p-idioma").value = prop.i || "en";
  $("#p-tel").value = prop.tel || "";
  $("#p-iva").checked = !!prop.iva;
  $("#p-ejemplo").checked = !!prop.ej;
}
bindCampo("#p-personas", "n", "num");
bindCampo("#p-pp", "pp", "num");
bindCampo("#p-inicio", "inicio", "txt");
bindCampo("#p-salida", "salida", "txt");
bindCampo("#p-idioma", "i", "txt");
bindCampo("#p-tel", "tel", "txt");
bindCampo("#p-iva", "iva", "bool");
bindCampo("#p-ejemplo", "ej", "bool");

$("#add-dia").addEventListener("click", () => { prop.dias.push(nuevoDia()); guardarProp(); pintarDias(); pintarPreview(); });

// La estadía (llegada → salida) define cuántos días tiene el viaje; preserva lo ya armado
function ajustarDiasAEstadia() {
  if (!validISO(prop.inicio) || !validISO(prop.salida)) return;
  let dur = diffDias(prop.inicio, prop.salida) + 1;
  if (dur < 1) return;               // la salida es antes de la llegada: se avisa aparte
  dur = Math.min(dur, 30);
  while (prop.dias.length < dur) prop.dias.push(nuevoDia());
  if (prop.dias.length > dur) prop.dias.length = dur;
}
function textoEstadia() {
  if (!validISO(prop.inicio)) return "";
  if (!validISO(prop.salida)) return `Llegada: ${fechaCorta(prop.inicio)}. Agregá la salida para armar los días solos.`;
  const dur = diffDias(prop.inicio, prop.salida) + 1;
  if (dur < 1) return "⚠️ La salida es antes de la llegada.";
  return `Estadía: ${dur} ${dur === 1 ? "día" : "días"} · ${fechaCorta(prop.inicio)} → ${fechaCorta(prop.salida)}`;
}

// --- días: tarjeta por día, con chips de tours o campos de día libre ---
function pintarDias() {
  const info = $("#estadia-info");
  if (info) info.textContent = textoEstadia();
  const cont = $("#dias");
  const inicio = validISO(prop.inicio) ? prop.inicio : hoyISO();
  cont.innerHTML = prop.dias.map((d, i) => {
    const fecha = sumarDias(inicio, i);
    const chips = catalogo.length
      ? catalogo.map(t => `
          <label class="op-chip ${d.tours.includes(t.id) ? "sel" : ""} ${calza(t) ? "match" : ""}">
            <input type="checkbox" data-dia="${i}" value="${esc(t.id)}" ${d.tours.includes(t.id) ? "checked" : ""} ${d.libre ? "disabled" : ""}>
            ${calza(t) ? "★ " : ""}${esc(t.es || t.en)}
          </label>`).join("")
      : `<span class="margen-no">No hay tours en el catálogo. Agregalos en "Tours y precios".</span>`;
    return `
      <div class="dia">
        <div class="dia-cab">
          <b>Día ${i + 1}</b>
          <span class="dia-fecha">${esc(fechaCorta(fecha))}</span>
          ${prop.dias.length > 1 ? `<button type="button" class="dia-quitar" data-quitar="${i}" aria-label="Quitar día">✕</button>` : ""}
        </div>
        ${d.libre
          ? `<div class="dia-libre-campos">
               <label class="campo"><span>Lugar libre (ej: Playa Santa Teresa)</span><input type="text" data-libre-n="${i}" value="${esc(d.libreNombre)}"></label>
               <label class="campo"><span>Consejo del local (opcional)</span><input type="text" data-libre-t="${i}" value="${esc(d.libreTip)}"></label>
             </div>`
          : `<div class="dia-ops">${chips}</div>`}
        <div class="dia-extra">
          <label><input type="checkbox" data-libre="${i}" ${d.libre ? "checked" : ""}> Día libre (sin tour)</label>
          ${!d.libre ? `<label>Hora <input type="time" data-hora="${i}" value="${esc(d.hora)}"></label>` : ""}
          ${!d.libre ? `<label><input type="checkbox" data-ok="${i}" ${d.ok ? "checked" : ""}> Cupo confirmado</label>` : ""}
        </div>
      </div>`;
  }).join("");

  $$("#dias [data-quitar]").forEach(b => b.addEventListener("click", () => {
    prop.dias.splice(Number(b.dataset.quitar), 1); guardarProp(); pintarDias(); pintarPreview();
  }));
  $$("#dias [data-dia]").forEach(c => c.addEventListener("change", () => {
    const d = prop.dias[Number(c.dataset.dia)];
    if (c.checked) { if (!d.tours.includes(c.value)) d.tours.push(c.value); }
    else d.tours = d.tours.filter(x => x !== c.value);
    guardarProp(); pintarDias(); pintarPreview();
  }));
  $$("#dias [data-libre]").forEach(c => c.addEventListener("change", () => {
    prop.dias[Number(c.dataset.libre)].libre = c.checked; guardarProp(); pintarDias(); pintarPreview();
  }));
  $$("#dias [data-hora]").forEach(i => i.addEventListener("input", () => { prop.dias[Number(i.dataset.hora)].hora = i.value; guardarProp(); }));
  $$("#dias [data-ok]").forEach(c => c.addEventListener("change", () => { prop.dias[Number(c.dataset.ok)].ok = c.checked; guardarProp(); pintarPreview(); }));
  $$("#dias [data-libre-n]").forEach(i => i.addEventListener("input", () => { prop.dias[Number(i.dataset.libreN)].libreNombre = i.value; guardarProp(); pintarPreview(); }));
  $$("#dias [data-libre-t]").forEach(i => i.addEventListener("input", () => { prop.dias[Number(i.dataset.libreT)].libreTip = i.value; guardarProp(); }));
}

/* =========================================================
   VISTA PREVIA: calendario ordenado + margen
   ========================================================= */
const nombreTour = (t) => (prop.i === "en" && t.en) || t.es || t.en || "(sin nombre)";

function pintarPreview() {
  const inicio = validISO(prop.inicio) ? prop.inicio : hoyISO();
  const n = prop.n || 0, pp = prop.pp || 0;
  let costo = 0, faltaPrecio = false;
  const cal = prop.dias.map((d, i) => {
    const fecha = sumarDias(inicio, i);
    if (d.libre) return { fecha, libre: true, txt: d.libreNombre || "Día libre" };
    const ts = d.tours.map(tourPorId).filter(Boolean);
    if (ts.length) {
      const netos = ts.map(t => t.neto);
      if (netos.some(x => x == null)) faltaPrecio = true;
      costo += Math.max(0, ...netos.map(x => x || 0));
    }
    return { fecha, libre: false, txt: ts.length ? ts.map(nombreTour).join("  /  ") : "—", vacio: !ts.length };
  });

  const margenPP = pp - costo;
  const malo = margenPP < 0;
  const seg = (SEGMENTOS.find(s => s.k === prop.segmento) || {}).t;
  const ctx = [seg, prop.intereses.map(etiquetaInteres).join(", ")].filter(Boolean).join(" · ");
  $("#preview").innerHTML = `
    <h2>Calendario · ${esc(prop.cod)}</h2>
    ${ctx ? `<p class="nota-precio" style="margin:-.3rem 0 .6rem">${esc(ctx)}</p>` : ""}
    ${cal.map((c, i) => `
      <div class="cal-dia ${c.libre ? "cal-libre" : ""}">
        <span class="cal-n">${c.libre ? "🏖️" : i + 1}</span>
        <span class="cal-txt">
          <span class="f">${esc(fechaCorta(c.fecha))}</span>
          <span class="o">${c.vacio ? "<span class='sep'>elegí un tour o marcá día libre</span>" : esc(c.txt)}</span>
        </span>
      </div>`).join("")}
    <div class="resumen">
      <div class="linea"><span>Personas</span><b>${n}</b></div>
      <div class="linea"><span>Precio por persona</span><b>${usd(pp)}</b></div>
      <div class="linea"><span>Costo por persona (peor caso)</span><b>${faltaPrecio ? "falta neto" : usd(costo)}</b></div>
      <div class="linea fuerte ${malo ? "margen-bad" : ""}"><span>Tu margen por persona</span><b>${faltaPrecio ? "—" : usd(margenPP)}</b></div>
      <div class="linea"><span>Tu margen total (${n})</span><b>${faltaPrecio ? "—" : usd(margenPP * n)}</b></div>
    </div>
    ${faltaPrecio ? `<p class="nota-precio">Poné el neto de cada tour en "Tours y precios" para ver tu ganancia.</p>`
      : malo ? `<p class="nota-precio">El precio por persona no cubre el costo del día más caro: subí el precio o cambiá los tours.</p>`
      : `<p class="nota-precio">Margen calculado sobre la combinación más cara que puede elegir el turista.</p>`}`;
}

/* =========================================================
   GENERAR LOS LINKS (mismo formato que propuesta.js / itinerario.js)
   ========================================================= */
const opcionDeTour = (t) => {
  const o = { es: t.es || t.en, en: t.en || t.es };
  if (t.du) o.du = t.du;
  if (t.sa) o.sa = t.sa;
  if (t.inc) o.inc = t.inc;
  if (t.ince) o.ince = t.ince;
  return o;
};

function armarPropuesta() {
  const inicio = validISO(prop.inicio) ? prop.inicio : hoyISO();
  const d = [];
  for (let i = 0; i < prop.dias.length; i++) {
    const dia = prop.dias[i];
    const f = sumarDias(inicio, i);
    if (dia.libre) {
      const n = (dia.libreNombre || "").trim() || "Día de playa";
      d.push({ f, s: [], libres: [{ n, ne: n, t: dia.libreTip || "", te: dia.libreTip || "", i: "🏖️" }] });
    } else {
      const ts = dia.tours.map(tourPorId).filter(Boolean);
      if (!ts.length) return { error: `El día ${i + 1} no tiene tours ni está marcado como día libre.` };
      d.push({ f, s: [ts.map(opcionDeTour)] });
    }
  }
  const P = {
    v: 1, c: "HYP-" + prop.cod, n: prop.n || 1, pp: prop.pp || 0, b: prop.pp || 0,
    i: prop.i || "en", iva: prop.iva ? 1 : 0, d,
  };
  if (prop.ej) P.ej = 1;
  return { P };
}

function armarItinerario() {
  const inicio = validISO(prop.inicio) ? prop.inicio : hoyISO();
  const a = [];
  for (let i = 0; i < prop.dias.length; i++) {
    const dia = prop.dias[i];
    if (dia.libre) continue;
    const t = dia.tours.map(tourPorId).filter(Boolean)[0];
    if (!t) continue;
    const it = { f: sumarDias(inicio, i), es: t.es || t.en, en: t.en || t.es, cod: "HY-" + prop.cod, ok: dia.ok ? 1 : 0 };
    if (dia.hora) it.h = dia.hora;
    if (t.du) it.du = t.du;
    if (t.sa) it.sa = t.sa;
    if (t.inc) it.inc = t.inc;
    if (t.ince) it.ince = t.ince;
    a.push(it);
  }
  if (!a.length) return { error: "No hay ningún día con tour para el itinerario (marcá al menos uno)." };
  const P = { v: 1, c: "HYC-" + prop.cod, n: prop.n || 1, i: prop.i || "en", a };
  if (prop.ej) P.ej = 1;
  return { P };
}

function pintarSalida(tipo, pagina, res) {
  const caja = $("#salida");
  caja.hidden = false;
  if (res.error) { caja.innerHTML = `<div class="aviso-dash">${esc(res.error)}</div>`; return; }
  const link = urlDe(pagina, b64url(res.P));
  const etiqueta = tipo === "propuesta" ? "la propuesta" : "el itinerario";
  const msg = (prop.i === "en"
    ? `Hi 👋 Here is your Hey You ST trip plan: ${link}`
    : `Hola 👋 Acá está tu propuesta de Hey You ST: ${link}`);
  const wa = prop.tel ? `https://wa.me/${prop.tel.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}` : "";
  caja.innerHTML = `
    <div class="link" id="salida-link">${esc(link)}</div>
    <div class="acc">
      <button type="button" class="btn" id="copiar-link">Copiar link</button>
      <button type="button" class="btn-sec" id="copiar-msg">Copiar mensaje</button>
      <a class="btn-sec" href="${esc(link)}" target="_blank" rel="noopener">Abrir ${esc(etiqueta)}</a>
      ${wa ? `<a class="btn-sec" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp al turista</a>` : ""}
    </div>
    <span class="ok" id="salida-ok" hidden>¡Copiado!</span>`;
  const avisar = () => { const o = $("#salida-ok"); if (o) { o.hidden = false; setTimeout(() => { o.hidden = true; }, 1600); } };
  const copiar = (texto) => {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(avisar).catch(() => seleccionar(avisar));
    else seleccionar(avisar);
  };
  $("#copiar-link").addEventListener("click", () => copiar(link));
  $("#copiar-msg").addEventListener("click", () => copiar(msg));
}
function seleccionar(cb) {
  const el = $("#salida-link");
  if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  try { document.execCommand("copy"); } catch { /* el agente copia a mano */ }
  cb && cb();
}

$$("[data-gen]").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.gen === "propuesta") pintarSalida("propuesta", "propuesta.html", armarPropuesta());
  else pintarSalida("itinerario", "itinerario.html", armarItinerario());
}));

/* =========================================================
   ARRANQUE
   ========================================================= */
cargarCampos();
pintarPerfil();
pintarFormTags();
pintarDias();
pintarPreview();
