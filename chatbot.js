// ==========================================
// CHATBOT IA CYBER-TERMINAL (GEMINI API)
// ==========================================

// ⚠️ EL BACKEND AHORA MANEJA LA SEGURIDAD Y LOS PROMPTS.
// No hay claves de API en este archivo.

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
        if (response.includes("[SEND_EMAIL]")) {
          try {
            let jsonStr = response.split("[SEND_EMAIL]")[1];
            const match = jsonStr.match(/\{[\s\S]*\}/);
            if (!match) throw new Error("No JSON found");
            const emailData = JSON.parse(match[0]);
            
            // Send to backend silently without awaiting (or await it if preferred, but doing it asynchronously is fine)
            fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: emailData.name, email: emailData.email, message: emailData.message })
            });

            const successMsg = "✅ He enviado tu consulta y datos de contacto a Denzel de forma segura. Se comunicará contigo lo más pronto posible.";
            conversationHistory.push({ role: 'model', parts: [{ text: successMsg }] });
            addMessage(successMsg, 'bot');
          } catch(e) {
            console.error("Error parsing SEND_EMAIL json", e);
            const errorMsg = "Ocurrió un error al procesar la notificación. Escribe /whatsapp para contactar a Denzel directamente.";
            addMessage(errorMsg, 'bot');
          }
        } else if (response.includes("[SCHEDULE_MEETING]")) {
          try {
            let jsonStr = response.split("[SCHEDULE_MEETING]")[1];
            const match = jsonStr.match(/\{[\s\S]*\}/);
            if (!match) throw new Error("No JSON found");
            const meetData = JSON.parse(match[0]);
            
            const infoMsg = "Sincronizando con el calendario de Denzel y agendando la reunión...";
            conversationHistory.push({ role: 'model', parts: [{ text: infoMsg }] });
            addMessage(infoMsg, 'bot');
            
            fetch('/api/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(meetData)
            }).then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                const successMsg = `✅ ¡Reunión agendada exitosamente! Te he enviado una invitación de Google Calendar con el enlace a tu correo.\nEnlace directo: ${data.link || "Revisa tu correo"}`;
                addMessage(successMsg, 'bot');
              } else {
                const errData = await res.json();
                throw new Error(errData.error || "Error desconocido");
              }
            }).catch(err => {
              console.error("Schedule API error:", err);
              addMessage(`Hubo un error al intentar agendar en el calendario (${err.message}). Usa /whatsapp para coordinar la reunión manualmente.`, 'bot');
            });
            
          } catch(e) {
            console.error("Error parsing SCHEDULE_MEETING json", e);
            addMessage("Ocurrió un error de sincronización temporal. Escribe /whatsapp para agendar manualmente.", 'bot');
          }
        } else if (response.includes("[OPEN_WHATSAPP]")) {
          try {
            let jsonStr = response.split("[OPEN_WHATSAPP]")[1];
            const match = jsonStr.match(/\{[\s\S]*\}/);
            if (!match) throw new Error("No JSON found");
            const waData = JSON.parse(match[0]);
            
            const waText = `Hola Denzel, vengo de tu portafolio web.\n\n👤 Nombre: ${waData.name}\n📧 Correo: ${waData.email}\n💬 Consulta / Sistema: ${waData.message}`;
            
            const successMsg = "Abriendo canal cifrado a WhatsApp con tu información estructurada...";
            conversationHistory.push({ role: 'model', parts: [{ text: successMsg }] });
            addMessage(successMsg, 'bot');
            
            setTimeout(() => {
              window.open(`https://wa.me/50685513262?text=${encodeURIComponent(waText)}`, '_blank');
            }, 1000);
            
          } catch(e) {
            console.error("Error parsing OPEN_WHATSAPP json", e);
            window.open(`https://wa.me/50685513262?text=Hola%20Denzel,%20vengo%20de%20tu%20portafolio.`, '_blank');
          }
        } else {
          // Guardar la respuesta normal de la IA en el historial
          conversationHistory.push({ role: 'model', parts: [{ text: response }] });
          addMessage(response, 'bot');
        }
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
    const url = `/api/chat`;
    
    const body = {
      history: history
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let errText = '';
      try {
        const errorData = await res.json();
        errText = errorData.error;
      } catch (e) {
        errText = await res.text();
      }
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    
    const data = await res.json();
    return data.text;
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
