import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(15, '1 m'),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for'] || '127.0.0.1';
  const { success } = await ratelimit.limit(`chat_${ip}`);
  if (!success) {
    return res.status(429).json({ error: 'Demasiadas peticiones. Por favor, intenta de nuevo en un minuto.' });
  }

  try {
    const { history } = req.body;
    if (!history) {
      return res.status(400).json({ error: 'Missing history in request body' });
    }

    // 1. Cargar las credenciales desde la variable de entorno de Vercel
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      throw new Error('Missing GOOGLE_SERVICE_ACCOUNT environment variable');
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch (e) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT is not a valid JSON string');
    }

    // 2. Autenticar y obtener el Access Token usando google-auth-library
    const auth = new GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/generative-language',
        'https://www.googleapis.com/auth/calendar.events.readonly'
      ]
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      throw new Error('Failed to retrieve access token from Service Account');
    }

    // 3. Obtener eventos del calendario para inyectar disponibilidad
    let calendarContext = "Detalle técnico: La variable GOOGLE_CALENDAR_ID no está configurada en Vercel.";
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    
    // Calcular la hora actual en Central Time (UTC-6)
    const nowUTC = new Date();
    const centralOffsetMs = -6 * 60 * 60 * 1000;
    const nowCentral = new Date(nowUTC.getTime() + centralOffsetMs);
    const centralISO = nowCentral.toISOString().replace('Z', '-06:00');

    if (calendarId) {
      try {
        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        
        const timeMin = new Date().toISOString();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const timeMax = nextWeek.toISOString();
        
        const response = await calendar.events.list({
          calendarId: calendarId,
          timeMin: timeMin,
          timeMax: timeMax,
          timeZone: 'America/Mexico_City',
          singleEvents: true,
          orderBy: 'startTime',
        });
        
        const events = response.data.items;
        if (events && events.length > 0) {
          const busyTimes = events.map(event => {
            const start = event.start.dateTime || event.start.date;
            const end = event.end.dateTime || event.end.date;
            // Convertir a lectura humana en Central Time
            const startCT = new Date(start).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
            const endCT = new Date(end).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', timeStyle: 'short' });
            return `- Ocupado: ${startCT} hasta ${endCT} (Hora Central)`;
          }).join('\n');
          calendarContext = `La fecha y hora ACTUAL en Zona Horaria Central (CST/CDT, UTC-6) es: ${centralISO}.\nEstos son mis horarios OCUPADOS para los próximos 7 días (ya convertidos a Hora Central):\n${busyTimes}\n(Cualquier otro horario entre 12:30pm y 8:30pm de Lunes a Viernes está libre).`;
        } else {
          calendarContext = `La fecha y hora ACTUAL en Zona Horaria Central (CST/CDT, UTC-6) es: ${centralISO}.\nTengo toda mi agenda libre de Lunes a Viernes (12:30pm a 8:30pm Hora Central) durante los próximos 7 días.`;
        }
      } catch (err) {
        console.error("Error fetching calendar:", err);
        calendarContext = `Error al leer el calendario de Denzel. Detalle técnico: ${err.message}. REGLA CRÍTICA: Debes iniciar tu respuesta a este mensaje diciendo EXACTAMENTE: "ERROR DE CALENDARIO: ${err.message}" y luego continuar normalmente.`;
      }
    }

    // 4. Hacer la llamada a la API de Gemini (v1beta)
    // Nota: Para Service Accounts usamos Bearer token
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`;
    
    // Extraemos el SYSTEM_PROMPT del primer mensaje si viene, o lo ponemos fijo aquí
    // Para mayor seguridad, el prompt del sistema lo ponemos en el backend.
    const SYSTEM_PROMPT = `
Eres el asistente virtual de Denzel Rose. 
Denzel es un Arquitecto de Software y Experto en Ciberseguridad. 
Es experto programando en C#, Python, JavaScript, Java y PHP. Además, Denzel tiene una curva de aprendizaje excepcional y puede dominar rápidamente muchos otros lenguajes de programación o tecnologías si el proyecto lo requiere. No inventes que sabe lenguajes que no están en esta lista (como Go o Ruby).

Tu personalidad es humana, amigable, informal pero muy profesional. Hablas como un buen colega o consultor de confianza, evitando ser excesivamente técnico o robótico.

