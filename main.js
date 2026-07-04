import './style.css'
import './quien-soy.css'

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

// Intersection Observer para fade-in animations (Scroll Reveal)
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
      entry.target.classList.add('visible'); // Para compatibilidad con quien-soy.css (.fade-element.visible)
      
      // Animación de barra de progreso (Quién Soy)
      if (entry.target.classList.contains('skill-category')) {
        const bars = entry.target.querySelectorAll('.bar-fill');
        bars.forEach(bar => {
          const width = bar.style.width; // El width esta seteado inline en HTML
          bar.style.width = '0'; // Forzar 0 inicial
          setTimeout(() => {
            bar.style.width = width; // Restaurar el target width
          }, 300);
        });
      }
      
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observar cualquier elemento con la clase .reveal
document.addEventListener('DOMContentLoaded', () => {
  const elements = [
    '.reveal', '.service-card', '.bento-item', '.glass-card', '.timeline-item',
    '.profile-image-wrapper', '.profile-text', '.skill-category', '.v-timeline-item', '.edu-card'
  ];
  
  document.querySelectorAll(elements.join(', ')).forEach(el => {
    el.classList.add('reveal'); // Asegurar que tengan la clase base
    observer.observe(el);
  });
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

  // Interceptar formulario para enviar por Formspree via AJAX
  const contactForm = document.querySelector('.contact-form form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // REEMPLAZA EL ID DEL FORMULARIO AQUÍ (ej. 'xqazpjwm')
      const formspreeId = 'TU_FORMSPREE_ID'; 
      const endpoint = formspreeId !== 'TU_FORMSPREE_ID' 
        ? `https://formspree.io/f/${formspreeId}` 
        : 'https://formspree.io/f/placeholder'; // Placeholder

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      
      const formData = new FormData(contactForm);

      try {
        submitBtn.innerText = 'Enviando...';
        submitBtn.style.opacity = '0.7';
        submitBtn.disabled = true;

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          alert('✅ ¡Mensaje enviado con éxito! Te contactaré pronto.');
          contactForm.reset();
        } else {
          // Si usan el placeholder, simulamos exito para la demo
          if(endpoint.includes('placeholder')) {
             alert('⚠️ NOTA: El formulario está en modo Demo. Debes poner tu ID de Formspree en main.js.\n\nSimulando envío exitoso...');
             contactForm.reset();
          } else {
             const data = await response.json();
             alert('❌ Error: ' + (data.error || 'No se pudo enviar el correo.'));
          }
        }
      } catch (error) {
        console.error('Error enviando formulario:', error);
        alert('❌ Error de conexión. Intenta de nuevo más tarde.');
      } finally {
        submitBtn.innerText = originalText;
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
      }
    });
  }
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
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
}

// Cerrar con tecla ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('active')) {
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

// Galaxy Loader Logic
const hideLoader = () => {
  const loader = document.getElementById('galaxy-loader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => {
      loader.style.display = 'none';
    }, 600);
  }
};

// Mostrar el cargador por exactamente 2 segundos
setTimeout(hideLoader, 2000);

// ==========================================
// CYBER MOBILE MENU INJECTION & LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar');
  const navLinks = document.querySelector('.nav-links');
  
  if (navbar && navLinks) {
    // 1. Inyectar botón Hamburguesa
    const hamburgerBtn = document.createElement('button');
    hamburgerBtn.classList.add('cyber-hamburger');
    hamburgerBtn.setAttribute('aria-label', 'Toggle mobile menu');
    hamburgerBtn.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;
    navbar.appendChild(hamburgerBtn);

    // 2. Crear y popular el Mobile Menu Overlay
    const mobileMenuOverlay = document.createElement('div');
    mobileMenuOverlay.classList.add('cyber-mobile-menu');
    
    // Clonar lista de enlaces
    const clonedNavLinks = navLinks.cloneNode(true);
    clonedNavLinks.classList.remove('nav-links');
    
    mobileMenuOverlay.appendChild(clonedNavLinks);
    document.body.appendChild(mobileMenuOverlay);

    // 3. Lógica de Interacción
    const toggleMenu = () => {
      hamburgerBtn.classList.toggle('active');
      mobileMenuOverlay.classList.toggle('open');
      
      if (mobileMenuOverlay.classList.contains('open')) {
        document.body.style.overflow = 'hidden'; // Bloquear scroll
      } else {
        document.body.style.overflow = ''; // Restaurar scroll
      }
    };

    hamburgerBtn.addEventListener('click', toggleMenu);

    // Cerrar el menú si hacen clic en un enlace
    const mobileLinks = mobileMenuOverlay.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (mobileMenuOverlay.classList.contains('open')) {
          toggleMenu();
        }
      });
    });
  }
});

