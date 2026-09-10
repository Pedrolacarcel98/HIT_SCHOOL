import nodemailer from 'nodemailer';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || '' }
        : undefined
    })
  : null;

export const sendTeacherWelcomeEmail = async (email: string, firstName: string, temporaryPassword: string) => {
  if (!transporter) {
    console.warn('SMTP no configurado; no se envió el correo de bienvenida del profesor.');
    return false;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Bienvenido a HitSchool',
    text: [
      `Hola ${firstName},`,
      '',
      'Tu cuenta de profesor de HitSchool ya está disponible.',
      `Acceso: ${frontendUrl}`,
      `Correo: ${email}`,
      `Contraseña temporal: ${temporaryPassword}`,
      '',
      'Te recomendamos cambiar la contraseña después del primer inicio de sesión.'
    ].join('\n'),
    html: `<p>Hola ${firstName},</p><p>Tu cuenta de profesor de HitSchool ya está disponible.</p><p><strong>Acceso:</strong> <a href="${frontendUrl}">${frontendUrl}</a><br><strong>Correo:</strong> ${email}<br><strong>Contraseña temporal:</strong> ${temporaryPassword}</p><p>Te recomendamos cambiar la contraseña después del primer inicio de sesión.</p>`
  });

  return true;
};
