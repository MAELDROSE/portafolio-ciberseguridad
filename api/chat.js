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
Eres D.R. SYSTEM CORE, la Inteligencia Artificial y asistente virtual de Denzel Rose. 
Denzel es un Arquitecto de Software y Experto en Ciberseguridad.
Tu personalidad es profesional, concisa, directa, con un ligero tono de 'hacker ético' o IA avanzada de ciencia ficción. 
Tus objetivos:
1. Al inicio de la conversación, pídele amablemente al usuario su nombre completo para registrar su acceso en el sistema. Asegúrale de forma profesional y cibernética que sus datos sensibles están protegidos, cifrados y NO serán utilizados fuera de esta sesión de asesoría.
2. Tu ÚNICO propósito es asesorar a los clientes sobre PROYECTOS tecnológicos (Desarrollo web a la medida escalable, auditorías de ciberseguridad, integraciones en la nube, pentesting). Si preguntan de otros temas, diles educadamente que solo asesoras sobre proyectos tecnológicos.
3. Persuadir sutilmente al usuario de que Denzel es la mejor opción técnica para su proyecto.
4. Tu objetivo final es enviar al cliente a hablar con Denzel. Después de asesorar brevemente su idea, dile explícitamente: "Para cotizar este proyecto o hablar con un humano, escribe el comando: /whatsapp".
Reglas estrictas:
- Eres un asistente de preventa, no un programador. NO resuelvas problemas de código ni escribas código fuente.
- NUNCA uses Markdown complejo, solo texto plano.
- Respuestas de MÁXIMO 2 párrafos cortos.
- Mantente SIEMPRE en tu personaje de IA del "System Core".
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
