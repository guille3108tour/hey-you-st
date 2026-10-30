/* =========================================================
   Hey You ST · Idioma (i18n)
   Dueño del idioma elegido y de los textos de la página. Lo importa todo lo demás.
   ========================================================= */
// ---------- Idioma ----------
// Juan (6-oct): la página habla inglés y español. Abre en inglés, porque la mayoría de quienes
// visitan Santa Teresa lo hablan, y recuerda en el teléfono el idioma que eligió cada persona
// (botón EN / ES de la barra de arriba). Los textos de la página están en TEXTOS; los de cada
// lugar y cada tour, en su campo "en" (data/points.js y data/tours.js). Lo que todavía no
// esté traducido sale en español. El tono del inglés, pedido de Juan: de guía local, pero
// siempre corporativo.
export const IDIOMAS = ["en", "es"];
let idioma = "en";
try {
  const guardado = localStorage.getItem("hey-idioma");
  if (IDIOMAS.includes(guardado)) idioma = guardado;
} catch { /* sin almacenamiento (ej. ventana privada): queda en inglés */ }
// El idioma es estado de este módulo: afuera se lee con getIdioma() y se cambia con
// setIdioma() (lo hace el botón EN/ES en app.js). enIngles() es el atajo más usado.
export const getIdioma = () => idioma;
export function setIdioma(nuevo) { if (IDIOMAS.includes(nuevo)) idioma = nuevo; }
export const enIngles = () => idioma === "en";

const DIAS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const ETAPAS_EN = { baja: "low", media: "mid", alta: "high" };

