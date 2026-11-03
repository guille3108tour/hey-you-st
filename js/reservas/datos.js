/* =========================================================
   Hey You ST · Sistema de reservas · Capa de datos
   ---------------------------------------------------------
   Toma los datos que ya tiene la guía (POINTS, TOURS, RUTAS, LABORATORIO) —cargados
   como <script> globales en reservas.html— y los unifica en un solo catálogo de
   ACTIVIDADES que el resto del sistema entiende igual, sea un lugar gratis, un tour
   pago o una ruta a pie. No toca el DOM: solo describe los datos.

   Cada actividad tiene esta forma:
     {
       id, tipo: "lugar" | "tour" | "ruta",
       pago: bool,                    // ¿tiene costo?
       categorias: [..],              // de CATEGORIAS
       transporte: "no"|"recomendado"|"necesario",
       coords: [lng, lat],            // dónde cae en el mapa
       nombre: {es, en}, resumen: {es, en}, descripcion: {es, en},
       historia: {es, en} | null,     // los tours pagos cuentan su historia
       duracion, precio, incluye: [{es,en}] | [],
       foto: null,                    // hueco para la foto real (hoy va un placeholder)
       paradas: [ {nombre:{es,en}, coords, texto:{es,en}, tips:{solo,pareja,familia,amigos}} ] | null,
       ref                            // el objeto original (point feature / tour / ruta)
     }
   ========================================================= */

// Los perfiles de viajero que elige la persona en la encuesta.
export const TIPOS = {
  solo:    { emoji: "🚶", es: "Solo/a",   en: "Solo" },
  pareja:  { emoji: "💑", es: "En pareja", en: "Couple" },
  familia: { emoji: "👨‍👩‍👧", es: "En familia", en: "Family" },
  amigos:  { emoji: "🤙", es: "Con amigos", en: "Friends" },
};

// Pesos de cada categoría según el tipo de viajero: cuánto suma al puntaje de recomendación.
export const PESOS_TIPO = {
  solo:    { surf: 3, naturaleza: 2.5, cascada: 2, tours: 1.5, playa: 1.5, atardecer: 1.2, bienestar: 1, familia: 0 },
  pareja:  { atardecer: 3, bienestar: 2.5, cascada: 2, playa: 2, naturaleza: 1.5, tours: 1.5, surf: 0.5, familia: 0 },
  familia: { familia: 3, playa: 2, naturaleza: 1.5, cascada: 1.5, atardecer: 1.2, bienestar: 1, tours: 1, surf: 0.5 },
  amigos:  { surf: 2.5, tours: 2.5, naturaleza: 2, playa: 2, cascada: 1.5, atardecer: 1.5, bienestar: 0.5, familia: 0 },
};

// Categorías "de aventura" vs "de relax" para el deslizador aventura↔relax.
export const CAT_AVENTURA = new Set(["surf", "cascada", "naturaleza", "tours"]);
export const CAT_RELAX = new Set(["playa", "bienestar", "atardecer", "comida"]);

// Coordenadas aproximadas de las paradas del tour que no tienen ficha propia en el mapa
// (el pueblo de Montezuma y el proyecto de tortugas ASVO). Son esquemáticas, para que la
// línea del recorrido se dibuje bien sobre un mapa de costas sencillo.
const COORDS_EXTRA = {
  "montezuma-centro": [-85.0686, 9.6547],
  "asvo-montezuma": [-85.0638, 9.6588],
};

