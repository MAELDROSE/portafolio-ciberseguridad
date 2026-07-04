// ==========================================
// CHATBOT CYBER-TERMINAL LOGIC
// ==========================================

export function initChatbot() {
  // Prevent double injection
  if (document.getElementById('cyber-chat-widget')) return;

  // --- 1. Build UI ---
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'cyber-chat-widget';

  // Floating Button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'cyber-chat-btn';
  toggleBtn.innerHTML = '>_';
  toggleBtn.title = 'Abrir Asistente Virtual';

  // Chat Window
  const chatWindow = document.createElement('div');
  chatWindow.className = 'cyber-chat-window';
  chatWindow.innerHTML = `
    <div class="chat-header">
      <div class="chat-title">
        <span class="status-dot"></span>
        D.R. SYSTEM CORE
      </div>
      <button class="close-chat-btn">×</button>
    </div>
    <div class="chat-messages" id="chat-messages-container"></div>
    <div class="chat-options" id="chat-options-container"></div>
  `;

  widgetContainer.appendChild(chatWindow);
  widgetContainer.appendChild(toggleBtn);
  document.body.appendChild(widgetContainer);

  const messagesContainer = chatWindow.querySelector('#chat-messages-container');
  const optionsContainer = chatWindow.querySelector('#chat-options-container');
  const closeBtn = chatWindow.querySelector('.close-chat-btn');

  // --- 2. State Machine Logic ---
  let isChatOpen = false;
  let chatStarted = false;

  const toggleChat = () => {
    isChatOpen = !isChatOpen;
    if (isChatOpen) {
      chatWindow.classList.add('open');
      toggleBtn.classList.add('hidden');
      if (!chatStarted) {
        startConversation();
      }
    } else {
      chatWindow.classList.remove('open');
      toggleBtn.classList.remove('hidden');
    }
  };

  toggleBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  // Conversation Trees
  const dialogTree = {
    start: {
      botMsg: "Iniciando conexión segura...\nHola, soy el asistente virtual de Denzel Rose. ¿En qué te puedo ayudar hoy?",
      options: [
        { text: "¿Qué servicios ofreces?", next: "services" },
        { text: "¿Tienen experiencia en Ciberseguridad?", next: "security" },
        { text: "Contactar a Denzel (Humano)", next: "contact" }
      ]
    },
    services: {
      botMsg: "Construimos sistemas Core y aplicaciones web de alto rendimiento con arquitecturas escalables (.NET, C#). No usamos plantillas, hacemos software a la medida.",
      options: [
        { text: "Cotizar un proyecto", next: "contact" },
        { text: "Volver al menú inicial", next: "start" }
      ]
    },
    security: {
      botMsg: "La seguridad es nuestro núcleo. Realizamos auditorías, Pentesting ético y fortificamos sistemas contra vulnerabilidades (Top 10 OWASP) antes de salir a producción.",
      options: [
        { text: "Ver metodología", next: "methodology" },
        { text: "Volver al menú inicial", next: "start" }
      ]
    },
    methodology: {
      botMsg: "Trabajamos en Sprints ágiles de 2 semanas, con flujos CI/CD y despliegue automático. Puedes leer más en la pestaña de 'Metodología'.",
      options: [
        { text: "Cotizar un proyecto", next: "contact" },
        { text: "Volver al menú inicial", next: "start" }
      ]
    },
    contact: {
      botMsg: "Excelente elección. Abriendo canal cifrado a WhatsApp...",
      options: [],
      action: () => {
        setTimeout(() => {
          window.open('https://wa.me/50685513262?text=Hola%20Denzel,%20vengo%20de%20tu%20portafolio%20web.', '_blank');
          renderOptions([{ text: "Volver al menú inicial", next: "start" }]);
        }, 1500);
      }
    }
  };

  // --- 3. Render Helpers ---
  function addMessage(text, sender = 'bot') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    // Replace newlines with <br>
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

  function renderOptions(options) {
    optionsContainer.innerHTML = '';
    if (options.length === 0) {
      optionsContainer.style.display = 'none';
      return;
    }
    optionsContainer.style.display = 'flex';
    
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'chat-option-btn';
      btn.innerText = `> ${opt.text}`;
      btn.addEventListener('click', () => {
        // User clicks option
        addMessage(opt.text, 'user');
        optionsContainer.innerHTML = ''; // Clear options
        
        // Trigger next state
        handleState(opt.next);
      });
      optionsContainer.appendChild(btn);
    });
  }

  function handleState(stateId) {
    const state = dialogTree[stateId];
    if (!state) return;

    showTypingIndicator();
    
    // Simulate thinking delay based on message length
    const delay = Math.min(1500, 500 + state.botMsg.length * 15);
    
    setTimeout(() => {
      hideTypingIndicator();
      addMessage(state.botMsg, 'bot');
      renderOptions(state.options);
      
      // Execute any side effects (like opening whatsapp)
      if (state.action) {
        state.action();
      }
    }, delay);
  }

  function startConversation() {
    chatStarted = true;
    handleState('start');
  }
}
