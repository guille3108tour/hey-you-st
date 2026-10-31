/* =========================================================
   Hey You ST · Simulador de precios de surf (propuesta)
   ========================================================= */

// Página para mostrarle al instructor cómo armaríamos los precios juntos (data/surf.js → SURF).
// Elegís tamaño del grupo y paquete, y ves en vivo: precio por persona, total del grupo, cuánto
// queda para el instructor y la comisión de Hey You. La comisión es un control que se mueve en
// vivo (no un trato fijo); nada de esto se guarda, es para conversar sobre la propuesta.

const raiz = document.getElementById("surf");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtUSD = (n) => { const v = Math.round(n * 100) / 100; return "$" + v.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }); };
const fmtPct = (n) => `${Math.round(n * 100)}%`;

// Los "escalones" del precio por persona: los tramos de data/surf.js más el "5+" (tope en adelante)
const BUCKETS = [
  ...SURF.tramos.map(t => ({ etiqueta: t.etiqueta, sub: `${t.personas} ${t.personas === 1 ? "persona" : "personas"} · ${t.ratio}`, personas: t.personas, base: t.porPersona })),
  { etiqueta: `${SURF.topeRatio + 1}+`, sub: "se suma instructor", personas: SURF.topeRatio + 1, base: SURF.piso },
];
const MAX_BASE = SURF.tramos[0].porPersona; // la privada: el precio por persona más alto, para escalar las barras

const estado = { personas: 2, paqueteIdx: 0, comision: SURF.comisionDefault };

// Precio por persona base (sin descuento de paquete) para N personas
const baseDe = (personas) => (personas <= SURF.tramos.length ? SURF.tramos[personas - 1].porPersona : SURF.piso);
// Índice del escalón activo (el "5+" es el último)
const bucketActivo = () => (estado.personas <= SURF.tramos.length ? estado.personas - 1 : SURF.tramos.length);

function derivar() {
  const personas = estado.personas;
  const paquete = SURF.paquetes[estado.paqueteIdx];
  const base = baseDe(personas);
  const perClase = base * (1 - paquete.descuento);     // por persona, una clase, con descuento de paquete
  const porPersona = perClase * paquete.clases;        // por persona, todas las clases del paquete
  const total = porPersona * personas;                 // la venta: total del grupo
  const comision = total * estado.comision;
  const instructor = total - comision;
  const iva = total - total / (1 + SURF.iva);           // IVA ya incluido en el público
  const instructores = Math.ceil(personas / SURF.topeRatio);
  return { personas, paquete, base, perClase, porPersona, total, comision, instructor, iva, instructores };
}

// ---------- Pintar la estructura una vez ----------
function pintar() {
  const chips = [];
  for (let n = 1; n <= SURF.tope; n++) {
    chips.push(`<button type="button" class="chip" data-personas="${n}" aria-pressed="${n === estado.personas}">${n}${n === SURF.tope ? "+" : ""}</button>`);
  }
  const paquetes = SURF.paquetes.map((p, i) => `
    <button type="button" class="paq" data-paq="${i}" aria-pressed="${i === estado.paqueteIdx}">
      <span class="paq-nombre">${esc(p.etiqueta)}</span>
      <span class="paq-nota">${esc(p.nota)}</span>
      ${p.descuento ? `<span class="paq-desc">−${Math.round(p.descuento * 100)}%</span>` : ""}
    </button>`).join("");

  const barras = BUCKETS.map((b, i) => `
    <div class="escalon" data-bucket="${i}">
      <div class="escalon-cab"><b>${esc(b.etiqueta)}</b><span>${esc(b.sub)}</span></div>
      <div class="escalon-barra"><span class="escalon-relleno" data-relleno="${i}"></span></div>
      <div class="escalon-precio" data-precio="${i}"></div>
    </div>`).join("");

  raiz.innerHTML = `
    <section class="portada">
      <span class="kicker">Propuesta · ${esc(SURF.lugar)}</span>
      <h1 class="s-titulo">Clases de surf, mejor en grupo</h1>
      <p class="resumen">Cuanta más gente va, más barato por persona — y el grupo completo siempre suma más. Movelo y mirá cómo quedan los números.</p>
    </section>
    <p class="aviso" role="note">🏄 Números de arranque para conversar. Ajustamos todo con vos: precios, descuentos y comisión.</p>

    <section class="tarjeta">
      <span class="s-label">¿Cuántas personas?</span>
      <div class="chips" id="chips" role="group" aria-label="Tamaño del grupo">${chips.join("")}</div>
      <span class="s-label s-label-top">¿Cuántas clases?</span>
      <div class="paquetes" id="paquetes" role="group" aria-label="Paquete de clases">${paquetes}</div>
    </section>

    <section class="tarjeta s-readout">
      <div class="s-tiles">
        <div class="s-tile">
          <span class="s-tile-num" id="r-porpersona">—</span>
          <span class="s-tile-pie" id="r-porpersona-pie">por persona</span>
        </div>
        <div class="s-tile s-tile-acento">
          <span class="s-tile-num" id="r-total">—</span>
          <span class="s-tile-pie">total del grupo</span>
        </div>
      </div>
      <p class="s-contexto" id="r-contexto"></p>
      <div class="escalera" id="escalera">${barras}</div>
    </section>

    <section class="tarjeta">
      <span class="s-label">Detrás del precio <em>(lo que ve el instructor)</em></span>
      <div class="desglose">
        <div class="desglose-fila desglose-destacado">
          <span>Para el instructor</span>
          <b id="d-instructor">—</b>
        </div>
        <div class="desglose-fila">
          <span>Comisión Hey You · <span id="d-compct">18%</span></span>
          <b id="d-comision">—</b>
        </div>
        <div class="desglose-fila desglose-suave">
          <span>IVA incluido (13%)</span>
          <b id="d-iva">—</b>
        </div>
        <div class="desglose-fila desglose-total">
          <span>Total del grupo</span>
          <b id="d-total">—</b>
        </div>
      </div>
      <label class="s-slider">
        <span>Comisión Hey You: <b id="s-compct">18%</b></span>
        <input type="range" id="s-comision" min="0" max="30" step="1" value="${Math.round(SURF.comisionDefault * 100)}" aria-label="Comisión de Hey You en porcentaje">
      </label>
      <p class="s-nota">La comisión se mueve solo acá: no se guarda en la página. Es para ver juntos qué número cierra para los dos.</p>
    </section>

    <section class="tarjeta s-explica">
      <h2>Por qué en grupo sale mejor</h2>
      <p>En una clase el costo real es el tiempo del instructor, no cuánta gente va. Por eso, cuantos más alumnos comparten la clase, menos paga cada uno — hasta ${SURF.topeRatio} por instructor, para que la clase siga siendo segura y buena. De ahí en adelante se suma otro instructor y el precio por persona ya no baja.</p>
      <p>La clave: el precio por persona baja, pero <b>el total del grupo siempre sube</b>. Así nunca perdés con un grupo grande.</p>
    </section>

    <section class="tarjeta s-explica">
      <h2>Paquetes</h2>
      <p>Surfear se aprende en varias clases. El paquete premia a quien se engancha y sube el ticket: de probar una, a un curso completo que lleva a alguien de cero a surfear solo. Se combina con el tamaño del grupo — una familia de ${SURF.topeRatio} en el curso completo es la mejor venta.</p>
    </section>

    <p class="letra-chica">Propuesta de Hey You ST para armar juntos las clases de surf en ${esc(SURF.lugar)}. Los precios son el punto de partida; los definimos con el instructor.</p>`;

  actualizar();
}

