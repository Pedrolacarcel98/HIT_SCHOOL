import nodemailer from 'nodemailer';

const frontendUrl = (process.env.FRONTEND_URL || 'https://app.hitschool.es').replace(/\/+$/, '');
const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_REPLY_TO || 'Hitschool.laspajanosas@gmail.com';
const replyToEmail = process.env.SMTP_REPLY_TO || supportEmail;
const defaultFromAddress = process.env.SMTP_FROM || 'HitSchool <no-reply@hitschool.es>';
const resendApiKey = process.env.RESEND_API_KEY || (process.env.SMTP_PASSWORD?.startsWith('re_') ? process.env.SMTP_PASSWORD : '');

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : Number(process.env.SMTP_PORT || 465) === 465,
      tls: {
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
      },
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || '' }
        : undefined
    })
  : null;

interface TransactionalMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
    cid?: string;
  }>;
}

const sendTransactionalMail = async (options: TransactionalMailOptions) => {
  // Prioridad 1: API HTTPS de Resend (puerto 443, inmune a bloqueos de puertos SMTP en Google Cloud)
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: defaultFromAddress,
          to: [options.to],
          reply_to: replyToEmail,
          subject: options.subject,
          text: options.text,
          html: options.html,
          ...(options.attachments && options.attachments.length > 0
            ? {
                attachments: options.attachments.map((att) => ({
                  filename: att.filename,
                  content: att.content.toString('base64'),
                  content_type: att.contentType,
                  ...(att.cid ? { content_id: att.cid } : {})
                }))
              }
            : {})
        })
      });

      if (response.ok) {
        return;
      }

      const errorBody = await response.text();
      console.warn(`Aviso API Resend (${response.status}), reintentando por SMTP:`, errorBody);
    } catch (apiError) {
      console.warn('Error de red al conectar con API HTTPS de Resend, usando respaldo SMTP:', apiError);
    }
  }

  // Prioridad 2 / Respaldo: Transporte SMTP estándar (Nodemailer)
  if (!transporter) {
    throw new Error('Servicio de correo (Resend / SMTP) no configurado');
  }

  await transporter.sendMail({
    from: defaultFromAddress,
    replyTo: replyToEmail,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    ...(options.attachments ? { attachments: options.attachments } : {})
  });
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const supportFooterText = () => supportEmail
  ? `Si necesitas ayuda, escribe a ${supportEmail}.`
  : 'Si necesitas ayuda, contacta con la administración de tu academia.';

const withSupportFooter = (text: string) => `${text.trimEnd()}\n\n${supportFooterText()}`;

const emailShell = (content: string) => `<!doctype html>
<html lang="es">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>HitSchool</title></head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#26352e;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;"><tr><td align="center" style="padding:16px 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e9e4;border-radius:10px;overflow:hidden;">
        <tr><td style="background:#4e9b75;padding:18px 24px;text-align:center;"><div style="font-size:21px;line-height:27px;font-weight:700;color:#ffffff;">HitSchool</div><div style="margin-top:2px;font-size:11px;line-height:16px;color:#e6f4eb;letter-spacing:.4px;">Plataforma Educativa</div></td></tr>
        <tr><td style="padding:24px;">${content}</td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #e3e9e4;color:#68756d;font-size:12px;line-height:18px;">${supportEmail ? `Para recibir ayuda, escribe a <a href="mailto:${escapeHtml(supportEmail)}" style="color:#347455;">${escapeHtml(supportEmail)}</a>.` : 'Para recibir ayuda, contacta con la administración de tu academia.'}<br>Este mensaje está relacionado con tu cuenta de HitSchool.</td></tr>
      </table>
    </td></tr></table>
  </body>
</html>`;

const emailButton = (label: string, url: string) => `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px;"><tr><td style="border-radius:7px;background:#4e9b75;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 20px;border:1px solid #4e9b75;border-radius:7px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`;

const courseBadge = (courseTitle: string) => `<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#e5f2eb;color:#347455;font-size:12px;font-weight:700;">${escapeHtml(courseTitle)}</span>`;