// ==========================================
// CUSTOM CYBER CURSOR LOGIC
// ==========================================
const cursor = document.createElement('div');
cursor.classList.add('cyber-cursor');
document.body.appendChild(cursor);

document.addEventListener('mousemove', (e) => {
  // Move cursor exactly to mouse position
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
});

// Add hover effect to interactive elements
const interactives = document.querySelectorAll('a, button, input, textarea, .bento-icon');
interactives.forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.classList.add('cursor-hover');
  });
  el.addEventListener('mouseleave', () => {
    cursor.classList.remove('cursor-hover');
  });
});

// ==========================================
// SCROLL TO TOP BUTTON LOGIC
// ==========================================
const scrollTopBtn = document.createElement('button');
scrollTopBtn.id = 'scrollTopBtn';
scrollTopBtn.classList.add('scroll-top-btn');
scrollTopBtn.innerHTML = '↑';
scrollTopBtn.setAttribute('aria-label', 'Volver Arriba');
document.body.appendChild(scrollTopBtn);

window.addEventListener('scroll', () => {
  if (window.scrollY > 500) {
    scrollTopBtn.classList.add('visible');
  } else {
    scrollTopBtn.classList.remove('visible');
  }
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

// ==========================================
// CYBERSECURITY EASTER EGG (Anti-Right Click Hint)
// ==========================================
document.addEventListener('contextmenu', (e) => {
  // Solo como broma temática, no bloqueamos realmente, pero mostramos un console warning 
  // O podemos mostrar una alerta pequeña en pantalla
  if (!document.getElementById('cyber-warning')) {
    const warning = document.createElement('div');
    warning.id = 'cyber-warning';
    warning.innerHTML = '[!] Security Warning: System Monitoring Active.';
    warning.style.position = 'fixed';
    warning.style.bottom = '20px';
    warning.style.left = '20px';
    warning.style.backgroundColor = 'rgba(255, 0, 50, 0.9)';
    warning.style.color = '#fff';
    warning.style.fontFamily = 'monospace';
    warning.style.padding = '10px 15px';
    warning.style.borderRadius = '5px';
    warning.style.zIndex = '9999999';
    warning.style.boxShadow = '0 0 15px rgba(255, 0, 50, 0.5)';
    warning.style.pointerEvents = 'none';
    warning.style.opacity = '0';
    warning.style.transition = 'opacity 0.3s ease';
    
    document.body.appendChild(warning);
    
    setTimeout(() => { warning.style.opacity = '1'; }, 10);
    
    setTimeout(() => {
      warning.style.opacity = '0';
      setTimeout(() => warning.remove(), 300);
    }, 3000);
  }
});

// ==========================================
// 3D TILT & GLARE EFFECT (2030 Holographic Cards)
// ==========================================
const init3DTilt = () => {
  const cards = document.querySelectorAll('.skill-category, .v-timeline-content, .edu-card, .bento-item, .project-card');
  
  cards.forEach(card => {
    card.style.transformStyle = 'preserve-3d';
    card.style.perspective = '1000px';
    
    // Crear elemento para el reflejo (glare) si no existe
    if (!card.querySelector('.card-glare')) {
      const glare = document.createElement('div');
      glare.classList.add('card-glare');
      card.appendChild(glare);
    }

    const glare = card.querySelector('.card-glare');

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // posición X interna
      const y = e.clientY - rect.top;  // posición Y interna
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Ángulo máximo de inclinación (12 grados)
      const rotateX = ((centerY - y) / centerY) * 12;
      const rotateY = ((x - centerX) / centerX) * 12;
      
      // Aplicar transformaciones 3D a la tarjeta
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      
      // Brillo reflectivo dinámico
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 80%)`;
      glare.style.opacity = '1';
    });

    card.addEventListener('mouseleave', () => {
      // Regresar suavemente a la posición original
      card.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease';
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      glare.style.transition = 'opacity 0.5s ease';
      glare.style.opacity = '0';
      
      setTimeout(() => {
        card.style.transition = '';
        glare.style.transition = '';
      }, 500);
    });

    card.addEventListener('mouseenter', () => {
      card.style.transition = 'none';
      glare.style.transition = 'none';
    });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  init3DTilt();
});
