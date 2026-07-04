import { GoogleAuth } from 'google-auth-library';

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
        'https://www.googleapis.com/auth/generative-language'
      ]
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      throw new Error('Failed to retrieve access token from Service Account');
    }

    // 3. Hacer la llamada a la API de Gemini (v1beta)
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
4. Una vez que tengas su nombre, correo y la idea de su proyecto, ofrécele DOS opciones para continuar: "Si deseas, puedo enviarle estos datos a Denzel por correo para que te contacte, o si prefieres una respuesta más rápida, escribe el comando /whatsapp para hablar directo con él."
5. IMPORTANTE: 
- Si el usuario acepta que le envíes la información por correo (o te dice que sí), genera SILENCIOSAMENTE este comando exacto (y nada más en ese mensaje, junto con una despedida amigable):
[SEND_EMAIL] {"name": "SuNombre", "email": "SuCorreo", "message": "Resumen de su consulta y el sistema que quiere"}
- Si el usuario elige WhatsApp o escribe /whatsapp, genera SILENCIOSAMENTE este comando exacto (junto con una despedida):
[OPEN_WHATSAPP] {"name": "SuNombre", "email": "SuCorreo", "message": "Resumen de su consulta y el sistema que quiere"}

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
