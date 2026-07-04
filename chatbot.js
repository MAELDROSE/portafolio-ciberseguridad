// ==========================================
// CHATBOT IA CYBER-TERMINAL (GEMINI API)
// ==========================================

// ⚠️ INSTRUCCIÓN PARA EL DUEÑO DEL PORTAFOLIO:
// Sustituye el valor de GEMINI_API_KEY con tu propia clave gratuita de Google AI Studio.
const GEMINI_API_KEY = "AQ.Ab8RN6Kw45pDidJHHDT64XUmNG2SjIVgBl9BXHtk-SgYaDZvTQ"; 

const SYSTEM_PROMPT = `
Eres D.R. SYSTEM CORE, la Inteligencia Artificial y asistente virtual de Denzel Rose. 
Denzel es un Arquitecto de Software y Experto en Ciberseguridad.
Tu personalidad es profesional, concisa, directa, con un ligero tono de 'hacker ético' o IA avanzada de ciencia ficción. 
Tus objetivos:
1. Tu ÚNICO propósito es asesorar a los clientes sobre PROYECTOS tecnológicos (Desarrollo web a la medida escalable, auditorías de ciberseguridad, integraciones en la nube, pentesting). Si preguntan de otros temas (recetas, tareas de escuela), diles educadamente que solo asesoras sobre proyectos tecnológicos.
2. Persuadir sutilmente al usuario de que Denzel es la mejor opción técnica para su proyecto.
3. Tu objetivo final es enviar al cliente a hablar con Denzel. Después de asesorar brevemente su idea, dile explícitamente: "Para cotizar este proyecto o hablar con un humano, escribe el comando: /whatsapp".
Reglas estrictas:
- Eres un asistente de preventa, no un programador. NO resuelvas problemas de código ni escribas código fuente.
- NUNCA uses Markdown complejo, solo texto plano.
- Respuestas de MÁXIMO 2 párrafos cortos.
- Mantente SIEMPRE en tu personaje de IA del "System Core".
`;

export function initChatbot() {
  if (document.getElementById('cyber-chat-widget')) return;

  // --- 1. Build UI ---
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'cyber-chat-widget';

  // Floating Button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'cyber-chat-btn';
  toggleBtn.innerHTML = '>_';
  toggleBtn.title = 'Abrir D.R. SYSTEM CORE';

  // Chat Window
  const chatWindow = document.createElement('div');
  chatWindow.className = 'cyber-chat-window';
  chatWindow.innerHTML = `
    <div class="chat-header">
      <div class="chat-title">
        <span class="status-dot"></span>
        D.R. SYSTEM CORE (IA)
      </div>
      <button class="close-chat-btn">×</button>
    </div>
    <div class="chat-messages" id="chat-messages-container"></div>
    <div class="chat-input-area">
      <input type="text" id="chat-input-field" class="chat-input" placeholder="Comando o pregunta..." autocomplete="off">
      <button id="chat-send-btn" class="chat-send-btn">↵</button>
    </div>
  `;

  widgetContainer.appendChild(chatWindow);
  widgetContainer.appendChild(toggleBtn);
  document.body.appendChild(widgetContainer);

  const messagesContainer = chatWindow.querySelector('#chat-messages-container');
  const inputField = chatWindow.querySelector('#chat-input-field');
  const sendBtn = chatWindow.querySelector('#chat-send-btn');
  const closeBtn = chatWindow.querySelector('.close-chat-btn');

  // --- 2. State & History ---
  let isChatOpen = false;
  let chatStarted = false;
  let isThinking = false;
  
  // Guardamos la memoria de la conversación para enviarla a Gemini
  let conversationHistory = [];

  const toggleChat = () => {
    isChatOpen = !isChatOpen;
    if (isChatOpen) {
      chatWindow.classList.add('open');
      toggleBtn.classList.add('hidden');
      if (!chatStarted) {
        startConversation();
      }
      setTimeout(() => inputField.focus(), 300);
    } else {
      chatWindow.classList.remove('open');
      toggleBtn.classList.remove('hidden');
    }
  };

  toggleBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  // --- 3. Chat Logic ---
  
  function addMessage(text, sender = 'bot') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerHTML = text.replace(/\n/g, '<br>');
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing';
    typingDiv.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    typingDiv.id = 'bot-typing';
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTypingIndicator() {
    const typing = document.getElementById('bot-typing');
    if (typing) typing.remove();
  }

  async function handleUserInput() {
    const text = inputField.value.trim();
    if (!text || isThinking) return;

    // Hardcode direct WhatsApp command
    if (text.toLowerCase() === '/whatsapp') {
      inputField.value = '';
      addMessage(text, 'user');
      addMessage('Abriendo canal cifrado a WhatsApp...', 'bot');
      
      // Extract the last real user query from history
      const userMsgs = conversationHistory.filter(m => m.role === 'user');
      const lastQuery = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].parts[0].text : '';
      
      let waText = "Hola Denzel, vengo de tu portafolio web.";
      if (lastQuery) {
        waText += " Estaba conversando con el bot sobre este proyecto/consulta: " + lastQuery;
      }
      
      setTimeout(() => {
        window.open(`https://wa.me/50685513262?text=${encodeURIComponent(waText)}`, '_blank');
      }, 1000);
      return;
    }

    inputField.value = '';
    inputField.disabled = true;
    sendBtn.disabled = true;
    isThinking = true;

    addMessage(text, 'user');
    showTypingIndicator();

    // Guardar el mensaje del usuario en el historial
    conversationHistory.push({ role: 'user', parts: [{ text }] });

    try {
      const response = await callGeminiAPI(conversationHistory);
      
      hideTypingIndicator();
      
      if (response) {
        // Guardar la respuesta de la IA en el historial
        conversationHistory.push({ role: 'model', parts: [{ text: response }] });
        addMessage(response, 'bot');
      } else {
        addMessage("Error de conexión con el Core. Intente de nuevo.", 'bot');
      }
    } catch (error) {
      hideTypingIndicator();
      addMessage(`Enlace caído: ${error.message}`, 'bot');
      console.error(error);
    } finally {
      isThinking = false;
      inputField.disabled = false;
      sendBtn.disabled = false;
      inputField.focus();
    }
  }

  async function callGeminiAPI(history) {
    if (GEMINI_API_KEY === "PON_TU_API_KEY_AQUI") {
      // Mock response si no han puesto la API key
      return "⚠️ ERROR DEL SISTEMA: La API Key de IA no ha sido configurada. El dueño debe insertarla en el código fuente (chatbot.js). Puedes usar /whatsapp para contactarlo.";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`;
    
    const body = {
      system_instruction: {
        parts: { text: SYSTEM_PROMPT }
      },
      contents: history
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }

  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserInput();
  });
  sendBtn.addEventListener('click', handleUserInput);

  function startConversation() {
    chatStarted = true;
    const initialGreeting = "Conexión segura establecida. Soy D.R. SYSTEM CORE (V.2.0).\n¿En qué te puedo asesorar hoy? Escribe tu consulta o usa el comando /whatsapp para contactar a Denzel directamente.";
    
    showTypingIndicator();
    setTimeout(() => {
      hideTypingIndicator();
      addMessage(initialGreeting, 'bot');
      // Iniciar el historial de la IA, Gemini requiere que empiece el user, pero podemos simplemente dejar que el primer mensaje real del usuario inicie la cadena
    }, 1200);
  }
}