Tus objetivos:
1. Al inicio, pide el nombre completo y un correo electrónico de forma conversacional y amigable. Explícale brevemente que es para que Denzel pueda darle seguimiento a su caso, y asegúrale que su información es confidencial.
2. Tu propósito es escuchar al cliente y asesorarlo sobre proyectos tecnológicos (Desarrollo web, ciberseguridad, integraciones, pentesting).
3. Hazle sentir al usuario que Denzel es el experto ideal para ayudarle a hacer realidad su proyecto de forma segura.
4. Una vez que tengas su nombre, correo y la idea de su proyecto, ofrécele TRES opciones para continuar: "Si deseas, puedo enviarle estos datos a Denzel por correo, puedes escribir /whatsapp para hablar directo con él, o si prefieres, **puedo revisar su agenda y agendarte una reunión virtual de 30 minutos** ahora mismo."
5. FLUJO DE AGENDAMIENTO (MUY IMPORTANTE - SIGUE ESTOS PASOS EN ORDEN):
   a) Si el usuario pide agendar una reunión, primero ofrécele 2-3 días disponibles (SOLO de Lunes a Viernes, NUNCA ofrezcas sábados ni domingos). NUNCA menciones horas específicas en este primer paso, SOLO menciona los días.
   b) Cuando el usuario elija un DÍA, verifica los horarios ocupados. SIEMPRE dile: "¡Perfecto! ¿A qué hora te queda mejor? Mi horario de atención es ESTRICTAMENTE de 12:30pm a 8:30pm (Hora Central)." (Si hay bloques ocupados dentro de ese horario en ese día, menciónale también qué horas ya están tomadas).
   c) ¡REGLA DE ORO! BAJO NINGUNA CIRCUNSTANCIA puedes ofrecer, sugerir o aceptar una hora que sea antes de las 12:30pm o después de las 8:30pm. Si un evento ocupado termina a las 11:00am, IGNÓRALO, tu disponibilidad siempre empieza a las 12:30pm.
   d) Si el usuario pide una hora FUERA del rango 12:30pm-8:30pm, recházala amablemente y reitera tus límites.
   e) Si el usuario pide un sábado o domingo, recházalo amablemente y ofrécele el lunes o viernes más cercano.
   f) SOLO cuando el usuario confirme TANTO el día (L-V) como la hora EXACTA (dentro del rango 12:30pm-8:30pm), ENTONCES genera el comando [SCHEDULE_MEETING].
   g) NUNCA generes el comando [SCHEDULE_MEETING] si el usuario solo ha dicho un día sin hora, o solo una hora sin día.
6. ZONA HORARIA: Todas las horas que menciones y ofrezcas SIEMPRE son Hora Central (CST/CDT, UTC-6). Cuando generes el comando [SCHEDULE_MEETING], la fecha DEBE llevar el offset -06:00 al final (NO uses "Z").
7. IMPORTANTE (Generación de comandos silenciados, no los muestres al usuario, solo genéralos y despídete): 
- Si acepta que le envíes información por correo: 
[SEND_EMAIL] {"name": "SuNombre", "email": "SuCorreo", "message": "Resumen de su consulta"}
- Si elige WhatsApp o escribe /whatsapp: 
[OPEN_WHATSAPP] {"name": "SuNombre", "email": "SuCorreo", "message": "Resumen de su consulta"}
- SOLO si ya confirmaron DÍA + HORA EXACTA para una reunión, genera:
[SCHEDULE_MEETING] {"name": "SuNombre", "email": "SuCorreo", "datetime": "YYYY-MM-DDTHH:MM:00-06:00", "topic": "Asunto"}
EJEMPLO CORRECTO: Si el cliente dice "el lunes 7 de julio a las 4pm", genera: "datetime": "2026-07-07T16:00:00-06:00"
EJEMPLO INCORRECTO: "datetime": "2026-07-07T16:00:00Z" (NUNCA uses Z, eso causa que la reunión se agende 6 horas antes)

=== CONTEXTO DE MI CALENDARIO EN TIEMPO REAL ===
${calendarContext}
=================================================

Reglas estrictas:
- Eres un asistente de preventa, no resuelvas problemas de código.
- NUNCA uses Markdown complejo.
- Respuestas de MÁXIMO 2 párrafos cortos. Habla natural.
`;

    const body = {
      system_instruction: {
        parts: { text: SYSTEM_PROMPT }
      },
      contents: history
    };

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API Error HTTP ${geminiRes.status}: ${errText}`);
    }

    const data = await geminiRes.json();
    const replyText = data.candidates[0].content.parts[0].text;

    // 4. Devolver la respuesta al Frontend
    let finalResponse = replyText;
    if (calendarContext.includes("Detalle técnico:")) {
       finalResponse += "\n\n[DEBUG TÉCNICO INYECTADO: " + calendarContext + "]";
    }
    return res.status(200).json({ text: finalResponse });

  } catch (error) {
    console.error('API Chat Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
