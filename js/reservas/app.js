/* =========================================================
   Hey You ST · Sistema de reservas · Controlador y vistas
   ---------------------------------------------------------
   Orquesta todo: la encuesta de perfil, la pantalla de explorar (recomendaciones),
   el detalle de cada actividad (con el mapa mostrando dónde queda y, para el tour a
   pie, sus puntos afinados al tipo de viajero), los guardados y el itinerario por día.
   El mapa va al fondo (js/reservas/mapa.js); acá vive el cuerpo que flota encima.
   ========================================================= */
import { ACTIVIDADES, porId, PESOS_TIPO, CAT_AVENTURA, CAT_RELAX, TIPOS, WHATSAPP } from "./datos.js";
import {
  getIdioma, setIdioma, enIngles, t, txt, ambiente, esc,
  getPerfil, setPerfil, tienePerfil,
  favoritos, esFavorito, alternarFavorito,
  getItinerario, setItinerario,
  CATEGORIAS, rotuloCat, colorCat,
} from "./estado.js";
import { setActividades, vistaGeneral, enfocarActividad, resaltarParada, reajustar } from "./mapa.js";

const $ = (s, r = document) => r.querySelector(s);
const panel = $("#panel");
const topbar = $("#topbar");

// ---------- Recomendación ----------
function puntaje(a, perfil) {
  const pesos = PESOS_TIPO[perfil.tipo] || {};
  let s = 0;
  for (const c of a.categorias) s += pesos[c] || 0;
  const av = (perfil.aventura - 50) / 50; // -1 (relax) .. +1 (aventura)
  for (const c of a.categorias) {
    if (CAT_AVENTURA.has(c)) s += av * 0.9;
    if (CAT_RELAX.has(c)) s -= av * 0.9;
  }
  if (!perfil.transporte) {
    if (a.transporte === "necesario") s -= 2.6;
    else if (a.transporte === "recomendado") s -= 0.7;
  }
  if (a.tipo === "ruta") s += 0.6; // el tour a pie es la actividad gratis estrella
  return s;
}
function recomendadas() {
  const perfil = getPerfil();
  return ACTIVIDADES
    .map(a => ({ a, s: puntaje(a, perfil) }))
    .sort((x, y) => y.s - x.s)
    .map(x => x.a);
}

// ---------- Helpers de interfaz ----------
function waLink(mensaje) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}
function fotoHTML(a, { grande = false } = {}) {
  const cat = CATEGORIAS[a.categorias[0]] || {};
  const cat2 = CATEGORIAS[a.categorias[1]];
  const c1 = cat.color || "#0f8a8f", c2 = cat2?.color || c1;
  if (a.foto) {
    return `<div class="foto ${grande ? "foto-g" : ""}" style="background-image:url('${esc(a.foto)}')"></div>`;
  }
  // Placeholder elegante: degradado de la categoría + ícono + nombre tenue
  return `<div class="foto foto-ph ${grande ? "foto-g" : ""}" style="--c1:${c1};--c2:${c2}">
      <span class="foto-emoji">${cat.emoji || "📍"}</span>
      <span class="foto-ph-nombre">${esc(t(a.nombre))}</span>
    </div>`;
}
function badge(a) {
  return a.pago
    ? `<span class="badge badge-pago">${esc(txt("pago"))}</span>`
    : `<span class="badge badge-gratis">${esc(txt("gratis"))}</span>`;
}
function transporteAviso(a) {
  const p = getPerfil();
  if (a.transporte === "no") return `<span class="pista pista-ok">🚶 ${esc(txt("aPie"))}</span>`;
  if (p && !p.transporte && a.transporte === "necesario") return `<span class="pista pista-alerta">🚗 ${esc(txt("necesitaTransporte"))}</span>`;
  if (p && !p.transporte && a.transporte === "recomendado") return `<span class="pista">🚗 ${esc(txt("mejorTransporte"))}</span>`;
  return "";
}
function chipsCat(cats) {
  return cats.map(c => `<span class="chip-cat" style="--c:${colorCat(c)}">${esc(rotuloCat(c))}</span>`).join("");
}
function corazon(a) {
  const on = esFavorito(a.id);
  return `<button class="fav ${on ? "fav-on" : ""}" data-fav="${a.id}" aria-pressed="${on}" aria-label="${esc(txt(on ? "guardado" : "guardar"))}">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.8-9C.6 8.6 2.4 5 6 5c2 0 3.2 1.1 4 2.3C10.8 6.1 12 5 14 5c3.6 0 5.4 3.6 3.8 7-2.3 4.4-9.8 9-9.8 9z"/></svg>
    </button>`;
}