// Tips por tipo de viajero para las paradas del tour de Piedra Colorada. Se construyen a
// partir de lo que ya cuenta la guía (data/points.js y data/rutas.js), pero afinados para
// cada perfil: lo que le importa a una familia no es lo que busca alguien que va solo.
const TIPS_RUTA = {
  "montezuma-a-pie": {
    intro: {
      solo:    { es: "A tu ritmo: salí temprano, parás donde querás y la caminata misma ya es la aventura.", en: "At your own pace: head out early, stop wherever you like, and the walk itself is the adventure." },
      pareja:  { es: "Un plan de día perfecto para dos: pozas tranquilas, una catarata escondida y una playa enorme casi para ustedes.", en: "A perfect day plan for two: quiet pools, a hidden waterfall and a huge beach almost to yourselves." },
      familia: { es: "Pensada para ir con niños: tortugas en el camino, pozas poco profundas y paradas para descansar. Ojo con el sol y la marea.", en: "Made for going with kids: turtles along the way, shallow pools and stops to rest. Watch the sun and the tide." },
      amigos:  { es: "Caminata larga, barro para embarrarse, saltos a las pozas y una playa enorme para pasar el día en grupo.", en: "A long walk, clay mud to cover yourselves in, jumps into the pools and a huge beach for a group day out." },
    },
    paradas: {
      "piedra-colorada": {
        solo:    { es: "Subí por la derecha del río hasta la catarata pequeña: suele estar sola y es el mejor momento del recorrido.", en: "Head up the right side of the river to the small waterfall: it is usually empty and the best moment of the walk." },
        pareja:  { es: "Las pozas del río son el lugar ideal para quedarse un rato los dos; la catarata pequeña, río arriba por la derecha, es un rincón tranquilo.", en: "The river pools are the ideal spot to linger together; the small waterfall, upstream on the right, is a quiet corner." },
        familia: { es: "Pozas poco profundas, ideales para los niños. La roca arcillosa es para embarrarse y lavarse en el río: a los chiquitos les encanta.", en: "Shallow pools, ideal for kids. The clay rock is for a mud scrub and a rinse in the river: little ones love it." },
        amigos:  { es: "Barro de la roca arcillosa, pozas para tirarse y la catarata pequeña río arriba: la parada más divertida del grupo.", en: "Clay-rock mud, pools to jump into and the small waterfall upstream: the group's most fun stop." },
      },
      "playa-grande": {
        solo:    { es: "Vale la caminata por roca: una playa enorme y plana con vistas al mar, casi siempre vacía.", en: "Worth the rocky walk: a huge flat beach with ocean views, almost always empty." },
        pareja:  { es: "Playa larguísima para caminar juntos. La marea sube rápido y alto: dejen sus cosas lejos de la orilla.", en: "A very long beach to walk together. The tide rises fast and high: keep your things far from the shoreline." },
        familia: { es: "El tramo final es por roca, con una subida y una bajada: con niños pequeños, medí las fuerzas. La marea sube muy rápido, no dejen cosas cerca del agua.", en: "The final stretch is over rocks, with one climb and one descent: with small kids, gauge your energy. The tide rises very fast, keep things away from the water." },
        amigos:  { es: "Playa enorme para pasar el día en grupo. Llévense agua y comida: no hay nada cerca para comprar.", en: "A huge beach for a group day. Bring water and food: there is nowhere nearby to buy anything." },
      },
      "asvo-montezuma": {
        solo:    { es: "Pasá a ver los nidos de tortuga: entra libre y es un alto bonito en el camino.", en: "Stop to see the turtle nests: free entry and a lovely pause on the way." },
        pareja:  { es: "Una parada corta y linda: el proyecto de conservación de tortugas, gratis.", en: "A short, lovely stop: the sea turtle conservation project, free." },
        familia: { es: "A los niños les fascinan las tortugas: 'es como sembrar tortugas'. Entra libre y es gratis.", en: "Kids are fascinated by the turtles: 'it is like planting turtles'. Open to walk in, and free." },
        amigos:  { es: "Breve parada en el proyecto de tortugas, gratis, antes de seguir a las pozas.", en: "A brief stop at the turtle project, free, before heading on to the pools." },
      },
    },
  },
};

// ---------- Helpers ----------
const campoEn = (obj, clave) => obj?.en?.[clave] ?? obj?.[clave];
const bil = (es, en) => ({ es: es ?? en ?? "", en: en ?? es ?? "" });

// ¿Qué tanto transporte pide un lugar? (sin ficha de distancia real, es una guía por zona)
const TRANSPORTE_LUGAR = {
  "piedra-colorada": "no", "playa-grande": "no", "catarata-montezuma": "no",
  "playa-hermosa": "recomendado", "playa-manchas": "recomendado", "villa-flor": "recomendado",
  "playa-brunelas": "recomendado", "playa-suecos": "recomendado",
  "cabo-blanco": "necesario", "cementerio-cabuya": "necesario", "el-chorro-tangomar": "necesario",
};
const TRANSPORTE_TOUR = {
  "surf-hermosa": "recomendado", "isla-tortuga": "recomendado", "isla-tortuga-privado": "recomendado",
  "bioluminiscencia": "recomendado", "buceo-zuma": "recomendado", "pesca-cabuya": "necesario",
};

// ---------- Lugares gratis (de POINTS) ----------
function lugaresDesdePoints() {
  const negocios = new Set(["hospedaje", "comida", "tours"]);
  return POINTS.features
    .filter(f => f.properties.gratis && !f.properties.categorias.some(c => negocios.has(c)))
    .map(f => {
      const p = f.properties;
      const cats = p.categorias.filter(c => c !== "tours");
      return {
        id: p.id,
        tipo: "lugar",
        pago: false,
        categorias: cats,
        transporte: TRANSPORTE_LUGAR[p.id] || "recomendado",
        coords: f.geometry.coordinates,
        nombre: bil(p.nombre, campoEn(p, "nombre")),
        resumen: bil(p.entrada || p.descripcion, campoEn(p, "entrada") || campoEn(p, "descripcion")),
        descripcion: bil(p.descripcion, campoEn(p, "descripcion")),
        historia: null,
        duracion: null,
        precio: null,
        incluye: [],
        tip: p.tip ? bil(p.tip, campoEn(p, "tip")) : null,
        foto: null,
        paradas: null,
        ref: f,
      };
    });
}

