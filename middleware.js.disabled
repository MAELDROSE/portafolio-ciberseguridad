import { kv } from '@vercel/kv';
import { Ratelimit } from '@upstash/ratelimit';

// Creamos un Rate Limiter estricto: 10 peticiones por cada 10 segundos
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  ephemeralCache: new Map(),
  analytics: true,
});

export const config = {
  matcher: [
    /*
     * Intercepta todas las rutas excepto:
     * - /assets/ (archivos estáticos compilados de Vite CSS/JS)
     * - favicon.ico
     * - Imágenes y otros estáticos puros
     */
    '/((?!assets|favicon.ico|profile.jpg|.well-known).*)',
  ],
};

export default async function middleware(request) {
  // Extraemos la IP del cliente de las cabeceras estándar de Vercel
  const ip = request.headers.get('x-forwarded-for') || request.ip || '127.0.0.1';
  
  // Evaluamos la IP en nuestra base de datos Edge (Vercel KV)
  const { success, pending, limit, reset, remaining } = await ratelimit.limit(ip);

  // Si la IP supera el límite, devolvemos un 429 Too Many Requests
  if (!success) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Security protocol active. Please try again later.'
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  // Si pasa, permitimos que Vercel sirva la página normalmente
}