// Cada texto es [español, inglés]. Los que llevan datos adentro (una hora, un nombre) son
// funciones. Se piden con txt("clave", ...datos).
const TEXTOS = {
  titulo:           ["Hey You ST · Guía local de Santa Teresa", "Hey You ST · Santa Teresa Local Guide"],
  subtitulo:        ["Península de Nicoya · Santa Teresa", "Nicoya Peninsula · Santa Teresa"],
  terrenoTitulo:    ["Ver el terreno en 3D", "View the terrain in 3D"],
  explorar:         ["Explorá el mapa", "Explore the map"],
  categoriasToggle: ["Mostrar u ocultar las categorías", "Show or hide the categories"],
  conteo:           [n => n === 1 ? "1 lugar en el mapa" : `${n} lugares en el mapa`,
                     n => n === 1 ? "1 place on the map" : `${n} places on the map`],
  cerrar:           ["Cerrar", "Close"],
  bajarFicha:       ["Bajar la ficha para ver el mapa", "Lower the panel to see the map"],
  subirFicha:       ["Subir la ficha", "Raise the panel"],
  coordsAyuda:      ["Hacé clic en el mapa para ver las coordenadas de un punto", "Click the map to see a point's coordinates"],
  copiar:           ["Copiar", "Copy"],
  copiado:          ["¡Copiado!", "Copied!"],
  copiarAMano:      ["Seleccioná y copiá", "Select and copy"],

  // Ficha del lugar
  textoGeneral:     ["Conocé este lugar con la guía local.", "Discover this place with our local guide."],
  comoLlegar:       ["Cómo llegar", "Directions"],
  ver360:           ["Ver foto 360°", "View 360° photo"],
  credito3d:        ["Vista 3D · Esri · AWS Terrain", "3D view · Esri · AWS Terrain"],
  seccionesDe:      [n => `Secciones de ${n}`, n => `Sections of ${n}`],
  tituloSeccion:    [(cat, n) => `${cat.label} en ${n}`, (cat, n) => `${cat.enSeccion || cat.en} at ${n}`],

  // Meet a local
  reservasPronto:   ["Reservas por WhatsApp muy pronto", "WhatsApp booking coming soon"],
  precioAConfirmar: ["Precio según la fecha y el grupo: te lo confirmamos por WhatsApp.",
                     "Pricing depends on the date and the size of your group. We will confirm it on WhatsApp."],
  mensajeTour:      [(quien, titulo) => `Hola ${quien} 👋 Vi en Hey You ST "${titulo}" y me interesa. Somos ___ personas y nos gustaría ir el ___.`,
                     (quien, titulo) => `Hi ${quien} 👋 I saw "${titulo}" on Hey You ST and I'm interested. We are ___ people and we'd like to go on ___.`],
  botonTour:        [quien => `Me interesa: escribile a ${quien}`, quien => `I'm interested: message ${quien}`],

  // Las líneas de la mejor hora de hoy y mañana
  mejorHoy:         [para => `Mejor hora para ${para} hoy`, para => `Best time to ${para} today`],
  mejorManana:      [para => `Mejor hora para ${para} mañana`, para => `Best time to ${para} tomorrow`],
  paraDefecto:      ["ir", "go"],
  ahoraHasta:       [h => `ahora, hasta las ${h}`, h => `now, until ${h}`],
  y:                [" y ", " and "],
  sinVentana:       ["ninguna buena", "no good window"],
  proximaBuena:     [dia => `Próxima buena hora: ${dia}`, dia => `Next good time: ${dia}`],
  mareaDeSurf:      [etapas => `Marea ${etapas}`, etapas => `${etapas.replace(/^./, c => c.toUpperCase())} tide`],
  alEmpezarA:       [marea => `Cuando la marea empieza a ${marea === "alta" ? "bajar" : "subir"}`,
                     marea => `As the tide starts to ${marea === "alta" ? "drop" : "rise"}`],
  conMarea:         [marea => `Con marea ${marea}`, marea => `With ${ETAPAS_EN[marea]} tide`],
  datosMarea:       ["Datos de marea", "Tide data"],

  // La curva de la marea
  mareaEn:          [n => `🌊 La marea en ${n}`, n => `🌊 The tide at ${n}`],
  dia:              ["Día", "Day"],
  hoy:              ["Hoy", "Today"],
  manana:           ["Mañana", "Tomorrow"],
  dias:             [DIAS_ES, DIAS_EN],
  curvaAria:        ["Curva de la marea del día", "Tide curve for the day"],
  horaDelDia:       ["Hora del día", "Time of day"],
  ahora:            ["Ahora", "Now"],
  fuentesMarea:     ["Marea", "Tide"],
  solAproximado:    ["amanecer y atardecer aproximados", "approximate sunrise and sunset"],
  yaPaso:           ["(ya pasó)", "(past)"],
  horasSurf:        [h => `Horas buenas para surfear: ${h}`, h => `Good hours to surf: ${h}`],
  ningunaEsteDia:   ["ninguna este día", "none this day"],
  noTanBuenas:      [h => `No tan buenas: ${h}`, h => `Not as good: ${h}`],
  mejorHoraPara:    [(para, h) => `Mejor hora para ${para}: ${h}`, (para, h) => `Best time to ${para}: ${h}`],
  sinHoraIdeal:     [para => `Este día no hay una hora ideal para ${para}`, para => `No ideal time to ${para} this day`],
  extremo:          [(tipo, h) => `${tipo === "alta" ? "Alta" : "Baja"} ${h}`, (tipo, h) => `${tipo === "alta" ? "High" : "Low"} ${h}`],
  nivel:            [n => `Nivel ${n}%`, n => `Level ${n}%`],
  picoA:            [(tipo, h) => `${tipo === "alta" ? "La más alta" : "La más baja"} a las ${h}`,
                     (tipo, h) => `${tipo === "alta" ? "High" : "Low"} tide at ${h}`],
  haciaA:           [(tipo, h) => `${tipo === "alta" ? "Sube hasta las" : "Baja hasta las"} ${h}`,
                     (tipo, h) => `${tipo === "alta" ? "Rising until" : "Falling until"} ${h}`],
  diaSiguiente:     [" del día siguiente", " the next day"],
  mareaTipo:        [tipo => `Marea ${tipo}`, tipo => `${tipo === "alta" ? "High" : "Low"} tide`],
  subiendo:         ["Subiendo", "Rising"],
  bajando:          ["Bajando", "Falling"],
  surfAhora:        ["Ahora mismo, para surfear", "Right now, for surfing"],
  surfAEsaHora:     ["A esa hora, para surfear", "At that time, for surfing"],
  olaGusta:         [etapas => `Esta ola trabaja mejor con marea ${etapas}.`, etapas => `This wave works best on a ${etapas} tide.`],
  horaBuena:        [etapa => `Hora buena: marea ${etapa}.`, etapa => `Good time: ${ETAPAS_EN[etapa]} tide.`],
  horaNoTan:        [etapa => `No tan buena: marea ${etapa}.`, etapa => `Not as good: ${ETAPAS_EN[etapa]} tide.`],
  deNoche:          ["Es de noche.", "It's dark at that hour."],
  // "a.m." / "p.m." ya cierra con punto
  proximaHoraBuena: [(dia, h) => ` La próxima hora buena empieza ${dia ? `el ${dia.toLowerCase()} ` : ""}a las ${h}`,
                     (dia, h) => ` The next good window starts ${dia ? `on ${dia} ` : ""}at ${h}`],
  guilleAhora:      ["Ahora mismo, según Guille", "Right now, according to Guille"],
  guilleAEsaHora:   ["A esa hora, según Guille", "At that time, according to Guille"],
  guilleViene:      ["Lo que viene, según Guille", "What's coming, according to Guille"],
  guilleConMarea:   [marea => `Con marea ${marea}, según Guille`, marea => `At ${ETAPAS_EN[marea]} tide, according to Guille`],

  // Foto 360°
  pistaTactil:      ["Deslizá a la izquierda o a la derecha para ir a otra playa", "Swipe left or right to visit another beach"],
  pistaTeclado:     ["Usá las flechas ← → del teclado para ir a otra playa", "Use the ← → arrow keys to visit another beach"],
  volverFicha:      ["Volver a la ficha", "Back to the details"],
  credito360:       ["Foto 360° · tomada por un local", "360° photo · taken by a local"],
  giroActivo:       ["📱 Siguiendo tu teléfono · tocá para soltar", "📱 Following your phone · tap to release"],
  giroInactivo:     ["📱 Mirá alrededor moviendo el teléfono", "📱 Move your phone to look around"],

  // Itinerary laboratory (Juan, 24-oct: el botón se llama así, y arma el itinerario al instante)
  propuestaBoton:   ["🧪 Laboratorio de itinerarios", "🧪 Itinerary laboratory"],
  pgTitulo:         ["🧪 Laboratorio de itinerarios", "🧪 Itinerary laboratory"],
  pgIntro:          ["Contanos cuántos son, su presupuesto y sus días, y te armamos un itinerario al instante. Elegís las actividades de cada día y, si te gusta, lo confirmás por WhatsApp con un local.",
                     "Tell us how many you are, your budget and your days, and we'll build your itinerary right away. Pick the activities for each day and, if you like it, confirm it on WhatsApp with a local."],
  pgDemo:           ["Modo demo: empresas de ejemplo, no son tours reales.", "Demo mode: example companies, not real tours."],
  pgArmar:          ["🧪 Armámelo al instante", "🧪 Build it for me"],
  pgArmarYo:        ["🛠️ Lo armo yo", "🛠️ I'll build it myself"],
  // Lo arma el cliente: elige día por día entre lo disponible
  abTitulo:         ["🛠️ Armá tu itinerario", "🛠️ Build your itinerary"],
  porPersonaLab:    ["por persona", "per person"],
  abUsado:          [p => `Usaste el ${p} % de tu presupuesto`, p => `You've used ${p}% of your budget`],
  abTeQuedan:       [(q, b) => `Te quedan ${q} por persona de tu presupuesto de ${b}.`, (q, b) => `${q} per person left of your ${b} budget.`],
  abTePasas:        [(q, b) => `Te pasás por ${q} por persona de tu presupuesto de ${b}.`, (q, b) => `${q} per person over your ${b} budget.`],
  abSinPresupuesto: ["Sin presupuesto: es lo que lleva tu itinerario. Si querés ver cuánto te queda, volvé y poné uno.",
                     "No budget set: this is what your itinerary adds up to. Go back and add one to see what's left."],
  abMasBarato:      [k => `Con ${k} actividades, cada una sale más barata.`, k => `With ${k} activities, each one costs less.`],
  abDia:            [d => `Día ${d}`, d => `Day ${d}`],
  abEligiendo:      ["Eligiendo para este día ↓", "Choosing for this day ↓"],
  abAgregarDia:     ["+ Agregar a este día", "+ Add to this day"],
  abDiaCompleto:    ["Día lleno", "Day is full"],
  abLibre:          ["Libre", "Free"],
  libreGratis:      ["🆓 Día libre · lugares gratis para conocer", "🆓 Free day · free places to explore"],
  abQuitar:         [n => `Quitar ${n}`, n => `Remove ${n}`],
  abDisponible:     [(d, f) => `Disponible para el día ${d}${f}`, (d, f) => `Available for day ${d}${f}`],
  abDiaLleno:       ["Ese día ya está lleno: elegí otro día arriba.", "That day is full: pick another day above."],
  abNada:           ["No queda nada disponible para ese día.", "Nothing else is available that day."],
  abDiaEntero:      ["todo el día", "full day"],
  abLeGusta:        ["te gusta", "you like it"],
  abAgregar:        ["Agregar", "Add"],
  abNoEntra:        ["No entra en tu presupuesto", "Doesn't fit your budget"],
  abSinLugar:       [c => `${c === 1 ? "1 tour no tiene" : c + " tours no tienen"} lugar ese día para tu grupo.`, c => `${c === 1 ? "1 tour has" : c + " tours have"} no spots that day for your group.`],
  abVer:            ["Ver mi itinerario", "See my itinerary"],
  abVolver:         ["← Volver", "← Back"],
  // Transporte rentado (carro, cuadra o traslado)
  pgTransporte:     ["🚙 Transporte (opcional)", "🚙 Transport (optional)"],
  pgSinTransporte:  ["Sin transporte", "No transport"],
  pgVuelta:         ["Ida y vuelta", "Round trip"],
  trDias:           [d => `${d} ${d === 1 ? "día" : "días"}`, d => `${d} ${d === 1 ? "day" : "days"}`],
  trIda:            ["solo ida", "one way"],
  trIdaVuelta:      ["ida y vuelta", "round trip"],
  abTransporte:     ["Tu transporte", "Your transport"],
  pgTransporteCaro: ["El transporte se lleva todo el presupuesto: probá con otro transporte o con más presupuesto.",
                     "Transport takes up the whole budget: try another option or a higher budget."],
  pgQuiereTransporte: [x => `Transporte: ${x}.`, x => `Transport: ${x}.`],
  // Probá el precio de un tour
  pgProbar:         ["🧮 Probá el precio de un tour", "🧮 Try a tour's price"],
  ppTitulo:         ["🧮 Probá el precio de un tour", "🧮 Try a tour's price"],
  ppIntro:          ["Elegí un tour y cambiá cuántos son: entre más personas, más barato le sale a cada una.",
                     "Pick a tour and change how many you are: the bigger the group, the less each person pays."],
  ppTour:           ["Tour", "Tour"],
  ppTotal:          [t => `${t} en total`, t => `${t} in total`],
  ppNoSale:         [n => `Este tour no sale para ${n} ${n === 1 ? "persona" : "personas"}: probá con otro número.`,
                     n => `This tour isn't available for ${n} ${n === 1 ? "person" : "people"}: try another number.`],
  ppPaquete:        [(k, p) => `En un paquete de ${k} tours, cada persona paga ${p} por este.`, (k, p) => `In a package of ${k} tours, each person pays ${p} for this one.`],
  ppComo:           ["Así cambia según cuántos son", "How it changes with your group size"],
  ppFila:           [n => `${n} ${n === 1 ? "persona" : "personas"}`, n => `${n} ${n === 1 ? "person" : "people"}`],
  ppBaja:           ["baja", "cheaper"],
  ppArmar:          ["🛠️ Armar mi itinerario con este tour", "🛠️ Build my itinerary with this tour"],
  // Más budget, más actividades: la barra del budget
  pgBarra:          ["💸 Mové la barra del budget", "💸 Slide your budget"],
  bbTitulo:         ["💸 Más budget, más actividades", "💸 More budget, more activities"],
  bbIntro:          ["Mové la barra: entre más budget por persona, más actividades entran. Cada día elegís una de las opciones, todas al mismo precio.",
                     "Slide the bar: the higher your budget per person, the more activities fit. Each day, pick one of the options, all at the same price."],
  bbPresupuesto:    ["Budget por persona", "Budget per person"],
  bbMarca:          [(k, m) => `${k} ${k === 1 ? "actividad" : "actividades"} desde ${m}`, (k, m) => `${k} ${k === 1 ? "activity" : "activities"} from ${m}`],
  bbCuantas:        [(k, d) => `${k === 1 ? "actividad" : "actividades"} en ${d} ${d === 1 ? "día" : "días"}`, (k, d) => `${k === 1 ? "activity" : "activities"} in ${d} ${d === 1 ? "day" : "days"}`],
  bbPaquete:        [p => `Tu paquete: ${p} por persona, elijas lo que elijas.`, p => `Your package: ${p} per person, whatever you pick.`],
  bbSobra:          [s => `Te sobran ${s} por persona para sumar algo con un local.`, s => `You have ${s} per person left to add something with a local.`],
  bbOtra:           [(f, k) => `Con ${f} más por persona, entran ${k} actividades.`, (f, k) => `With ${f} more per person, ${k} activities fit.`],
  bbTodo:           ["Es lo más que arma el laboratorio para estos días.", "That's the most the laboratory builds for these days."],
  bbActividad:      [i => `Actividad ${i}`, i => `Activity ${i}`],
  bbElegi:          [c => `Elegí 1 de ${c}`, c => `Pick 1 of ${c}`],
  bbIntroUna:       ["Elegí una actividad dentro de tu budget: cada una dice lo que paga cada persona. Entre más personas, más barato.",
                     "Pick one activity within your budget: each one shows what each person pays. The bigger the group, the lower the price."],
  bbModo:           ["¿Cuántas actividades?", "How many activities?"],
  bbModoTodas:      ["Las que entren", "As many as fit"],
  bbModoUna:        ["Solo 1", "Just 1"],
  bbMarcaUna:       [(k, m) => `${k} ${k === 1 ? "opción" : "opciones"} desde ${m}`, (k, m) => `${k} ${k === 1 ? "option" : "options"} from ${m}`],
  bbOpcionesUna:    [k => `${k === 1 ? "opción" : "opciones"} para tu actividad`, k => `${k === 1 ? "option" : "options"} for your activity`],
  bbUnaPrecio:      [(a, p, t) => `${a}: ${p} por persona, ${t} en total.`, (a, p, t) => `${a}: ${p} per person, ${t} in total.`],
  bbOtraOpcion:     [f => `Con ${f} más por persona, se suma otra opción.`, f => `With ${f} more per person, another option opens up.`],
  bbTodasOpciones:  ["Ya ves todas las opciones.", "You're seeing every option."],
  bbSiFueran:       [(n, p) => `👥 Si fueran ${n}, saldría a ${p} por persona: entre más personas, más barato.`, (n, p) => `👥 With ${n} people, it would be ${p} per person: the bigger the group, the lower the price.`],
  bbLibres:         [n => `🆓 + ${n} ${n === 1 ? "día libre" : "días libres"} con lugares gratis para conocer`, n => `🆓 + ${n} free ${n === 1 ? "day" : "days"} with free places to explore`],
  bbTuItinerario:   ["Tu itinerario", "Your itinerary"],
  bbSinLugar:       ["Para tu grupo no hay actividades con lugar en esos días. Probá con otros días o pedíselo a un local.",
                     "There are no activities with spots for your group on those days. Try other days or ask a local."],
  // El plan de cada día
  pgPlanes:        ["Tu plan para cada día (opcional)", "Your plan for each day (optional)"],
  pgPlanDe:         [d => `Plan del día ${d}`, d => `Plan for day ${d}`],
  planCualquiera:   ["✨ Lo que me recomienden", "✨ Surprise me"],
  planLibre:        ["😌 Día libre", "😌 Free day"],
  pgTodoLibre:      ["Marcaste todos los días como libres: no hay tours que armar. Cambiá algún día, o pedile ideas a un local.",
                     "You marked every day as free: there are no tours to plan. Change a day, or ask a local for ideas."],
  pgQuierePlanes:   [x => `Plan por día: ${x}.`, x => `Plan for each day: ${x}.`],
  abPlan:           [p => `Plan: ${p}`, p => `Plan: ${p}`],
  abVaConTuPlan:    ["va con tu plan del día", "fits your plan for the day"],
  pgSinPresupuesto: ["Poné tu presupuesto por persona para armarlo.", "Add your budget per person to build it."],
  pgNoEntra:        [(n, b) => `Con ${b} por persona no llegamos a armar algo para ${n}. Probá con más presupuesto o menos días, o pedíselo a un local.`,
                     (n, b) => `With ${b} per person we can't put something together for ${n} yet. Try a higher budget or fewer days, or ask a local.`],
  pgSinTours:       ["Todavía estamos sumando tours al laboratorio. Pedile tu itinerario a un local: es gratis.",
                     "We're still adding tours to the laboratory. Ask a local for your itinerary: it's free."],
  pgPersonas:       ["¿Cuántos son?", "How many of you?"],
  pgPresupuesto:    ["Presupuesto por persona (USD)", "Budget per person (USD)"],
  pgDias:           ["¿Cuántos días?", "How many days?"],
  pgDesde:          ["Desde (opcional)", "Starting (optional)"],
  pgGustos:         ["¿Qué les gusta?", "What do you like?"],
  pgNota:           ["¿Algo más? (opcional)", "Anything else? (optional)"],
  pgNotaPista:      ["Edades de los niños, si alguien no nada…", "Kids' ages, if someone can't swim…"],
  pgMenos:          [q => `Uno menos: ${q}`, q => `One less: ${q}`],
  pgMas:            [q => `Uno más: ${q}`, q => `One more: ${q}`],
  pgEnviar:         ["Prefiero que me lo arme un local", "I'd rather have a local plan it"],
  pgLetraChica:     ["Gratis y sin compromiso. Precios por persona, todo incluido; la disponibilidad se confirma por WhatsApp. Esta página no guarda tus datos.",
                     "Free, no strings attached. Prices per person, all included; availability is confirmed on WhatsApp. This page doesn't store your details."],
  pgMensaje:        [({ n, pp, d, desde, gustos, nota }) => `Hola Juan 👋 Vi en Hey You ST el laboratorio de itinerarios. Somos ${n}${pp ? `, tenemos unos $${pp} por persona` : ""} y estamos ${d} ${d === 1 ? "día" : "días"}${desde ? ` desde el ${desde}` : ""}.` +
                       (gustos.length ? `\nNos gusta: ${gustos.join(", ")}.` : "") + (nota ? `\n${nota}` : "") + "\n¿Nos armás una propuesta?",
                     ({ n, pp, d, desde, gustos, nota }) => `Hi Juan 👋 I saw the itinerary laboratory on Hey You ST. We are ${n}${pp ? `, we have about $${pp} per person` : ""} and we're here for ${d} ${d === 1 ? "day" : "days"}${desde ? ` from ${desde}` : ""}.` +
                       (gustos.length ? `\nWe like: ${gustos.join(", ")}.` : "") + (nota ? `\n${nota}` : "") + "\nCould you put together a plan for us?"],
};

export function txt(clave, ...datos) {
  const v = TEXTOS[clave][enIngles() ? 1 : 0];
  return typeof v === "function" ? v(...datos) : v;
}

// Un lugar o un tour con sus textos en el idioma elegido: lo que trae en "en" reemplaza al
// español, y lo que todavía no está traducido queda en español
export function traducido(x) {
  if (!enIngles() || !x.en) return x;
  const out = { ...x, ...x.en };
  if (x.porCategoria) out.porCategoria = { ...x.porCategoria, ...x.en.porCategoria };
  if (x.mareas) out.mareas = { ...x.mareas, ...x.en.mareas };
  return out;
}