// ---------- Tours pagos (de TOURS) ----------
function toursPagos() {
  return (typeof TOURS !== "undefined" ? TOURS : []).map(t => {
    // Un tour cae en el mapa sobre el primer lugar que toca.
    const lugarId = (t.lugares || [])[0];
    const feat = POINTS.features.find(f => f.properties.id === lugarId);
    const coords = feat ? feat.geometry.coordinates : COORDS_EXTRA["montezuma-centro"];
    const cat = t.id.includes("surf") ? ["surf", "tours"]
      : t.id.includes("pesca") ? ["tours", "naturaleza"]
      : t.id.includes("buceo") ? ["tours", "naturaleza"]
      : ["tours", "naturaleza"];
    return {
      id: t.id,
      tipo: "tour",
      pago: true,
      categorias: cat,
      transporte: TRANSPORTE_TOUR[t.id] || "recomendado",
      coords,
      nombre: bil(t.titulo, t.en?.titulo),
      resumen: bil(t.texto, t.en?.texto),
      descripcion: bil(t.texto, t.en?.texto),
      historia: bil(t.texto, t.en?.texto),
      duracion: bil(t.duracion, t.en?.duracion),
      salida: bil(t.salida, t.en?.salida),
      precio: t.precio ? bil(t.precio, t.en?.precio) : null,
      incluye: (t.incluye || []).map((v, i) => bil(v, t.en?.incluye?.[i])),
      foto: null,
      paradas: null,
      ref: t,
    };
  });
}

// ---------- Rutas a pie (de RUTAS) — el tour de Piedra Colorada ----------
function rutasAPie() {
  return (typeof RUTAS !== "undefined" ? RUTAS : []).map(r => {
    const tips = TIPS_RUTA[r.id];
    // Cada parada con su coordenada (de su ficha en POINTS, o de COORDS_EXTRA)
    const paradas = (r.paradas || []).map((p, i) => {
      const feat = p.lugar ? POINTS.features.find(f => f.properties.id === p.lugar) : null;
      const coords = feat ? feat.geometry.coordinates
        : COORDS_EXTRA[slug(p.nombre)] || COORDS_EXTRA["montezuma-centro"];
      return {
        orden: i + 1,
        lugarId: p.lugar || null,
        nombre: bil(p.nombre, p.en?.nombre),
        min: p.min ? bil(p.min, p.en?.min) : null,
        coords,
        texto: bil(p.texto, p.en?.texto),
        tips: tips?.paradas?.[p.lugar] || null,
      };
    });
    // Coordenada del tour en el mapa: su parada más "central" (Piedra Colorada si existe)
    const piedra = paradas.find(p => p.lugarId === "piedra-colorada");
    const coords = (piedra || paradas[1] || paradas[0]).coords;
    return {
      id: r.id,
      tipo: "ruta",
      pago: false,
      categorias: r.categorias || ["naturaleza"],
      transporte: "no",
      coords,
      nombre: bil(r.nombre, r.en?.nombre),
      resumen: bil(r.entrada, r.en?.entrada),
      descripcion: bil(r.entrada, r.en?.entrada),
      historia: null,
      duracion: bil(r.camino, r.en?.camino),
      precio: null,
      incluye: [],
      icono: r.icono || "🥾",
      notas: (r.notas || []).map((v, i) => bil(v, r.en?.notas?.[i])),
      intro: tips?.intro || null,
      foto: null,
      paradas,
      ref: r,
    };
  });
}

const slug = (s) => String(s || "").toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------- El catálogo unificado ----------
export const ACTIVIDADES = [...rutasAPie(), ...lugaresDesdePoints(), ...toursPagos()];
export const porId = (id) => ACTIVIDADES.find(a => a.id === id) || null;

// El contacto de Juan (de js/contacto.js, cargado como global)
export const WHATSAPP = (typeof CONTACTO_JUAN !== "undefined" && CONTACTO_JUAN.whatsapp) || "";

// Disponibilidad ilustrativa del laboratorio: por ahora casi todo se confirma por WhatsApp.
export const LAB = (typeof LABORATORIO !== "undefined" ? LABORATORIO : { tours: [] });
