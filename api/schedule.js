import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, datetime, topic } = req.body;

    if (!name || !email || !datetime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!serviceAccountJson || !calendarId) {
      throw new Error('Server missing Google Calendar credentials');
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch (e) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT is invalid JSON');
    }

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar.events']
    });

    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    // Calculate end time (30 minutes after start)
    const startDate = new Date(datetime);
    const endDate = new Date(startDate.getTime() + 30 * 60000);

    const event = {
      summary: `Reunión: ${name} - ${topic || 'Consulta'}`,
      description: `Reunión agendada automáticamente por D.R. SYSTEM CORE.\nCliente: ${name}\nCorreo: ${email}`,
      start: {
        dateTime: startDate.toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      },
      attendees: [
        { email: email }
      ],
      conferenceData: {
        createRequest: {
          requestId: `meet_${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all' // Enviar correo a los invitados
    });

    return res.status(200).json({ 
      success: true, 
      link: response.data.hangoutLink 
    });

  } catch (error) {
    console.error('Schedule Meeting Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