// ---------- Actualizar los números sin re-dibujar ----------
function actualizar() {
  const d = derivar();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  set("r-porpersona", fmtUSD(d.perClase));
  set("r-porpersona-pie", d.paquete.clases > 1 ? `por persona, por clase` : "por persona");
  set("r-total", fmtUSD(d.total));

  const partes = [`Grupo de ${d.personas}`, d.paquete.clases > 1 ? `${d.paquete.clases} clases` : "1 clase"];
  if (d.paquete.clases > 1) partes.push(`${fmtUSD(d.porPersona)} por persona por las ${d.paquete.clases}`);
  if (d.instructores > 1) partes.push(`${d.instructores} instructores`);
  set("r-contexto", partes.join(" · "));

  // La escalera de precios por persona, con el descuento del paquete aplicado
  BUCKETS.forEach((b, i) => {
    const perClase = b.base * (1 - d.paquete.descuento);
    const relleno = document.querySelector(`[data-relleno="${i}"]`);
    const precio = document.querySelector(`[data-precio="${i}"]`);
    const fila = document.querySelector(`.escalon[data-bucket="${i}"]`);
    if (relleno) relleno.style.width = `${Math.max(14, perClase / MAX_BASE * 100)}%`;
    if (precio) precio.textContent = fmtUSD(perClase);
    if (fila) fila.classList.toggle("activo", i === bucketActivo());
  });

  // Desglose
  set("d-instructor", fmtUSD(d.instructor));
  set("d-comision", fmtUSD(d.comision));
  set("d-iva", fmtUSD(d.iva));
  set("d-total", fmtUSD(d.total));
  set("d-compct", fmtPct(estado.comision));
  set("s-compct", fmtPct(estado.comision));
}

// ---------- Eventos ----------
raiz.addEventListener("click", (e) => {
  const chip = e.target.closest("[data-personas]");
  if (chip) {
    estado.personas = Number(chip.dataset.personas);
    document.querySelectorAll("#chips .chip").forEach(c => c.setAttribute("aria-pressed", String(Number(c.dataset.personas) === estado.personas)));
    actualizar();
    return;
  }
  const paq = e.target.closest("[data-paq]");
  if (paq) {
    estado.paqueteIdx = Number(paq.dataset.paq);
    document.querySelectorAll("#paquetes .paq").forEach(p => p.setAttribute("aria-pressed", String(Number(p.dataset.paq) === estado.paqueteIdx)));
    actualizar();
  }
});

raiz.addEventListener("input", (e) => {
  if (e.target.id === "s-comision") {
    estado.comision = Number(e.target.value) / 100;
    actualizar();
  }
});

pintar();
