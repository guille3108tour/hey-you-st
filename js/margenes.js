/* =========================================================
   Hey You ST · Dashboard de márgenes (panel interno)
   ========================================================= */

// Para cada tour público (data/tours.js → TOURS) Juan anota el precio de venta y la comisión de
// agencia de Hey You; el panel calcula el margen por venta y el total del período (precio × reservas).
//
// IMPORTANTE: los números que anota Juan quedan SOLO en este navegador (localStorage). No se publican
// ni se suben al repositorio —por eso la comisión "no va" en data/tours.js (es dato interno)—. Para
// respaldar o pasarlos a otra compu están los botones Exportar / Importar.
//
// La comisión puede ser porcentaje ("pct", ej. 20 %) o un monto fijo por venta ("fijo", ej. $15).

const KEY = "hey-margenes-v1";
const raiz = document.getElementById("margenes");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
function fmtUSD(n) {
  const v = Math.round(n * 100) / 100;
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
}
const fmtPct = (n) => `${(Math.round(n * 10) / 10).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;

// El primer precio en dólares del texto público, como punto de partida editable (los precios de la
// ficha son rangos: "$99 adulto, $62 niño"; se toma el primero y Juan lo ajusta).
function precioBase(t) {
  if (!t.precio) return null;
  const m = String(t.precio).match(/\$\s?([\d.,]+)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return isFinite(n) ? n : null;
}

// ---------- Estado (localStorage) ----------
// Forma: { [idTour]: { precio, tipo:"pct"|"fijo", comision, reservas, nota } }
function cargar() {
  try {
    const s = localStorage.getItem(KEY);
    if (s !== null) return JSON.parse(s) || {};
  } catch { /* sin almacenamiento o JSON roto: arranca sembrado */ }
  // Primera vez: sembrar el precio de referencia de cada tour (la comisión la pone Juan)
  const seed = {};
  for (const t of TOURS) { const p = precioBase(t); if (p) seed[t.id] = { precio: p, tipo: "pct" }; }
  guardar(seed);
  return seed;
}
function guardar(e) {
  try { localStorage.setItem(KEY, JSON.stringify(e ?? estado)); } catch { /* sin almacenamiento: vale para esta visita */ }
}
let estado = cargar();

// Números calculados de un tour a partir de lo anotado
function datos(id) {
  const d = estado[id] || {};
  const precio = num(d.precio);
  const tipo = d.tipo === "fijo" ? "fijo" : "pct";
  const com = num(d.comision);
  const reservas = Math.max(0, Math.floor(num(d.reservas)));
  const unidad = tipo === "fijo" ? com : precio * com / 100;   // comisión Hey You por venta
  const pct = precio > 0 ? unidad / precio * 100 : null;        // margen % sobre el precio de venta
  const total = unidad * reservas;                             // comisión del período
  const facturado = precio * reservas;                         // lo que paga el cliente en el período
  const tieneDatos = precio > 0 && com > 0;
  return { precio, tipo, com, reservas, unidad, pct, total, facturado, tieneDatos };
}

// ---------- Pintar ----------
function cardTour(t) {
  const d = estado[t.id] || {};
  const tipo = d.tipo === "fijo" ? "fijo" : "pct";
  const ref = t.precio ? `Precio público: ${t.precio}` : "Precio público a confirmar por WhatsApp.";
  return `
    <section class="tarjeta">
      <div class="margen-cab">
        <h2>${esc(t.titulo)}</h2>
        <span class="margen-id">${esc(t.id)}</span>
      </div>
      <p class="margen-ref">${esc(ref)}</p>
      <div class="margen-campos">
        <label class="campo">
          <span>Precio de venta</span>
          <span class="input-money"><em>$</em><input type="number" inputmode="decimal" min="0" step="any"
            data-id="${esc(t.id)}" data-campo="precio" value="${esc(d.precio ?? "")}" placeholder="0" aria-label="Precio de venta en dólares"></span>
        </label>
        <div class="campo">
          <span>Comisión Hey You</span>
          <div class="comision">
            <div class="segmentado chico" role="group" aria-label="Tipo de comisión">
              <button type="button" data-id="${esc(t.id)}" data-tipo="pct" aria-pressed="${tipo === "pct"}" title="Porcentaje del precio">%</button>
              <button type="button" data-id="${esc(t.id)}" data-tipo="fijo" aria-pressed="${tipo === "fijo"}" title="Monto fijo por venta">$</button>
            </div>
            <span class="input-money suf"><em data-unit="${esc(t.id)}">${tipo === "fijo" ? "$" : "%"}</em><input type="number" inputmode="decimal" min="0" step="any"
              data-id="${esc(t.id)}" data-campo="comision" value="${esc(d.comision ?? "")}" placeholder="0" aria-label="Comisión de Hey You"></span>
          </div>
        </div>
        <label class="campo">
          <span>Reservas (período)</span>
          <span class="input-money"><input type="number" inputmode="numeric" min="0" step="1"
            data-id="${esc(t.id)}" data-campo="reservas" value="${esc(d.reservas ?? "")}" placeholder="0" aria-label="Reservas del período"></span>
        </label>
        <label class="campo campo-ancho">
          <span>Nota</span>
          <input type="text" class="nota" data-id="${esc(t.id)}" data-campo="nota" value="${esc(d.nota ?? "")}" placeholder="neto del operador, temporada alta…">
        </label>
      </div>
      <div class="margen-salida">
        <div><span class="margen-grande" data-out="unidad" data-out-id="${esc(t.id)}">—</span><span class="margen-chico">margen por venta</span></div>
        <div><span class="margen-grande" data-out="total" data-out-id="${esc(t.id)}">—</span><span class="margen-chico">comisión del período</span></div>
      </div>
    </section>`;
}

function pintar() {
  raiz.innerHTML = `
    <section class="portada">
      <span class="kicker">Panel interno</span>
      <h1 style="margin:6px 0 4px;line-height:1.1;">Márgenes por tour</h1>
      <p class="resumen">Anotá el precio de venta y la comisión de Hey You de cada tour. El panel calcula tu margen.</p>
    </section>
    <p class="aviso" role="note">🔒 Estos números quedan solo en este navegador: no se publican ni se suben al repositorio. Respaldalos con “Exportar”.</p>
    <section class="tarjeta">
      <span class="kicker">Resumen</span>
      <div class="resumen-grid">
        <div class="resumen-dato"><b id="sum-tours">0</b><span>tours con datos</span></div>
        <div class="resumen-dato"><b id="sum-margen">—</b><span>margen promedio</span></div>
        <div class="resumen-dato"><b id="sum-facturado">—</b><span>facturación del período</span></div>
        <div class="resumen-dato"><b id="sum-comision">—</b><span>comisión Hey You</span></div>
      </div>
    </section>
    ${TOURS.map(cardTour).join("")}
    <div class="acciones">
      <button type="button" class="boton-chico" id="btn-exportar">⬇️ Exportar (copiar)</button>
      <button type="button" class="boton-chico" id="btn-importar">⬆️ Importar (pegar)</button>
      <button type="button" class="boton-chico peligro" id="btn-borrar">🗑️ Borrar todo</button>
    </div>
    <p class="flash" id="flash" hidden></p>
    <p class="letra-chica">Los precios de venta vienen prellenados con el primer precio público de cada tour; ajustalos a lo que corresponda. La comisión es porcentaje (%) o monto fijo ($) por venta.</p>`;
  recalcular();
}

// Vuelve a calcular todo sin re-dibujar los campos (para no perder el foco al escribir)
function recalcular() {
  let sumFacturado = 0, sumComision = 0, nDatos = 0, sumPct = 0;
  for (const t of TOURS) {
    const r = datos(t.id);
    const outU = raiz.querySelector(`[data-out="unidad"][data-out-id="${CSS.escape(t.id)}"]`);
    const outT = raiz.querySelector(`[data-out="total"][data-out-id="${CSS.escape(t.id)}"]`);
    if (outU) outU.textContent = r.tieneDatos ? `${fmtUSD(r.unidad)} · ${fmtPct(r.pct)}` : "—";
    if (outT) outT.textContent = r.reservas > 0 && r.tieneDatos ? fmtUSD(r.total) : "—";
    if (r.tieneDatos) { nDatos++; sumPct += r.pct; sumFacturado += r.facturado; sumComision += r.total; }
  }
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("sum-tours", String(nDatos));
  set("sum-margen", nDatos ? fmtPct(sumPct / nDatos) : "—");
  set("sum-facturado", sumFacturado > 0 ? fmtUSD(sumFacturado) : "—");
  set("sum-comision", sumComision > 0 ? fmtUSD(sumComision) : "—");
}

let flashTimer = null;
function flash(msg, ok = true) {
  const el = document.getElementById("flash");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  el.style.color = ok ? "#bbf7d0" : "#fecaca";
  el.style.background = ok ? "rgba(34,197,94,0.16)" : "rgba(239,68,68,0.16)";
  el.style.borderColor = ok ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)";
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

// ---------- Eventos ----------
// Escribir en un campo: guardar y recalcular
raiz.addEventListener("input", (e) => {
  const el = e.target;
  const id = el.dataset.id, campo = el.dataset.campo;
  if (!id || !campo) return;
  (estado[id] ||= {})[campo] = el.value;
  guardar();
  recalcular();
});

// Cambiar el tipo de comisión (% o $ fijo)
raiz.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tipo]");
  if (!b) return;
  const id = b.dataset.id;
  (estado[id] ||= {}).tipo = b.dataset.tipo;
  guardar();
  b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  const em = raiz.querySelector(`em[data-unit="${CSS.escape(id)}"]`);
  if (em) em.textContent = b.dataset.tipo === "fijo" ? "$" : "%";
  recalcular();
});

// Acciones
raiz.addEventListener("click", async (e) => {
  if (e.target.closest("#btn-exportar")) {
    const texto = JSON.stringify(estado, null, 2);
    try {
      await navigator.clipboard.writeText(texto);
      flash("Copiado al portapapeles. Pegalo en una nota segura para respaldarlo.");
    } catch {
      window.prompt("Copiá este respaldo (Ctrl/Cmd+C):", texto);
    }
  } else if (e.target.closest("#btn-importar")) {
    const texto = window.prompt("Pegá acá el respaldo (JSON) que exportaste antes:");
    if (texto === null || texto.trim() === "") return;
    try {
      const o = JSON.parse(texto);
      if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("formato");
      estado = o;
      guardar();
      pintar();
      flash("Respaldo importado.");
    } catch {
      flash("No se pudo leer el respaldo: revisá que sea el JSON completo.", false);
    }
  } else if (e.target.closest("#btn-borrar")) {
    if (!window.confirm("¿Borrar todos los números anotados en este navegador? No se puede deshacer.")) return;
    estado = {};
    try { localStorage.removeItem(KEY); } catch { /* nada que borrar */ }
    estado = cargar();   // vuelve a sembrar los precios de referencia
    pintar();
    flash("Listo: se borraron los datos y quedaron los precios de referencia.");
  }
});

pintar();