const teacherIdentity = (teacherName: string) => {
  const initials = teacherName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 22px;"><tr><td valign="middle" style="width:38px;height:38px;border-radius:50%;background:#dceee3;color:#347455;text-align:center;font-size:14px;font-weight:700;">${escapeHtml(initials || 'HS')}</td><td valign="middle" style="padding-left:10px;color:#53635a;font-size:13px;line-height:18px;"><span style="color:#26352e;font-weight:700;">Profesor</span><br>${escapeHtml(teacherName)}</td></tr></table>`;
};

const dueDateBadge = (dueDateText: string, hasDueDate: boolean) => `<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${hasDueDate ? '#fff0e6' : '#eef1ef'};color:${hasDueDate ? '#b65325' : '#68756d'};font-size:12px;font-weight:700;">${escapeHtml(dueDateText)}</span>`;

const credentialsCard = (email: string, temporaryPassword: string, passwordLabel = 'Clave de acceso inicial') => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0f7f4;border:1px solid #4e9b75;border-radius:8px;margin-bottom:16px;">
  <tr>
    <td style="padding:20px;text-align:center;">
      <div style="margin-bottom:6px;color:#527064;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;">Correo de acceso</div>
      <div style="color:#26352e;font-size:15px;font-weight:700;margin-bottom:14px;">${escapeHtml(email)}</div>
      <div style="margin-bottom:6px;color:#527064;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;">${escapeHtml(passwordLabel)}</div>
      <div style="color:#26352e;font-family:Consolas,'Courier New',monospace;font-size:24px;line-height:32px;font-weight:700;word-break:break-word;">${escapeHtml(temporaryPassword)}</div>
    </td>
  </tr>
