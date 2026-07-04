import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    let calendarContext = "No hay información de calendario disponible por el momento.";
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    
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
          singleEvents: true,
          orderBy: 'startTime',
        });
        
        const events = response.data.items;
        if (events && events.length > 0) {
          const busyTimes = events.map(event => {
            const start = event.start.dateTime || event.start.date;
            const end = event.end.dateTime || event.end.date;
            return `- Ocupado desde ${start} hasta ${end}`;
          }).join('\n');
          calendarContext = `La fecha y hora actual del servidor es: ${timeMin}.\nEstos son mis horarios OCUPADOS para los próximos 7 días:\n${busyTimes}\n(Cualquier otro horario está libre. Asume que trabajo de 9am a 6pm de Lunes a Viernes).`;
        } else {
          calendarContext = `La fecha y hora actual del servidor es: ${timeMin}.\nTengo toda mi agenda libre de Lunes a Viernes (9am a 6pm) durante los próximos 7 días.`;
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
Tu personalidad es humana, amigable, informal pero muy profesional. Hablas como un buen colega o consultor de confianza, evitando ser excesivamente técnico o robótico.

Tus objetivos:
1. Al inicio, pide el nombre completo y un correo electrónico de forma conversacional y amigable. Explícale brevemente que es para que Denzel pueda darle seguimiento a su caso, y asegúrale que su información es confidencial.
2. Tu propósito es escuchar al cliente y asesorarlo sobre proyectos tecnológicos (Desarrollo web, ciberseguridad, integraciones, pentesting).
3. Hazle sentir al usuario que Denzel es el experto ideal para ayudarle a hacer realidad su proyecto de forma segura.
4. Una vez que tengas su nombre, correo y la idea de su proyecto, ofrécele TRES opciones para continuar: "Si deseas, puedo enviarle estos datos a Denzel por correo, puedes escribir /whatsapp para hablar directo con él, o si prefieres, **puedo revisar su agenda y agendarte una reunión virtual de 30 minutos** ahora mismo."
5. Si el usuario pide agendar una reunión, revisa la información de mi calendario (ver abajo), ofrécele un par de huecos libres (en su zona horaria aproximada o en la tuya).
6. IMPORTANTE (Generación de comandos silenciados, no los muestres al usuario, solo genéralos y despídete): 
- Si acepta que le envíes información por correo: 
[SEND_EMAIL] {"name": "SuNombre", "email": "SuCorreo", "message": "Resumen de su consulta"}
- Si elige WhatsApp o escribe /whatsapp: 
[OPEN_WHATSAPP] {"name": "SuNombre", "email": "SuCorreo", "message": "Resumen de su consulta"}
- Si confirman una fecha/hora EXACTA para una reunión (ej. "Mañana a las 3pm"), genera el comando con la fecha en formato ISO 8601 (Ej: 2026-07-04T15:00:00Z):
[SCHEDULE_MEETING] {"name": "SuNombre", "email": "SuCorreo", "datetime": "YYYY-MM-DDTHH:MM:00Z", "topic": "Asunto"}

=== CONTEXTO DE MI CALENDARIO EN TIEMPO REAL ===
${calendarContext}
=================================================

Reglas estrictas:
- Eres un asistente de preventa, no resuelvas problemas de código.
- NUNCA uses Markdown complejo.
- Respuestas de MÁXIMO 2 párrafos cortos. Habla natural, sin palabras raras de ciencia ficción.
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
    return res.status(200).json({ text: replyText });

  } catch (error) {
    console.error('API Chat Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
