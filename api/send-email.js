import nodemailer from 'nodemailer';

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
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #8A2BE2;">Nuevo mensaje desde tu Portafolio</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Correo (Click para responder):</strong> <a href="mailto:${email}">${email}</a></p>
          <hr>
          <h3>Mensaje del reclutador / cliente:</h3>
          <p style="white-space: pre-wrap; background-color: #f9f9f9; padding: 15px; border-left: 4px solid #8A2BE2;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
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
