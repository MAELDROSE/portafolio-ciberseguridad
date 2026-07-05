import nodemailer from 'nodemailer';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(3, '5 m'),
});

export default async function handler(req, res) {
  // Permitir CORS básico si Vercel lo requiere
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Manejar preflight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo permitir POST para enviar el correo
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const ip = req.headers['x-forwarded-for'] || '127.0.0.1';
  const { success } = await ratelimit.limit(`email_${ip}`);
  if (!success) {
    return res.status(429).json({ success: false, message: 'Demasiados correos. Intenta de nuevo en unos minutos.' });
  }

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
  }

  // Crear transportador con variables de entorno de Vercel
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT === '465', // true para 465, false para otros puertos
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const mailOptions = {
      from: `"${name}" <${process.env.SMTP_USER}>`, // El correo se envía a sí mismo usando su cuenta
      replyTo: email, // Permite que Denzel responda directamente al cliente
      to: process.env.SMTP_USER, // El destinatario es Denzel
      subject: `🚀 Nuevo Contacto de Portafolio: ${name}`,
      text: `Has recibido un mensaje:\n\nNombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0d0d12; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a35; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <div style="background: linear-gradient(90deg, #8A2BE2 0%, #4B0082 100%); padding: 25px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 1px;">&lt;Denzel/&gt;<span style="font-weight: 300;">Rose</span></h1>
            <p style="margin: 5px 0 0; color: #e0e0e0; font-size: 14px;">Notificación de Sistema (D.R. Core)</p>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #a78bfa; margin-top: 0; font-size: 20px; border-bottom: 1px solid #2a2a35; padding-bottom: 10px;">📩 Nuevo Mensaje Recibido</h2>
            <div style="background-color: #1a1a24; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #8A2BE2;">
              <p style="margin: 0 0 10px; color: #d4d4d8;"><strong style="color: #ffffff; display: inline-block; width: 80px;">Cliente:</strong> ${name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
              <p style="margin: 0; color: #d4d4d8;"><strong style="color: #ffffff; display: inline-block; width: 80px;">Contacto:</strong> <a href="mailto:${email}" style="color: #a78bfa; text-decoration: none;">${email}</a></p>
            </div>
            <h3 style="color: #ffffff; font-size: 16px; margin-bottom: 15px;">Detalle del Mensaje:</h3>
            <div style="background-color: #1a1a24; border-radius: 8px; padding: 20px; color: #d4d4d8; line-height: 1.6; white-space: pre-wrap; font-family: monospace;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          </div>
          <div style="background-color: #09090b; padding: 20px; text-align: center; border-top: 1px solid #2a2a35;">
            <p style="margin: 0; color: #71717a; font-size: 12px;">Generado automáticamente por tu Portafolio de Ciberseguridad.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado exitosamente:', info.messageId);

    return res.status(200).json({ success: true, message: '¡Mensaje enviado con éxito! Denzel se pondrá en contacto pronto.' });
  } catch (error) {
    console.error('Error enviando SMTP:', error);
    return res.status(500).json({ success: false, message: 'Error interno en el servidor de correo.', error: error.message });
  }
}
