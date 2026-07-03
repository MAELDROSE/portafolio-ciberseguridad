import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        quienSoy: 'quien-soy.html',
        servicios: 'servicios.html',
        proyectos: 'proyectos.html',
        metodologia: 'metodologia.html',
        contacto: 'contacto.html'
      }
    }
  }
});