</table>`;

export const sendTeacherWelcomeEmail = async (email: string, firstName: string, temporaryPassword: string) => {
  await sendTransactionalMail({
    to: email,
    subject: 'Bienvenido/a a HitSchool — Acceso a tu panel docente',
    text: withSupportFooter([
      `Hola ${firstName},`,
      '',
      'Tu cuenta de profesor en la plataforma educativa HitSchool ya está activa.',
      `Plataforma: ${frontendUrl}`,
      `Correo de acceso: ${email}`,
      `Clave de acceso inicial: ${temporaryPassword}`,
      '',
      'Puedes personalizar tu clave desde los ajustes de tu perfil tras iniciar sesión.'
    ].join('\n')),
    html: emailShell(`<h1 style="margin:0 0 12px;color:#26352e;font-size:24px;line-height:32px;">Bienvenido/a a HitSchool</h1><p style="margin:0 0 18px;font-size:15px;line-height:24px;">Hola ${escapeHtml(firstName)},</p><p style="margin:0 0 20px;font-size:15px;line-height:24px;">Tu cuenta de profesor en HitSchool ya ha sido dada de alta y está lista para acceder.</p>${credentialsCard(email, temporaryPassword)}${emailButton('Acceder a HitSchool', frontendUrl)}<p style="margin:18px 0 0;color:#748078;font-size:13px;line-height:20px;">Puedes personalizar tu clave desde los ajustes de tu cuenta después del primer acceso.</p>`)
  });

  return true;
};

export const sendAdminWelcomeEmail = async (email: string, firstName: string, temporaryPassword: string) => {
  await sendTransactionalMail({
    to: email,
    subject: 'Bienvenido/a a HitSchool — Acceso de Administración',
    text: withSupportFooter([
      `Hola ${firstName},`,
      '',
      'Tu cuenta de administración en la plataforma educativa HitSchool ya está activa.',
      `Plataforma: ${frontendUrl}`,
      `Correo de acceso: ${email}`,
      `Clave de acceso inicial: ${temporaryPassword}`,
      '',
      'Puedes personalizar tu clave desde los ajustes de tu perfil tras iniciar sesión.'
    ].join('\n')),
    html: emailShell(`<h1 style="margin:0 0 12px;color:#26352e;font-size:24px;line-height:32px;">Bienvenido/a a HitSchool</h1><p style="margin:0 0 18px;font-size:15px;line-height:24px;">Hola ${escapeHtml(firstName)},</p><p style="margin:0 0 20px;font-size:15px;line-height:24px;">Tu cuenta de administración en HitSchool ya ha sido activada y está lista para usar.</p>${credentialsCard(email, temporaryPassword)}${emailButton('Acceder a HitSchool', frontendUrl)}<p style="margin:18px 0 0;color:#748078;font-size:13px;line-height:20px;">Puedes personalizar tu clave desde los ajustes de tu cuenta después del primer acceso.</p>`)
  });

  return true;
};

export const sendParentWelcomeEmail = async (email: string, firstName: string, temporaryPassword: string) => {
  await sendTransactionalMail({
    to: email,
    subject: 'Bienvenido/a a HitSchool — Acceso al Portal Familiar',
    text: withSupportFooter([
      `Hola ${firstName},`,
      '',
      'Tu cuenta de tutor en la plataforma educativa HitSchool ya está disponible.',
      `Plataforma: ${frontendUrl}`,
      `Correo de acceso: ${email}`,
      `Clave de acceso inicial: ${temporaryPassword}`,
      '',
      'Puedes personalizar tu clave desde el menú de ajustes tras iniciar sesión.'
    ].join('\n')),
    html: emailShell(`<h1 style="margin:0 0 12px;color:#26352e;font-size:24px;line-height:32px;">Bienvenido/a a HitSchool</h1><p style="margin:0 0 18px;font-size:15px;line-height:24px;">Hola ${escapeHtml(firstName)},</p><p style="margin:0 0 20px;font-size:15px;line-height:24px;">Tu cuenta de tutor en HitSchool ya está activa para consultar el seguimiento académico y recibos.</p>${credentialsCard(email, temporaryPassword)}${emailButton('Acceder a HitSchool', frontendUrl)}<p style="margin:18px 0 0;color:#748078;font-size:13px;line-height:20px;">Puedes personalizar tu clave desde el menú de ajustes después del primer acceso.</p>`)
  });
};

export const sendStudentWelcomeEmail = async (
  email: string,
  firstName: string,
  temporaryPassword: string
) => {
  await sendTransactionalMail({
    to: email,
    subject: 'Bienvenido/a a HitSchool — Acceso a tu Aula Virtual',
    text: withSupportFooter([
      `Hola ${firstName || 'alumno'},`,
      '',
      '¡Te damos la bienvenida a HitSchool! Tu cuenta de alumno ya está disponible.',
      `Plataforma: ${frontendUrl}`,
      `Correo de acceso: ${email}`,
      `Clave de acceso inicial: ${temporaryPassword}`,
      '',
      'Puedes personalizar tu clave desde el menú de ajustes tras iniciar sesión.'
    ].join('\n')),
    html: emailShell(`
      <h1 style="margin:0 0 12px;color:#26352e;font-size:24px;line-height:32px;">Bienvenido/a a HitSchool</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:24px;">Hola ${escapeHtml(firstName || 'alumno')},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:24px;">¡Te damos la bienvenida a la plataforma educativa HitSchool! Tu cuenta de alumno ya ha sido dada de alta y está lista para acceder a tus clases.</p>
      ${credentialsCard(email, temporaryPassword)}
      ${emailButton('Acceder a HitSchool', frontendUrl)}
      <p style="margin:18px 0 0;color:#748078;font-size:13px;line-height:20px;">Puedes personalizar tu clave desde el menú de ajustes después de tu primer acceso.</p>
    `)
  });

  return true;
};

export const sendPasswordResetEmail = async (
  email: string,
  firstName: string,
  temporaryPassword: string,
  roleLabel: string
) => {
  await sendTransactionalMail({
    to: email,
    subject: 'Actualización de acceso a tu cuenta de HitSchool',
    text: withSupportFooter([
      `Hola ${firstName || ''},`,
      '',
      `Hemos generado una nueva clave de acceso para tu cuenta de ${roleLabel} en HitSchool.`,
      `Correo de acceso: ${email}`,
      `Nueva clave de acceso: ${temporaryPassword}`,
      `Plataforma: ${frontendUrl}`,
      '',
      'Puedes personalizarla desde los ajustes de tu perfil después de iniciar sesión.'
    ].join('\n')),
    html: emailShell(`<h1 style="margin:0 0 12px;color:#26352e;font-size:24px;line-height:32px;">Actualización de clave de acceso</h1><p style="margin:0 0 18px;font-size:15px;line-height:24px;">Hola ${escapeHtml(firstName || '')},</p><p style="margin:0 0 20px;font-size:15px;line-height:24px;">Hemos generado una nueva clave de acceso para tu cuenta de ${escapeHtml(roleLabel)} en HitSchool.</p>${credentialsCard(email, temporaryPassword, 'Nueva clave de acceso')}${emailButton('Acceder a HitSchool', frontendUrl)}<p style="margin:18px 0 0;color:#748078;font-size:13px;line-height:20px;">Puedes personalizarla desde los ajustes de tu perfil después de iniciar sesión.</p>`)
  });
};

export const sendAccountReactivationEmail = async (
  email: string,
  firstName: string,
  temporaryPassword: string,
  roleLabel: string
) => {
  await sendTransactionalMail({
    to: email,
    subject: 'Tu cuenta de HitSchool ha sido reactivada',
    text: withSupportFooter([
      `Hola ${firstName || ''},`,
      '',
      `Tu cuenta de ${roleLabel} en HitSchool ha sido reactivada.`,
      `Correo de acceso: ${email}`,
      `Nueva clave de acceso: ${temporaryPassword}`,
      `Plataforma: ${frontendUrl}`,
      '',
      'Puedes personalizar tu clave desde los ajustes de tu perfil tras iniciar sesión.'
    ].join('\n')),
    html: emailShell(`<h1 style="margin:0 0 12px;color:#26352e;font-size:24px;line-height:32px;">Cuenta reactivada</h1><p style="margin:0 0 18px;font-size:15px;line-height:24px;">Hola ${escapeHtml(firstName || '')},</p><p style="margin:0 0 20px;font-size:15px;line-height:24px;">Tu cuenta de ${escapeHtml(roleLabel)} en HitSchool ha sido reactivada para este curso.</p>${credentialsCard(email, temporaryPassword, 'Nueva clave de acceso')}${emailButton('Acceder a HitSchool', frontendUrl)}<p style="margin:18px 0 0;color:#748078;font-size:13px;line-height:20px;">Puedes personalizar tu clave desde los ajustes de tu perfil después de iniciar sesión.</p>`)
  });
};

export const sendBoardPostNotification = async (
  email: string,
  firstName: string,
  courseTitle: string,
  teacherName: string,
  content: string,
  courseUrl: string,
  mediaUrl?: string | null,
  mediaType?: string | null,
  mediaLinkUrl?: string | null,
  mediaInlineUrl?: string | string[] | null
) => {
  const safeCourseTitle = escapeHtml(courseTitle);
  const safeTeacherName = escapeHtml(teacherName);
  const safeContent = escapeHtml(content).replace(/\r?\n/g, '<br>');
  const safeMediaLinkUrl = escapeHtml(mediaLinkUrl || mediaUrl || '');
  let inlineImage: { cid: string; content: Buffer; contentType: string } | null = null;

  if (mediaInlineUrl && mediaType?.startsWith('image/')) {
    const inlineUrls = Array.isArray(mediaInlineUrl) ? mediaInlineUrl : [mediaInlineUrl];
    for (const inlineUrl of inlineUrls) {
      try {
        const mediaResponse = await fetch(inlineUrl);
        const contentType = mediaResponse.headers.get('content-type') || '';
        if (mediaResponse.ok && contentType.startsWith('image/')) {
          inlineImage = {
            cid: 'board-post-image',
            content: Buffer.from(await mediaResponse.arrayBuffer()),
            contentType
          };
          break;
        }
        console.warn(`No se pudo descargar la imagen del tablón desde ${inlineUrl} (${mediaResponse.status}, ${contentType}).`);
      } catch (error) {
        console.warn(`No se pudo descargar la imagen del tablón desde ${inlineUrl}:`, error);
      }
    }
  }

  const mediaPreview = inlineImage
    ? `<p style="margin:20px 0;"><a href="${safeMediaLinkUrl}"><img src="cid:${inlineImage.cid}" alt="Imagen del anuncio" width="360" style="display:block;width:360px;max-width:100%;height:auto;border-radius:8px;"></a></p>`
    : '';

  await sendTransactionalMail({
    to: email,
    subject: `Anuncio nuevo en ${courseTitle}`,
    text: withSupportFooter([
      `Hola ${firstName || ''},`,
      '',
      `Hay un nuevo anuncio en la clase ${courseTitle}.`,
      `Profesor: ${teacherName}`,
      '',
      content || 'Se ha publicado un nuevo recurso en el tablón.',
      '',
      mediaLinkUrl || mediaUrl ? `Recurso multimedia: ${mediaLinkUrl || mediaUrl}` : '',
      '',
      `Accede a la clase: ${courseUrl}`
    ].join('\n')),
    html: emailShell(`<p style="margin:0 0 18px;font-size:15px;line-height:24px;">Hola ${escapeHtml(firstName || '')},</p><div style="margin-bottom:16px;">${courseBadge(courseTitle)}</div><h1 style="margin:0 0 4px;color:#26352e;font-size:23px;line-height:31px;">Nuevo anuncio en ${safeCourseTitle}</h1>${teacherIdentity(teacherName)}<div style="padding:18px;background:#f9faf9;border:1px solid #e5ebe6;border-radius:8px;color:#33443a;font-size:15px;line-height:24px;">${safeContent || 'Se ha publicado un nuevo recurso en el tablón.'}</div>${mediaPreview}${emailButton('Ir al Tablón de la Clase', courseUrl)}`),
    ...(inlineImage ? {
      attachments: [{
        filename: 'imagen-anuncio',
        content: inlineImage.content,
        contentType: inlineImage.contentType,
        cid: inlineImage.cid
      }]
    } : {})
  });
};

export const sendStructuredTaskNotification = async (
  email: string,
  firstName: string,
  taskTitle: string,
  taskDescription: string,
  courseTitle: string,
  teacherName: string,
  dueDate: Date | null,
  taskUrl: string
) => {
  const safeTaskTitle = escapeHtml(taskTitle);
  const safeDescription = escapeHtml(taskDescription || 'Hay una nueva tarea disponible.').replace(/\r?\n/g, '<br>');
  const safeTeacherName = escapeHtml(teacherName);
  const dueDateText = dueDate ? dueDate.toLocaleString('es-ES') : 'Sin fecha límite';

  await sendTransactionalMail({
    to: email,
    subject: `Tarea nueva: ${taskTitle}`,
    text: withSupportFooter([
      `Hola ${firstName || ''},`,
      '',
      `Hay una nueva tarea en ${courseTitle}: ${taskTitle}.`,
      `Profesor: ${teacherName}`,
      `Fecha límite: ${dueDateText}`,
      '',
      taskDescription || 'Hay una nueva tarea disponible.',
      '',
      `Accede a la tarea: ${taskUrl}`
    ].join('\n')),
    html: emailShell(`<p style="margin:0 0 18px;font-size:15px;line-height:24px;">Hola ${escapeHtml(firstName || '')},</p><div style="margin-bottom:16px;">${courseBadge(courseTitle)}</div><h1 style="margin:0 0 18px;color:#26352e;font-size:23px;line-height:31px;">Nueva tarea</h1><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f9fafb;border:1px solid #e6e9e7;border-radius:8px;"><tr><td style="padding:20px;"><div style="margin-bottom:8px;color:#26352e;font-size:18px;line-height:25px;font-weight:700;">${safeTaskTitle}</div><div style="margin-bottom:16px;color:#53635a;font-size:14px;line-height:22px;">${safeDescription}</div><div style="color:#53635a;font-size:13px;line-height:20px;"><strong style="color:#26352e;">Profesor:</strong> ${safeTeacherName}</div><div style="margin-top:10px;color:#53635a;font-size:13px;line-height:20px;"><strong style="color:#26352e;">Fecha límite:</strong> ${dueDateBadge(dueDateText, Boolean(dueDate))}</div></td></tr></table>${emailButton('Ver Tarea en la Plataforma', taskUrl)}`)
  });
};
