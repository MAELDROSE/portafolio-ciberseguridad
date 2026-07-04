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

    // 3. Ya no necesitamos leer el calendario desde el servidor, usaremos el enlace de Google Appointments.
    
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
4. Una vez que tengas su nombre, correo y la idea de su proyecto, ofrécele TRES opciones para continuar: "Si deseas, puedo enviarle estos datos a Denzel por correo, puedes escribir /whatsapp para hablar directo con él, o si prefieres **puedes agendar una reunión virtual directamente en su calendario**."
5. IMPORTANTE: Si el usuario pide agendar la reunión (o elige esa opción), respóndele amablemente y entrégale **exactamente este enlace** para que elija su horario:
👉 https://calendar.google.com/calendar/appointments/schedules/AcZssZ3uz1tnNehoSACgdTrjXfb-GV4x93x7kTH32qAvqbrjQYldEVNKDF8fQbgbS1gOg8RkWSB9A1FX?gv=true
6. Generación de comandos silenciados (no los muestres al usuario, solo genéralos y despídete):
- Si el usuario acepta enviar información por correo: 
[SEND_EMAIL] {"name": "SuNombre", "email": "SuCorreo", "message": "Resumen"}
- Si elige WhatsApp o escribe /whatsapp: 
[OPEN_WHATSAPP] {"name": "SuNombre", "email": "SuCorreo", "message": "Resumen"}

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
    return res.status(200).json({ text: replyText });

  } catch (error) {
    console.error('API Chat Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
