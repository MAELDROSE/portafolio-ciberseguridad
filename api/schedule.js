import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';

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
      }
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event
    });

    const eventLink = response.data.htmlLink;

    // Enviar correo a Denzel notificándole de la nueva reunión
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #8A2BE2;">📅 ¡Nueva Reunión Agendada por la IA!</h2>
          <p><strong>Cliente:</strong> ${name}</p>
          <p><strong>Correo:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Fecha y Hora:</strong> ${startDate.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} (Hora Central)</p>
          <hr>
          <h3>Proyecto / Consulta:</h3>
          <p style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #8A2BE2;">${topic || 'Consulta general'}</p>
          <br>
          <a href="${eventLink}" style="background-color: #8A2BE2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Abrir Evento en Google Calendar (para añadir Meet)</a>
        </div>
      `;

      await transporter.sendMail({
        from: `"IA D.R. SYSTEM" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        subject: `📅 Reunión Agendada: ${name}`,
        html: emailHtml
      }).catch(err => console.error("Error enviando email de notificación de calendario:", err));
    }

    return res.status(200).json({ 
      success: true, 
      link: eventLink 
    });

  } catch (error) {
    console.error('Schedule Meeting Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
