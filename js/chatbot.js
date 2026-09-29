/* =========================================================
   Chatbot experimental — prototipo desechable (ver CLAUDE.md).
   No es el "local buddy" real del proyecto: es solo para probar
   la sensación de preguntas y respuestas sobre el mapa.
   Requiere scripts/chat-server.js corriendo en localhost:8787.
   ========================================================= */

const CHAT_SERVIDOR = "http://localhost:8787/preguntar";

const chatToggle = document.getElementById("chatbot-toggle");
const chatPanel = document.getElementById("chatbot-panel");
const chatMensajes = document.getElementById("chatbot-mensajes");
const chatForm = document.getElementById("chatbot-form");
const chatInput = document.getElementById("chatbot-input");
const charlaEl = document.getElementById("charla");

// En celular, enfocar el campo después de cada respuesta abre el teclado y tapa lo que
// el local acaba de decir: ahí solo se enfoca cuando la persona toca el campo.
const pantallaTactil = window.matchMedia("(pointer: coarse)");

// Historial de la conversación (solo en memoria del navegador — se pierde al recargar).
// Hace falta mandarlo completo en cada pregunta para que el bot pueda "acordarse"
// de lo que ya preguntó y seguir el hilo (ej: preguntó "¿caminata o pesca?" y el
// visitante responde "pesca").
const historial = [];

chatToggle.addEventListener("click", () => {
  chatPanel.hidden = !chatPanel.hidden;
  if (chatPanel.hidden) return;
  // Si la charla venía de la ficha de un lugar, se abre en lo último que se habló
  chatMensajes.scrollTop = chatMensajes.scrollHeight;
  chatInput.focus();
});

document.getElementById("chatbot-close").addEventListener("click", () => {
  chatPanel.hidden = true;
});

// ¿La charla está en su ventanita (y no en la ficha de un lugar)?
const charlaEnCasa = () => chatPanel.contains(charlaEl);

// Deja a la vista lo último que llegó. En la ventanita se baja su propia lista; en la
// ficha se mueve la ficha entera, y "nearest" hace que una respuesta larga quede a la
// vista desde su primera línea en vez de saltar directo al final.
function mostrar(el) {
  if (charlaEnCasa()) chatMensajes.scrollTop = chatMensajes.scrollHeight;
  else el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function agregarMensaje(texto, clase) {
  const div = document.createElement("div");
  div.className = `chatbot-msg ${clase}`;
  div.textContent = texto;
  chatMensajes.appendChild(div);
  mostrar(div);
  return div;
}

// Botones de opciones (como cuando a vos te dan algo para elegir en vez de escribir).
// Al tocar uno se manda como si la persona lo hubiera tecleado, y se sacan los botones
// para que no queden viejas opciones dando vueltas en la conversación.
function agregarOpciones(opciones) {
  if (!opciones || !opciones.length) return;
  const cont = document.createElement("div");
  cont.className = "chatbot-opciones";
  for (const op of opciones) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chatbot-opcion";
    btn.textContent = op;
    btn.addEventListener("click", () => {
      cont.remove();
      mandarPregunta(op);
    });
    cont.appendChild(btn);
  }
  chatMensajes.appendChild(cont);
  mostrar(cont);
}

// La pregunta que se está contestando y las que tocaron desde el mapa mientras tanto:
// se mandan en orden apenas termina la anterior, así ningún toque abre el chat sin
// enviar ni se pierde una respuesta.
let enCurso = null;
const enFila = [];

// El visitante ve solo su pregunta; al bot le llega además desde qué lugar y sección del
// mapa la tocó (el bot no ve el mapa). La marca [Desde el mapa] la lee cerebro-local.js.
function conContexto(pregunta, { lugar, seccion }) {
  return `${pregunta}\n\n[Desde el mapa: el visitante tocó esta pregunta en la sección "${seccion}" de ${lugar}.]`;
}

