/* =========================================================
   Hey You ST · Utilidades sueltas
   Helpers puros sin estado, usados por varios módulos.
   ========================================================= */

// Escapa texto para meterlo en HTML sin riesgo
export function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Un monto en dólares, con centavos solo si los tiene ("$75", "$74.50")
export const usd = (n) => { const v = Math.round((Number(n) || 0) * 100) / 100; return "$" + v.toLocaleString("en-US", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };

// La primera frase de un texto (hasta el primer . ! o ?), para los resúmenes cortos
export const primeraFrase = (s) => { const m = String(s || "").match(/^.*?[.!?](\s|$)/); return (m ? m[0] : String(s || "")).trim(); };