// ---------- Barra superior ----------
function pintarTopbar() {
  const navHidden = !tienePerfil();
  topbar.innerHTML = `
    <a class="marca" href="#/" aria-label="Hey You ST">
      <img src="img/marca/hey-you-st.svg" alt="">
      <span class="marca-txt"><b>${esc(txt("marca"))}</b><small>${esc(txt("marcaSub"))}</small></span>
    </a>
    ${navHidden ? "" : `<nav class="nav" id="nav">
      <a href="#/" data-ruta="" class="nav-i">🧭 <span>${esc(txt("navExplorar"))}</span></a>
      <a href="#/guardados" data-ruta="guardados" class="nav-i">❤️ <span>${esc(txt("navGuardados"))}</span><i class="nav-n" id="nav-n">${favoritos().length || ""}</i></a>
      <a href="#/itinerario" data-ruta="itinerario" class="nav-i">🗓️ <span>${esc(txt("navItinerario"))}</span></a>
    </nav>`}
    <div class="idioma" role="group" aria-label="Language · Idioma">
      <button type="button" data-idioma="en" aria-pressed="${enIngles()}">EN</button>
      <button type="button" data-idioma="es" aria-pressed="${!enIngles()}">ES</button>
    </div>`;
  topbar.querySelectorAll("[data-idioma]").forEach(b => b.addEventListener("click", () => {
    setIdioma(b.dataset.idioma);
    pintarTopbar(); router();
  }));
  marcarNav();
}
function marcarNav() {
  const seccion = (location.hash.replace(/^#\/?/, "").split("/")[0]) || "";
  topbar.querySelectorAll(".nav-i").forEach(a => a.classList.toggle("activo", a.dataset.ruta === seccion));
}

// ---------- Encuesta ----------
const PASOS = ["tipo", "personas", "transporte", "viaje"];
let borrador = null; // perfil en construcción
let pasoActual = 0;

function vistaEncuesta() {
  document.body.classList.add("encuesta-activa");
  topbar.classList.add("topbar-min");
  if (!borrador) borrador = { tipo: null, personas: 2, transporte: null, dias: 5, aventura: 50 };
  const paso = PASOS[pasoActual];

  let cuerpo = "";
  if (pasoActual < 0) cuerpo = "";
  if (paso === "tipo") {
    cuerpo = `<h2>${esc(txt("q1"))}</h2>
      <div class="opciones opciones-grid">
        ${Object.entries(TIPOS).map(([k, v]) => `
          <button class="opcion ${borrador.tipo === k ? "sel" : ""}" data-tipo="${k}">
            <span class="opcion-emoji">${v.emoji}</span>
            <span>${esc(enIngles() ? v.en : v.es)}</span>
          </button>`).join("")}
      </div>`;
  } else if (paso === "personas") {
    cuerpo = `<h2>${esc(txt("q2"))}</h2><p class="sub">${esc(txt("q2sub"))}</p>
      <div class="contador">
        <button class="cont-btn" data-mod="-1" aria-label="−">−</button>
        <span class="cont-n" id="cont-n">${borrador.personas}</span>
        <button class="cont-btn" data-mod="1" aria-label="+">+</button>
      </div>
      <p class="cont-pista">${esc(txt("personas", borrador.personas))}</p>`;
  } else if (paso === "transporte") {
    cuerpo = `<h2>${esc(txt("q3"))}</h2><p class="sub">${esc(txt("q3sub"))}</p>
      <div class="opciones opciones-2">
        <button class="opcion ${borrador.transporte === true ? "sel" : ""}" data-tr="1"><span class="opcion-emoji">🚗</span><span>${esc(txt("si"))}</span></button>
        <button class="opcion ${borrador.transporte === false ? "sel" : ""}" data-tr="0"><span class="opcion-emoji">🚶</span><span>${esc(txt("no"))}</span></button>
      </div>`;
  } else if (paso === "viaje") {
    cuerpo = `<h2>${esc(txt("q4"))}</h2>
      <div class="contador">
        <button class="cont-btn" data-dias="-1" aria-label="−">−</button>
        <span class="cont-n" id="cont-dias">${borrador.dias}</span>
        <button class="cont-btn" data-dias="1" aria-label="+">+</button>
      </div>
      <p class="cont-pista">${esc(txt("dias", borrador.dias))}</p>
      <h2 class="mt">${esc(txt("q4b"))}</h2>
      <div class="desliz">
        <input type="range" id="aventura" min="0" max="100" step="10" value="${borrador.aventura}">
        <div class="desliz-rot"><span>${esc(txt("relax"))}</span><b id="amb">${esc(ambiente(borrador.aventura))}</b><span>${esc(txt("aventura"))}</span></div>
      </div>`;
  }

  const esUltimo = pasoActual === PASOS.length - 1;
  panel.className = "panel panel-encuesta";
  panel.hidden = false;
  panel.innerHTML = `
    <div class="encuesta">
      <div class="enc-progreso"><i style="width:${((pasoActual + 1) / PASOS.length) * 100}%"></i></div>
      <span class="enc-paso">${esc(txt("paso", pasoActual + 1, PASOS.length))}</span>
      <div class="enc-cuerpo">${cuerpo}</div>
      <div class="enc-acciones">
        ${pasoActual > 0 ? `<button class="btn btn-fantasma" id="enc-atras">${esc(txt("atras"))}</button>` : "<span></span>"}
        <button class="btn btn-primario" id="enc-sig" ${pasoPuedeSeguir() ? "" : "disabled"}>${esc(esUltimo ? txt("verActividades") : txt("siguiente"))}</button>
      </div>
    </div>`;

  bindEncuesta(esUltimo);
}
function pasoPuedeSeguir() {
  const paso = PASOS[pasoActual];
  if (paso === "tipo") return !!borrador.tipo;
  if (paso === "transporte") return borrador.transporte === true || borrador.transporte === false;
  return true;
}
function bindEncuesta(esUltimo) {
  panel.querySelectorAll("[data-tipo]").forEach(b => b.addEventListener("click", () => { borrador.tipo = b.dataset.tipo; vistaEncuesta(); }));
  panel.querySelectorAll("[data-mod]").forEach(b => b.addEventListener("click", () => {
    borrador.personas = Math.min(20, Math.max(1, borrador.personas + Number(b.dataset.mod)));
    vistaEncuesta();
  }));
  panel.querySelectorAll("[data-dias]").forEach(b => b.addEventListener("click", () => {
    borrador.dias = Math.min(21, Math.max(1, borrador.dias + Number(b.dataset.dias)));
    vistaEncuesta();
  }));
  panel.querySelectorAll("[data-tr]").forEach(b => b.addEventListener("click", () => { borrador.transporte = b.dataset.tr === "1"; vistaEncuesta(); }));
  const av = $("#aventura");
  if (av) av.addEventListener("input", () => { borrador.aventura = Number(av.value); $("#amb").textContent = ambiente(borrador.aventura); });
  $("#enc-atras")?.addEventListener("click", () => { pasoActual = Math.max(0, pasoActual - 1); vistaEncuesta(); });
  $("#enc-sig")?.addEventListener("click", () => {
    if (!pasoPuedeSeguir()) return;
    if (esUltimo) {
      setPerfil(borrador);
      borrador = null; pasoActual = 0;
      document.body.classList.remove("encuesta-activa");
      topbar.classList.remove("topbar-min");
      pintarTopbar();
      location.hash = "#/";
      router();
    } else { pasoActual++; vistaEncuesta(); }
  });
}

// ---------- Explorar ----------
let filtro = "todas";
function vistaExplorar() {
  document.body.classList.remove("encuesta-activa", "detalle-activo");
  const perfil = getPerfil();
  const lista = recomendadas();
  setActividades(lista, (a) => { location.hash = `#/a/${a.id}`; });
  vistaGeneral();

  const cats = ["todas", ...new Set(lista.flatMap(a => a.categorias).filter(c => CATEGORIAS[c]))];
  const visibles = filtro === "todas" ? lista : lista.filter(a => a.categorias.includes(filtro));
  const pinfo = {
    emoji: TIPOS[perfil.tipo].emoji,
    etiqueta: enIngles() ? TIPOS[perfil.tipo].en : TIPOS[perfil.tipo].es,
    dias: txt("dias", perfil.dias),
    ambiente: ambiente(perfil.aventura),
  };

  panel.className = "panel panel-lista";
  panel.hidden = false;
  panel.innerHTML = `
    <div class="panel-cab">
      <span class="kicker">${esc(txt("paraVos"))}</span>
      <h2>${esc(txt("recomendado"))}</h2>
      <p class="resumen">${esc(txt("paraVosSub", pino(pinfo)))}</p>
      <div class="filtros">
        ${cats.map(c => `<button class="filtro ${filtro === c ? "sel" : ""}" data-filtro="${c}">${c === "todas" ? esc(txt("todas")) : esc(rotuloCat(c))}</button>`).join("")}
      </div>
    </div>
    <div class="tarjetas">
      ${visibles.length ? visibles.map((a, i) => tarjeta(a, i < 3 && filtro === "todas")).join("") : `<p class="vacio">${esc(txt("sinResultados"))}</p>`}
    </div>`;
  bindLista();
  marcarNav();
}
const pino = (o) => o; // identidad (la función de texto recibe el objeto)

function tarjeta(a, destacada) {
  return `<article class="tarjeta ${destacada ? "tarjeta-top" : ""}" data-abrir="${a.id}">
      ${fotoHTML(a)}
      <div class="tarjeta-cuerpo">
        <div class="tarjeta-top-fila">${badge(a)} ${destacada ? `<span class="estrella">★ ${esc(txt("recomendado"))}</span>` : ""}</div>
        <h3>${esc(t(a.nombre))}</h3>
        <p>${esc(recorta(t(a.resumen), 110))}</p>
        <div class="tarjeta-pie">
          <div class="chips">${chipsCat(a.categorias.slice(0, 2))}</div>
          ${transporteAviso(a)}
        </div>
      </div>
      ${corazon(a)}
    </article>`;
}
function bindLista() {
  panel.querySelectorAll("[data-filtro]").forEach(b => b.addEventListener("click", () => { filtro = b.dataset.filtro; vistaExplorar(); }));
  panel.querySelectorAll("[data-abrir]").forEach(el => el.addEventListener("click", (e) => {
    if (e.target.closest("[data-fav]")) return;
    location.hash = `#/a/${el.dataset.abrir}`;
  }));
  bindFavoritos();
}
function bindFavoritos() {
  panel.querySelectorAll("[data-fav]").forEach(b => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const on = alternarFavorito(b.dataset.fav);
    b.classList.toggle("fav-on", on);
    b.setAttribute("aria-pressed", on);
    const n = $("#nav-n"); if (n) n.textContent = favoritos().length || "";
  }));
}