async function mandarPregunta(pregunta, contexto) {
  enCurso = pregunta;
  agregarMensaje(pregunta, "user");
  historial.push({ role: "user", content: contexto ? conContexto(pregunta, contexto) : pregunta });
  chatInput.disabled = true;
  const pensando = agregarMensaje("Pensando...", "bot pensando");

  try {
    let res, data;
    for (let intento = 0; ; intento++) {
      try {
        res = await fetch(CHAT_SERVIDOR, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historial }),
        });
      } catch {
        // En la compu de Juan el servidor de prueba corre aparte; en la página publicada
        // (GitHub Pages) todavía no hay servidor, así que avisamos sin tecnicismos.
        const enLaCompu = ["localhost", "127.0.0.1"].includes(location.hostname) || location.hostname.startsWith("192.168.");
        throw new Error(enLaCompu
          ? "No pude conectarme al servidor de prueba. ¿Está corriendo `node scripts/chat-server.js`?"
          : "El chat con el local todavía está en pruebas y por ahora no responde desde esta página. ¡Muy pronto!");
      }
      data = await res.json();
      // Límite gratis de Groq: esperamos lo que pide y reintentamos solos (hasta 2 veces),
      // así el visitante no pierde la respuesta ni tiene que volver a preguntar.
      if (res.status === 429 && intento < 2 && data.espera <= 60) {
        pensando.textContent = "Un momento...";
        await new Promise(r => setTimeout(r, (data.espera + 1) * 1000));
        continue;
      }
      break;
    }
    pensando.remove();
    if (!res.ok) throw new Error(data.error || "No pude responder esa pregunta. Probá de nuevo.");
    agregarMensaje(data.mensaje, "bot");
    agregarOpciones(data.opciones);
    historial.push({ role: "assistant", content: data.mensaje });
  } catch (err) {
    pensando.remove();
    historial.pop(); // no dejamos la pregunta del usuario "colgada" sin respuesta en el historial
    agregarMensaje(err.message, "error");
  } finally {
    enCurso = null;
    chatInput.disabled = false;
    if (!pantallaTactil.matches) chatInput.focus({ preventScroll: true });
    const siguiente = enFila.shift();
    if (siguiente) {
      document.querySelectorAll(".chatbot-opciones").forEach(el => el.remove());
      mandarPregunta(siguiente.pregunta, siguiente.contexto);
    }
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const pregunta = chatInput.value.trim();
  if (!pregunta) return;
  chatInput.value = "";
  // Si había opciones sin tocar de un turno anterior, las quitamos: la persona
  // prefirió escribir su propia respuesta.
  document.querySelectorAll(".chatbot-opciones").forEach(el => el.remove());
  mandarPregunta(pregunta);
});

// La charla es una sola pieza que se muda (pedido de Juan, 29-sep): vive en la ventanita
// del botón 💬 y, cuando la persona toca la pregunta de un lugar, se despliega en la ficha
// en lugar del texto. Es la misma conversación en los dos lados, así el local no pierde
// el hilo. js/app.js la trae a la ficha y la devuelve antes de rehacer el panel.
window.charlaEnFicha = (contenedor) => {
  chatPanel.hidden = true;
  contenedor.appendChild(charlaEl);
};
window.charlaACasa = () => {
  if (!charlaEnCasa()) chatPanel.appendChild(charlaEl);
};

// Puerta de entrada desde el mapa: un toque en la pregunta de un lugar manda la pregunta
// como si la persona la hubiera escrito. "contexto" = { lugar, seccion }.
window.preguntarAlBot = (pregunta, contexto) => {
  if (charlaEnCasa()) chatPanel.hidden = false;
  // Un doble toque no manda dos veces la misma pregunta
  if (pregunta === enCurso || enFila.some(f => f.pregunta === pregunta)) return;
  // Si todavía está contestando otra, esta queda en fila y sale apenas termine
  if (chatInput.disabled) { enFila.push({ pregunta, contexto }); return; }
  document.querySelectorAll(".chatbot-opciones").forEach(el => el.remove());
  mandarPregunta(pregunta, contexto);
};
