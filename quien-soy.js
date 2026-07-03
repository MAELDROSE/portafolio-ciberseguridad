import './style.css'
import './quien-soy.css'

// Intersection Observer for fade-in animations on the new page
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
      
      // Si es una barra de progreso, animarla
      if(entry.target.classList.contains('skill-category')) {
         const bars = entry.target.querySelectorAll('.bar-fill');
         bars.forEach(bar => {
            const width = bar.style.width; // El width esta seteado inline en HTML
            bar.style.width = '0'; // Forzar 0 inicial
            setTimeout(() => {
                bar.style.width = width; // Restaurar el target width
            }, 300);
         });
      }
    }
  });
}, observerOptions);

// Select elements to animate
const elementsToAnimate = [
  '.profile-image-wrapper',
  '.profile-text',
  '.skill-category',
  '.v-timeline-item',
  '.edu-card'
];

elementsToAnimate.forEach(selector => {
  document.querySelectorAll(selector).forEach(el => {
    el.classList.add('fade-element');
    observer.observe(el);
  });
});
