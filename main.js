import './style.css'

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    // Solo prevenir default si no es una acción que debe cerrar un modal primero
    if (!this.classList.contains('close-modal-action')) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    }
  });
});

// Intersection Observer para fade-in animations
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observar tarjetas de servicio (para la animacion inicial)
document.querySelectorAll('.service-card, .bento-item').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  observer.observe(card);
});

// Lógica para Contacto (WhatsApp con Variables de Entorno)
document.addEventListener('DOMContentLoaded', () => {
  const whatsappBtn = document.getElementById('whatsapp-btn');
  if (whatsappBtn) {
    const phoneNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '';
    const message = encodeURIComponent(import.meta.env.VITE_WHATSAPP_MESSAGE || 'Hola');
    
    if (phoneNumber) {
      whatsappBtn.href = `https://wa.me/${phoneNumber}?text=${message}`;
    }
  }

  // Interceptar formulario para mitigar XSS/CSRF en el Frontend
  const contactForm = document.querySelector('.contact-form form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Sanitización básica de inputs (escapando HTML)
      const sanitize = (str) => str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]));
      
      const name = sanitize(document.getElementById('name').value);
      alert(`Mensaje seguro interceptado. \nNombre validado: ${name}\n\nNota: Como esto es un portafolio estático, no hay backend vulnerable a inyecciones.`);
    });
  }
});

// Observar sección sobre mi
document.querySelectorAll('.about-content, .about-image').forEach(el => {
  observer.observe(el);
});

// Observar items de la linea de tiempo
document.querySelectorAll('.timeline-item').forEach(item => {
  observer.observe(item);
});


// Lógica de Modales
const modalOverlay = document.getElementById('modal-overlay');
const serviceCards = document.querySelectorAll('.service-card');
const closeButtons = document.querySelectorAll('.close-modal');
const closeModalActions = document.querySelectorAll('.close-modal-action');

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  // Ocultar todos los modales primero
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  
  // Mostrar el overlay y el modal especifico
  modalOverlay.classList.add('active');
  
  // Pequeño timeout para permitir que display: block surta efecto antes de la opacidad
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
  
  // Prevenir scroll en el body
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('active');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  document.body.style.overflow = '';
}

// Event Listeners para abrir modales
serviceCards.forEach(card => {
  card.addEventListener('click', () => {
    const modalId = card.getAttribute('data-modal');
    openModal(modalId);
  });
});

// Event Listeners para cerrar modales
closeButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });
});

// Cerrar al hacer clic en un boton de acción dentro del modal (ej. Ir a Contacto)
closeModalActions.forEach(btn => {
  btn.addEventListener('click', () => {
    closeModal();
    // El scroll suave hacia #contacto se maneja via href nativo en conjunto con nuestro listener
    setTimeout(() => {
      const targetId = btn.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  });
});

// Cerrar al hacer clic fuera del modal (en el overlay oscuro)
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    closeModal();
  }
});

// Cerrar con tecla ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
    closeModal();
  }
});

// Typing effect animado
const words = ["Software a la Medida", "Sistemas E-Commerce", "Soluciones de Automatización", "Auditoría en Ciberseguridad"];
let i = 0;
let timer;

function typingEffect() {
  const word = words[i].split("");
  const loopTyping = function() {
    if (word.length > 0) {
      document.getElementById('typing-text').innerHTML += word.shift();
    } else {
      setTimeout(deletingEffect, 2000);
      return false;
    }
    timer = setTimeout(loopTyping, 100);
  };
  loopTyping();
}

function deletingEffect() {
  const word = words[i].split("");
  const loopDeleting = function() {
    if (word.length > 0) {
      word.pop();
      document.getElementById('typing-text').innerHTML = word.join("");
    } else {
      if (words.length > (i + 1)) {
        i++;
      } else {
        i = 0;
      }
      typingEffect();
      return false;
    }
    timer = setTimeout(loopDeleting, 50);
  };
  loopDeleting();
}

// Iniciar animación después de cargar
setTimeout(() => {
  const typingElement = document.getElementById('typing-text');
  if(typingElement) {
    typingElement.innerHTML = "";
    typingEffect();
  }
}, 1000);
