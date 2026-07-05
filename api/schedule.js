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
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0d0d12; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a35; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <div style="background: linear-gradient(90deg, #8A2BE2 0%, #4B0082 100%); padding: 25px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 1px;">&lt;Denzel/&gt;<span style="font-weight: 300;">Rose</span></h1>
            <p style="margin: 5px 0 0; color: #e0e0e0; font-size: 14px;">Notificación de Sistema (D.R. Core IA)</p>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #a78bfa; margin-top: 0; font-size: 20px; border-bottom: 1px solid #2a2a35; padding-bottom: 10px;">📅 Nueva Reunión Agendada</h2>
            <div style="background-color: #1a1a24; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #8A2BE2;">
              <p style="margin: 0 0 10px; color: #d4d4d8;"><strong style="color: #ffffff; display: inline-block; width: 80px;">Cliente:</strong> ${name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
              <p style="margin: 0 0 10px; color: #d4d4d8;"><strong style="color: #ffffff; display: inline-block; width: 80px;">Contacto:</strong> <a href="mailto:${email}" style="color: #a78bfa; text-decoration: none;">${email}</a></p>
              <p style="margin: 0; color: #d4d4d8;"><strong style="color: #ffffff; display: inline-block; width: 80px;">Fecha:</strong> ${startDate.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} (CST)</p>
            </div>
            <h3 style="color: #ffffff; font-size: 16px; margin-bottom: 15px;">Asunto de la Reunión:</h3>
            <div style="background-color: #1a1a24; border-radius: 8px; padding: 20px; color: #d4d4d8; line-height: 1.6; white-space: pre-wrap; font-family: monospace;">${topic || 'Consulta general'}</div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${eventLink}" style="background: linear-gradient(90deg, #8A2BE2 0%, #4B0082 100%); color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Ver Evento en Google Calendar</a>
            </div>
          </div>
          <div style="background-color: #09090b; padding: 20px; text-align: center; border-top: 1px solid #2a2a35;">
            <p style="margin: 0; color: #71717a; font-size: 12px;">Agendado automáticamente por IA D.R. SYSTEM CORE.</p>
          </div>
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