// ---------- Detalle ----------
let paradaSel = 0;
function vistaDetalle(id) {
  const a = porId(id);
  if (!a) { location.hash = "#/"; return; }
  document.body.classList.add("detalle-activo");
  document.body.classList.remove("encuesta-activa");
  paradaSel = 0;

  // El mapa muestra dónde queda / los puntos del tour
  enfocarActividad(a, { onParada: (i) => seleccionarParada(a, i) });

  const perfilTipo = enIngles() ? TIPOS[getPerfil().tipo].en : TIPOS[getPerfil().tipo].es;

  panel.className = "panel panel-detalle";
  panel.hidden = false;
  panel.innerHTML = `
    <button class="btn-volver" id="volver">← ${esc(txt("volver"))}</button>
    ${fotoHTML(a, { grande: true })}
    <div class="detalle-cuerpo">
      <div class="tarjeta-top-fila">${badge(a)} <div class="chips">${chipsCat(a.categorias)}</div></div>
      <h2>${esc(t(a.nombre))}</h2>
      ${transporteAviso(a) ? `<div class="avisos">${transporteAviso(a)}</div>` : ""}
      <p class="lead">${esc(t(a.resumen))}</p>

      ${metaHTML(a)}
      ${a.historia && a.pago ? `<section class="bloque"><h3>${esc(txt("laHistoria"))}</h3><p>${esc(t(a.historia))}</p></section>` : ""}
      ${a.tip ? `<div class="tip"><b>💡 ${esc(txt("tipLocal"))}</b><p>${esc(t(a.tip))}</p></div>` : ""}
      ${incluyeHTML(a)}
      ${paradasHTML(a, perfilTipo)}
      ${notasHTML(a)}

      <div class="detalle-acciones">
        ${accionGuardar(a)}
        ${a.pago
          ? `<a class="btn btn-wa" href="${waLink(txt("waInteres", t(a.nombre)))}" target="_blank" rel="noopener">💬 ${esc(txt("meInteresa"))}</a>`
          : `<a class="btn btn-itin" href="#/itinerario">🗓️ ${esc(txt("agregarItin"))}</a>`}
      </div>
    </div>`;
  bindDetalle(a);
  marcarNav();
}
function metaHTML(a) {
  const items = [];
  if (a.duracion && t(a.duracion)) items.push(`<div><span>⏱️ ${esc(txt("duracion"))}</span><b>${esc(t(a.duracion))}</b></div>`);
  if (a.salida && t(a.salida)) items.push(`<div><span>📍 ${esc(txt("salida"))}</span><b>${esc(t(a.salida))}</b></div>`);
  if (a.pago) items.push(`<div><span>💵 ${esc(txt("precio"))}</span><b>${esc(a.precio ? t(a.precio) : txt("precioWhats"))}</b></div>`);
  return items.length ? `<div class="meta">${items.join("")}</div>` : "";
}
function incluyeHTML(a) {
  if (!a.incluye?.length) return "";
  return `<section class="bloque"><h3>${esc(txt("incluye"))}</h3>
    <ul class="incluye">${a.incluye.map(x => `<li>${esc(t(x))}</li>`).join("")}</ul></section>`;
}
function notasHTML(a) {
  if (!a.notas?.length) return "";
  return `<section class="bloque"><h3>${esc(txt("notas"))}</h3>
    <ul class="notas">${a.notas.map(x => `<li>${esc(t(x))}</li>`).join("")}</ul></section>`;
}
function paradasHTML(a, perfilTipo) {
  if (!a.paradas?.length) {
    return a.coords ? `<section class="bloque"><h3>${esc(txt("dondeEsta"))}</h3><p class="mini">${esc(t(a.descripcion))}</p></section>` : "";
  }
  const tipoKey = getPerfil().tipo;
  const intro = a.intro ? `<p class="sub">${esc(t(a.intro[tipoKey] || a.intro.solo))}</p>` : "";
  return `<section class="bloque bloque-ruta">
      <h3>${esc(txt("elRecorrido"))}</h3>
      <p class="resumen">${esc(txt("elRecorridoSub", perfilTipo))}</p>
      ${intro}
      <ol class="paradas">
        ${a.paradas.map((p, i) => {
          const tip = p.tips ? (p.tips[tipoKey] || p.tips.solo) : null;
          return `<li class="parada ${i === 0 ? "sel" : ""}" data-parada="${i}">
            <span class="parada-n">${p.orden}</span>
            <div class="parada-txt">
              <b>${esc(t(p.nombre))}${p.min ? ` · <small>${esc(t(p.min))}</small>` : ""}</b>
              <p>${esc(t(p.texto))}</p>
              ${tip ? `<p class="parada-tip">✨ ${esc(t(tip))}</p>` : ""}
            </div>
          </li>`;
        }).join("")}
      </ol>
    </section>`;
}
function accionGuardar(a) {
  const on = esFavorito(a.id);
  return `<button class="btn btn-guardar ${on ? "on" : ""}" data-fav-btn="${a.id}">
    ${on ? "❤️ " + esc(txt("guardado")) : "🤍 " + esc(txt("guardar"))}</button>`;
}
function seleccionarParada(a, i) {
  paradaSel = i;
  resaltarParada(i);
  panel.querySelectorAll(".parada").forEach(el => el.classList.toggle("sel", el.dataset.parada === String(i)));
  const el = panel.querySelector(`.parada[data-parada="${i}"]`);
  el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function bindDetalle(a) {
  $("#volver")?.addEventListener("click", () => { location.hash = "#/"; });
  panel.querySelectorAll(".parada").forEach(el => el.addEventListener("click", () => seleccionarParada(a, Number(el.dataset.parada))));
  panel.querySelector("[data-fav-btn]")?.addEventListener("click", (e) => {
    const on = alternarFavorito(a.id);
    e.currentTarget.classList.toggle("on", on);
    e.currentTarget.innerHTML = on ? "❤️ " + esc(txt("guardado")) : "🤍 " + esc(txt("guardar"));
    const n = $("#nav-n"); if (n) n.textContent = favoritos().length || "";
  });
}

// ---------- Guardados ----------
function vistaGuardados() {
  document.body.classList.remove("encuesta-activa", "detalle-activo");
  const lista = favoritos().map(porId).filter(Boolean);
  setActividades(lista.length ? lista : recomendadas(), (a) => { location.hash = `#/a/${a.id}`; });
  vistaGeneral();

  panel.className = "panel panel-lista";
  panel.hidden = false;
  panel.innerHTML = `
    <div class="panel-cab">
      <span class="kicker">❤️ ${esc(txt("navGuardados"))}</span>
      <h2>${esc(txt("guardadosTitulo"))}</h2>
    </div>
    ${lista.length ? `
      <div class="tarjetas">${lista.map(a => tarjeta(a, false)).join("")}</div>
      <a class="btn btn-primario btn-ancho" href="#/itinerario">🗓️ ${esc(txt("guardadosArmar"))}</a>`
      : `<p class="vacio">${esc(txt("guardadosVacio"))}</p>`}`;
  bindLista();
  marcarNav();
}

// ---------- Itinerario ----------
function clasificar(a) {
  // ¿La actividad es más de aventura o de relax?
  let av = 0, rx = 0;
  for (const c of a.categorias) { if (CAT_AVENTURA.has(c)) av++; if (CAT_RELAX.has(c)) rx++; }
  if (a.tipo === "ruta") av++;
  return av >= rx ? "aventura" : "relax";
}
function generarItinerario(dias, diasAventura) {
  const ranked = recomendadas();
  const favs = new Set(favoritos());
  // Favoritos primero, luego el resto, manteniendo el orden de recomendación
  const pool = [...ranked.filter(a => favs.has(a.id)), ...ranked.filter(a => !favs.has(a.id))];
  const aventura = pool.filter(a => clasificar(a) === "aventura");
  const relax = pool.filter(a => clasificar(a) === "relax");
  const usados = new Set();
  const tomar = (arr) => { const a = arr.find(x => !usados.has(x.id)); if (a) usados.add(a.id); return a; };

  const plan = [];
  for (let d = 0; d < dias; d++) {
    const tema = d < diasAventura ? "aventura" : "relax";
    let principal = tomar(tema === "aventura" ? aventura : relax)
      || tomar(tema === "aventura" ? relax : aventura);
    // Plan gratis del día: un lugar/ruta gratis, distinto del principal
    const gratis = tomar(pool.filter(a => !a.pago));
    plan.push({ tema, principal: principal?.id || null, gratis: gratis?.id || null });
  }
  return { dias, diasAventura, plan };
}

let itinDiaSel = null;
function vistaItinerario() {
  document.body.classList.remove("encuesta-activa", "detalle-activo");
  const perfil = getPerfil();
  let it = getItinerario();
  if (!it) {
    const diasAv = Math.round(perfil.dias * perfil.aventura / 100);
    it = { dias: perfil.dias, diasAventura: diasAv, plan: null };
  }

  // El mapa: los principales del plan si ya se generó
  if (it.plan) {
    const acts = it.plan.map(p => porId(p.principal)).filter(Boolean);
    setActividades(acts, (a) => { location.hash = `#/a/${a.id}`; });
    if (itinDiaSel == null) vistaGeneral();
  } else {
    setActividades(recomendadas(), (a) => { location.hash = `#/a/${a.id}`; });
    vistaGeneral();
  }

  panel.className = "panel panel-lista";
  panel.hidden = false;
  panel.innerHTML = `
    <div class="panel-cab">
      <span class="kicker">🗓️ ${esc(txt("navItinerario"))}</span>
      <h2>${esc(txt("itinTitulo"))}</h2>
      <p class="resumen">${esc(txt("itinSub"))}</p>
    </div>
    <div class="itin-form">
      <label class="campo"><span>${esc(txt("itinDias"))}</span>
        <div class="contador contador-sm">
          <button class="cont-btn" data-id-dias="-1">−</button>
          <span class="cont-n" id="it-dias">${it.dias}</span>
          <button class="cont-btn" data-id-dias="1">+</button>
        </div>
      </label>
      <label class="campo"><span>${esc(txt("itinBalance"))}</span>
        <input type="range" id="it-bal" min="0" max="${it.dias}" step="1" value="${it.diasAventura}">
        <div class="desliz-rot"><b id="it-bal-rot">${esc(txt("itinDiasAventura", it.diasAventura))} · ${esc(txt("itinDiasRelax", it.dias - it.diasAventura))}</b></div>
      </label>
      <button class="btn btn-primario btn-ancho" id="it-generar">✨ ${esc(it.plan ? txt("itinRehacer") : txt("itinGenerar"))}</button>
    </div>
    <div class="itin-dias" id="itin-dias">
      ${it.plan ? it.plan.map((p, i) => diaHTML(p, i)).join("") : `<p class="vacio">${esc(txt("itinVacio"))}</p>`}
    </div>`;
  bindItinerario(it);
  marcarNav();
}
function diaHTML(p, i) {
  const a = porId(p.principal);
  const g = porId(p.gratis);
  const abierto = itinDiaSel === i;
  return `<div class="dia ${abierto ? "abierto" : ""}" data-dia="${i}">
      <button class="dia-cab" data-dia-cab="${i}">
        <span class="dia-n">${esc(txt("itinDia", i + 1))}</span>
        <span class="dia-tema tema-${p.tema}">${p.tema === "aventura" ? "🌊 " + esc(txt("itinAventura")) : "🌴 " + esc(txt("itinRelax"))}</span>
        <span class="dia-flecha">▾</span>
      </button>
      <div class="dia-cuerpo">
        ${a ? `<div class="dia-tour">
          <span class="dia-rotulo">${a.pago ? "🚤 " + esc(txt("itinTourDia")) : "📍 " + esc(txt("itinPlanDia"))}</span>
          <a class="dia-act" href="#/a/${a.id}">${fotoHTML(a)}<div><b>${esc(t(a.nombre))}</b><small>${esc(recorta(t(a.resumen), 70))}</small></div></a>
        </div>` : ""}
        ${g && (!a || g.id !== a.id) ? `<div class="dia-tour">
          <span class="dia-rotulo">🆓 ${esc(txt("itinTambien"))}</span>
          <a class="dia-act" href="#/a/${g.id}">${fotoHTML(g)}<div><b>${esc(t(g.nombre))}</b><small>${esc(recorta(t(g.resumen), 70))}</small></div></a>
        </div>` : ""}
        <div class="dia-reserva">
          <label class="campo-inline"><span>📅 ${esc(txt("itinFecha"))}</span><input type="date" data-fecha="${i}" value=""></label>
          <button class="btn btn-fantasma btn-chico" data-disp="${i}">${esc(txt("itinVerDisp"))}</button>
          <p class="disp-msg" data-disp-msg="${i}"></p>
          ${a ? `<a class="btn btn-wa btn-chico" data-reservar="${i}" href="${waLink(reservaMsg(a, "", getPerfil().personas))}" target="_blank" rel="noopener">💬 ${esc(txt("itinReservar"))}</a>` : ""}
        </div>
      </div>
    </div>`;
}
function reservaMsg(a, fecha, personas) {
  return txt("waReserva", t(a.nombre), fecha, txt("personas", personas));
}
function bindItinerario(it) {
  panel.querySelectorAll("[data-id-dias]").forEach(b => b.addEventListener("click", () => {
    it.dias = Math.min(21, Math.max(1, it.dias + Number(b.dataset.idDias)));
    it.diasAventura = Math.min(it.dias, it.diasAventura);
    it.plan = null; itinDiaSel = null; setItinerario(it); vistaItinerario();
  }));
  const bal = $("#it-bal");
  bal?.addEventListener("input", () => {
    it.diasAventura = Number(bal.value);
    $("#it-bal-rot").textContent = `${txt("itinDiasAventura", it.diasAventura)} · ${txt("itinDiasRelax", it.dias - it.diasAventura)}`;
  });
  $("#it-generar")?.addEventListener("click", () => {
    const nuevo = generarItinerario(it.dias, it.diasAventura);
    itinDiaSel = 0;
    setItinerario(nuevo);
    vistaItinerario();
  });
  panel.querySelectorAll("[data-dia-cab]").forEach(b => b.addEventListener("click", () => {
    const i = Number(b.dataset.diaCab);
    itinDiaSel = itinDiaSel === i ? null : i;
    const cur = getItinerario();
    const a = cur?.plan?.[i] && porId(cur.plan[i].principal);
    if (a) enfocarActividad(a, {}); else vistaGeneral();
    vistaItinerario();
  }));
  panel.querySelectorAll("[data-disp]").forEach(b => b.addEventListener("click", () => {
    const i = b.dataset.disp;
    const fecha = panel.querySelector(`[data-fecha="${i}"]`)?.value;
    const msg = panel.querySelector(`[data-disp-msg="${i}"]`);
    if (msg) msg.textContent = fecha ? txt("itinConsultar") : txt("itinElegirDia");
    // Actualiza el link de reserva con la fecha elegida
    const cur = getItinerario();
    const a = cur?.plan?.[i] && porId(cur.plan[i].principal);
    const rl = panel.querySelector(`[data-reservar="${i}"]`);
    if (a && rl && fecha) rl.href = waLink(reservaMsg(a, fechaLegible(fecha), getPerfil().personas));
  }));
}

// ---------- Utilidades ----------
function recorta(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; }
function fechaLegible(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const f = new Intl.DateTimeFormat(enIngles() ? "en-US" : "es-CR", { weekday: "short", day: "numeric", month: "short" });
  return f.format(dt);
}

// ---------- Router ----------
function router() {
  pintarTopbar();
  if (!tienePerfil()) { vistaEncuesta(); return; }
  const h = location.hash.replace(/^#\/?/, "");
  const [seccion, id] = h.split("/");
  if (seccion === "a" && id) vistaDetalle(id);
  else if (seccion === "guardados") vistaGuardados();
  else if (seccion === "itinerario") { itinDiaSel = getItinerario()?.plan ? itinDiaSel : null; vistaItinerario(); }
  else vistaExplorar();
}
window.addEventListener("hashchange", () => { itinDiaSel = null; router(); });
window.addEventListener("resize", reajustar);

// Arranque
pintarTopbar();
router();
