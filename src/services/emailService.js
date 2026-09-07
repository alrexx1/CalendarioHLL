/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Servicio de Notificaciones por Correo Electrónico (Nodemailer)
 * ══════════════════════════════════════════════════════════════════════════════
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

const DAY_NAMES = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes'
};

// Crear transportador de correo
let transporter = null;

const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : null;
const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : null;
const adminEmail = (process.env.ADMIN_NOTIFICATION_EMAIL || smtpUser)?.trim();

if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  // Verificar conexión SMTP al inicializar
  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️ [Email] Alerta SMTP Gmail:', error.message);
      console.warn('💡 [Email] Nota: Si Gmail rechaza la clave, asegúrese de usar una "Contraseña de Aplicación" de Google.');
    } else {
      console.log('📧 [Email] Servicio de notificaciones por correo activo y listo (' + smtpUser + ')');
    }
  });
} else {
  console.warn('⚠️ [Email] SMTP_USER o SMTP_PASS no configurados. Las notificaciones por correo estarán en modo simulación.');
}

/**
 * Plantilla HTML Institucional Base
 */
function getEmailTemplate({ title, badgeColor, badgeText, contentHtml }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F4F7FB; margin: 0; padding: 20px; }
        .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(11,37,69,0.1); border: 1px solid #E2E8F0; }
        .header { background: linear-gradient(135deg, #06162B 0%, #0B2545 60%, #133A68 100%); padding: 24px; text-align: center; border-bottom: 4px solid #D4AF37; }
        .header h1 { color: #FFFFFF; font-size: 18px; margin: 0 0 4px; font-weight: 700; letter-spacing: 0.3px; }
        .header span { color: #D4AF37; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .body { padding: 28px 24px; color: #0F172A; }
        .badge { display: inline-block; background-color: ${badgeColor}; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 99px; text-transform: uppercase; margin-bottom: 14px; }
        .title { font-size: 18px; font-weight: 700; color: #0B2545; margin: 0 0 16px; }
        .data-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
        .data-table td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; }
        .data-table td.label { font-weight: 600; color: #64748B; width: 35%; background: #F8FAFC; }
        .data-table td.value { font-weight: 700; color: #0F172A; }
        .footer { background: #F8FAFC; padding: 16px 24px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Colegio Santo Domingo Helen Lee Lassen</h1>
          <span>Sistema de Reservas — Sala de Computación</span>
        </div>
        <div class="body">
          <span class="badge">${badgeText}</span>
          <h2 class="title">${title}</h2>
          ${contentHtml}
        </div>
        <div class="footer">
          Este es un correo automático generado por el Sistema de Reservas HLL.<br>
          Por favor no responda directamente a este mensaje.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Obtiene la lista de correos de los administradores del sistema:
 * 1. Consulta la base de datos Neon para obtener todos los usuarios con rol 'administrator' (ej: rtorres@colegiohll.cl).
 * 2. Incorpora los correos definidos en la variable de entorno ADMIN_NOTIFICATION_EMAIL.
 * 3. Si no hay ninguno configurado, recurre al usuario SMTP como respaldo.
 */
async function getAdminRecipients() {
  const recipients = new Set();

  // 1. Variable de entorno ADMIN_NOTIFICATION_EMAIL (permite lista separada por comas)
  if (process.env.ADMIN_NOTIFICATION_EMAIL) {
    process.env.ADMIN_NOTIFICATION_EMAIL.split(',').forEach(e => {
      const clean = e.trim().toLowerCase();
      if (clean && clean.includes('@')) recipients.add(clean);
    });
  }

  // 2. Base de datos Neon (usuarios con rol 'administrator')
  try {
    const db = require('../db');
    const pool = db.getPool();
    if (pool) {
      const res = await pool.query(
        `SELECT email FROM users WHERE role = 'administrator' AND email IS NOT NULL;`
      );
      res.rows.forEach(r => {
        const clean = r.email?.trim().toLowerCase();
        if (clean && clean.includes('@')) recipients.add(clean);
      });
    }
  } catch (err) {
    console.warn('⚠️ [Email] Error consultando administradores en BD:', err.message);
  }

  // 3. Respaldo a SMTP_USER si no hay destinatarios
  if (recipients.size === 0 && smtpUser) {
    recipients.add(smtpUser.toLowerCase());
  }

  return Array.from(recipients);
}

/**
 * Enviar notificación al Administrador y comprobante al Docente cuando una reserva se cancela/anula
 */
async function sendReservationCancelledNotification({ reservation, day, slot, weekIdx, yearMonth, cancelledBy }) {
  if (!transporter) return;

  const dayName = DAY_NAMES[day] || day;
  const teacherEmail = reservation?.userEmail?.trim()?.toLowerCase();

  // 1. Comprobante Oficial de Cancelación al Docente (si tenía correo registrado)
  if (teacherEmail && teacherEmail.includes('@')) {
    const teacherContent = `
      <p style="font-size:15px; color:#334155; margin: 0 0 16px; line-height:1.6;">
        Estimado/a <b>${reservation.docente || 'Docente'}</b>,
      </p>
      <p style="font-size:14px; color:#475569; margin: 0 0 16px; line-height:1.5;">
        Le informamos que la reserva para la <b>Sala de Computación</b> ha sido <b>cancelada</b> y el horario correspondiente ha quedado disponible.
      </p>
      <table class="data-table">
        <tr>
          <td class="label">Docente</td>
          <td class="value">${reservation.docente || 'No especificado'}</td>
        </tr>
        <tr>
          <td class="label">Curso / Actividad</td>
          <td class="value">${reservation.curso || 'No especificado'}</td>
        </tr>
        <tr>
          <td class="label">Día</td>
          <td class="value">${dayName}</td>
        </tr>
        <tr>
          <td class="label">Bloque Horario</td>
          <td class="value">${slot}</td>
        </tr>
        <tr>
          <td class="label">Semana</td>
          <td class="value">Semana ${parseInt(weekIdx, 10) + 1} (${yearMonth})</td>
        </tr>
        <tr>
          <td class="label">Cancelado por</td>
          <td class="value" style="color:#DC2626;">${cancelledBy || 'Usuario del sistema'}</td>
        </tr>
      </table>
      <p style="font-size:13px; color:#64748B; margin: 16px 0 0;">
        Si desea agendar otro bloque horario, puede ingresar nuevamente al sistema cuando lo requiera.
      </p>
    `;

    const teacherHtml = getEmailTemplate({
      title: 'Comprobante de Cancelación de Horario',
      badgeColor: '#DC2626',
      badgeText: '⚠️ Horario Cancelado',
      contentHtml: teacherContent
    });

    try {
      await transporter.sendMail({
        from: `"Sistema Reservas HLL" <${smtpUser}>`,
        to: teacherEmail,
        subject: `[Colegio HLL] ⚠️ Cancelación de Reserva — Sala de Computación (${dayName} ${slot})`,
        html: teacherHtml
      });
      console.log(`✉️ [Email] Comprobante de cancelación enviado al docente: ${teacherEmail}`);
    } catch (err) {
      console.error(`❌ [Email] Error al enviar comprobante de cancelación a ${teacherEmail}:`, err.message);
    }
  }

  // 2. Alerta Administrativa a TODOS los Administradores (incluye rtorres@colegiohll.cl)
  const adminRecipients = await getAdminRecipients();
  const adminContent = `
    <p style="font-size:14px; color:#475569; margin: 0 0 16px; line-height:1.5;">
      Se ha <b>cancelado una reserva</b> y el bloque horario correspondiente ha quedado <b>disponible</b> en la Sala de Computación.
    </p>
    <table class="data-table">
      <tr>
        <td class="label">Docente</td>
        <td class="value">${reservation.docente || 'No especificado'}</td>
      </tr>
      <tr>
        <td class="label">Curso / Actividad</td>
        <td class="value">${reservation.curso || 'No especificado'}</td>
      </tr>
      <tr>
        <td class="label">Día</td>
        <td class="value">${dayName}</td>
      </tr>
      <tr>
        <td class="label">Bloque Horario</td>
        <td class="value">${slot}</td>
      </tr>
      <tr>
        <td class="label">Semana</td>
        <td class="value">Semana ${parseInt(weekIdx, 10) + 1} (${yearMonth})</td>
      </tr>
      ${reservation.nota ? `<tr><td class="label">Nota previa</td><td class="value">${reservation.nota}</td></tr>` : ''}
      ${teacherEmail ? `<tr><td class="label">Correo Docente</td><td class="value">${teacherEmail}</td></tr>` : ''}
      <tr>
        <td class="label">Cancelado por</td>
        <td class="value" style="color:#DC2626;">${cancelledBy || 'Usuario del sistema'}</td>
      </tr>
    </table>
  `;

  const adminHtml = getEmailTemplate({
    title: 'Horario Cancelado / Liberado',
    badgeColor: '#DC2626',
    badgeText: '⚠️ Cancelación Registrada',
    contentHtml: adminContent
  });

  for (const adminTo of adminRecipients) {
    if (adminTo === teacherEmail) {
      // Si este administrador ya recibió el comprobante de cancelación arriba, omitir duplicado
      continue;
    }

    try {
      await transporter.sendMail({
        from: `"Sistema Reservas HLL" <${smtpUser}>`,
        to: adminTo,
        subject: `[Colegio HLL] ⚠️ Aviso Administrador: Cancelación — ${dayName} ${slot}`,
        html: adminHtml
      });
      console.log(`✉️ [Email] Notificación de cancelación enviada al administrador: ${adminTo}`);
    } catch (err) {
      console.error(`❌ [Email] Error al enviar notificación de cancelación al admin (${adminTo}):`, err.message);
    }
  }
}

/**
 * Enviar comprobante oficial al Docente y notificación al Administrador al crear una reserva
 */
async function sendReservationCreatedNotification({ reservation, day, slot, weekIdx, yearMonth, createdBy }) {
  if (!transporter) return;

  const dayName = DAY_NAMES[day] || day;
  const isBlocked = Boolean(reservation?.isBlocked);
  const teacherEmail = reservation?.userEmail?.trim()?.toLowerCase();

  // 1. Enviar COMPROBANTE OFICIAL AL DOCENTE (si hay correo y no es bloqueo técnico)
  if (teacherEmail && teacherEmail.includes('@') && !isBlocked) {
    const teacherSubject = `[Colegio HLL] 📄 Comprobante de Reserva — Sala de Computación (${dayName} ${slot})`;
    const teacherContent = `
      <p style="font-size:15px; color:#334155; margin: 0 0 16px; line-height:1.6;">
        Estimado/a <b>${reservation.docente || 'Docente'}</b>,
      </p>
      <p style="font-size:14px; color:#475569; margin: 0 0 16px; line-height:1.5;">
        Su reserva para la <b>Sala de Computación</b> ha sido confirmada exitosamente en el sistema del Colegio Santo Domingo Helen Lee Lassen. A continuación los detalles de su comprobante:
      </p>
      <table class="data-table">
        <tr>
          <td class="label">Docente Responsable</td>
          <td class="value">${reservation.docente}</td>
        </tr>
        <tr>
          <td class="label">Curso / Asignatura</td>
          <td class="value">${reservation.curso}</td>
        </tr>
        <tr>
          <td class="label">Día de la Semana</td>
          <td class="value">${dayName}</td>
        </tr>
        <tr>
          <td class="label">Bloque Horario</td>
          <td class="value">${slot}</td>
        </tr>
        <tr>
          <td class="label">Semana</td>
          <td class="value">Semana ${parseInt(weekIdx, 10) + 1} (${yearMonth})</td>
        </tr>
        ${reservation.nota ? `<tr><td class="label">Observaciones</td><td class="value">${reservation.nota}</td></tr>` : ''}
        <tr>
          <td class="label">Estado de la Sala</td>
          <td class="value" style="color:#059669;">✓ Reserva Confirmada</td>
        </tr>
      </table>
      <div style="background:#F0FDF4; border-left:4px solid #16A34A; padding:12px 16px; border-radius:8px; margin:20px 0; font-size:13px; color:#166534; line-height:1.5;">
        📌 <b>Recordatorio Institucional:</b> Por favor iniciar y culminar su clase con puntualidad para respetar los bloques de los demás cursos, y supervisar que los equipos queden apagados y el aula ordenada al finalizar.
      </div>
    `;

    const teacherHtml = getEmailTemplate({
      title: 'Comprobante de Reserva de Sala',
      badgeColor: '#059669',
      badgeText: '✓ Comprobante Confirmado',
      contentHtml: teacherContent
    });

    try {
      await transporter.sendMail({
        from: `"Sistema Reservas HLL" <${smtpUser}>`,
        to: teacherEmail,
        subject: teacherSubject,
        html: teacherHtml
      });
      console.log(`✉️ [Email] Comprobante oficial de reserva enviado al docente: ${teacherEmail}`);
    } catch (err) {
      console.error(`❌ [Email] Error al enviar comprobante a ${teacherEmail}:`, err.message);
    }
  }

  // 2. Enviar NOTIFICACIÓN ADMINISTRATIVA A TODOS LOS ADMINISTRADORES (incluye rtorres@colegiohll.cl)
  const adminRecipients = await getAdminRecipients();
  const adminSubject = isBlocked
    ? `[Colegio HLL] 🔒 Bloqueo de Horario — ${dayName} ${slot}`
    : `[Colegio HLL] 📌 Nueva Reserva Agendada — ${reservation.docente} (${dayName} ${slot})`;

  const adminContent = `
    <p style="font-size:14px; color:#475569; margin: 0 0 16px; line-height:1.5;">
      ${isBlocked ? 'Se ha registrado un <b>bloqueo institucional</b> de horario.' : 'Se ha registrado una <b>nueva reserva</b> en la Sala de Computación.'}
    </p>
    <table class="data-table">
      <tr>
        <td class="label">${isBlocked ? 'Estado' : 'Docente'}</td>
        <td class="value">${reservation.docente}</td>
      </tr>
      <tr>
        <td class="label">${isBlocked ? 'Motivo' : 'Curso / Asignatura'}</td>
        <td class="value">${reservation.curso}</td>
      </tr>
      <tr>
        <td class="label">Día</td>
        <td class="value">${dayName}</td>
      </tr>
      <tr>
        <td class="label">Bloque Horario</td>
        <td class="value">${slot}</td>
      </tr>
      <tr>
        <td class="label">Semana</td>
        <td class="value">Semana ${parseInt(weekIdx, 10) + 1} (${yearMonth})</td>
      </tr>
      ${reservation.nota ? `<tr><td class="label">Observación</td><td class="value">${reservation.nota}</td></tr>` : ''}
      ${teacherEmail ? `<tr><td class="label">Correo Docente</td><td class="value">${teacherEmail}</td></tr>` : ''}
      <tr>
        <td class="label">Registrado por</td>
        <td class="value" style="color:#059669;">${createdBy || reservation.docente}</td>
      </tr>
    </table>
  `;

  const adminHtml = getEmailTemplate({
    title: isBlocked ? 'Bloqueo Horario Institucional' : 'Nueva Reserva Registrada',
    badgeColor: isBlocked ? '#475569' : '#059669',
    badgeText: isBlocked ? '🔒 Bloqueo Registrado' : '📌 Notificación Administrador',
    contentHtml: adminContent
  });

  for (const adminTo of adminRecipients) {
    if (adminTo === teacherEmail && !isBlocked) {
      // Si este administrador ya recibió el comprobante oficial como docente arriba, omitir duplicado
      continue;
    }

    try {
      await transporter.sendMail({
        from: `"Sistema Reservas HLL" <${smtpUser}>`,
        to: adminTo,
        subject: adminSubject,
        html: adminHtml
      });
      console.log(`✉️ [Email] Alerta administrativa enviada al administrador: ${adminTo}`);
    } catch (err) {
      console.error(`❌ [Email] Error al enviar notificación a admin ${adminTo}:`, err.message);
    }
  }
}

/**
 * Enviar código/token de recuperación de contraseña al usuario
 */
async function sendPasswordResetEmail({ email, name, resetCode, resetLink }) {
  if (!transporter) {
    console.warn('⚠️ [Email] Servicio SMTP no disponible para enviar código de recuperación.');
    return false;
  }

  const subject = `[Colegio HLL] 🔑 Código de Recuperación de Contraseña: ${resetCode}`;
  
  const linkButtonHtml = resetLink ? `
    <div style="text-align:center; margin:22px 0 16px;">
      <a href="${resetLink}" style="display:inline-block; background:linear-gradient(135deg, #0B2545, #133A68); color:#FFFFFF; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:700; font-size:14px; letter-spacing:0.3px; box-shadow:0 3px 10px rgba(11,37,69,0.2);">
        👉 Cambiar Mi Contraseña Directamente
      </a>
    </div>
  ` : '';

  const contentHtml = `
    <p style="font-size:15px; color:#334155; margin: 0 0 16px; line-height:1.6;">
      Estimado/a <b>${name || 'Docente'}</b>,
    </p>
    <p style="font-size:14px; color:#475569; margin: 0 0 18px; line-height:1.5;">
      Hemos recibido una solicitud para restablecer la contraseña de acceso a la Intranet y Sistema de Reservas de la Sala de Computación del Colegio Santo Domingo Helen Lee Lassen.
    </p>
    ${linkButtonHtml}
    <div style="background:#F8FAFC; border:2px dashed #D4AF37; border-radius:10px; padding:20px; text-align:center; margin:20px 0;">
      <span style="font-size:12px; color:#64748B; text-transform:uppercase; letter-spacing:1px; font-weight:700; display:block; margin-bottom:8px;">
        Su Código de Verificación
      </span>
      <span style="font-size:32px; font-weight:800; color:#0B2545; letter-spacing:6px; font-family:monospace;">
        ${resetCode}
      </span>
      <span style="font-size:12px; color:#DC2626; display:block; margin-top:8px; font-weight:600;">
        ⏱️ Válido por tiempo limitado
      </span>
    </div>
    <p style="font-size:13px; color:#64748B; margin: 0 0 8px; line-height:1.5;">
      Puede ingresar a través del botón superior o ingresar este código de 6 dígitos en la pantalla de recuperación del sistema.
    </p>
    <p style="font-size:12px; color:#94A3B8; margin: 16px 0 0; line-height:1.4; border-top:1px solid #E2E8F0; padding-top:12px;">
      Si usted no solicitó este restablecimiento, puede ignorar este mensaje; su cuenta continuará protegida con su contraseña habitual.
    </p>
  `;

  const html = getEmailTemplate({
    title: 'Recuperación de Contraseña',
    badgeColor: '#D4AF37',
    badgeText: '🔑 Seguridad de Cuenta',
    contentHtml
  });

  const mailOptions = {
    from: `"Sistema Reservas HLL" <${smtpUser}>`,
    to: email,
    subject,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ [Email] Código de recuperación enviado con éxito a ${email}`);
    return true;
  } catch (err) {
    console.error(`❌ [Email] Error al enviar código de recuperación a ${email}:`, err.message);
    throw err;
  }
}

/**
 * Enviar invitación y enlace de activación para nuevo usuario o docente registrado por el Administrador
 */
async function sendUserInvitationEmail({ email, name, resetCode, resetLink, role }) {
  if (!transporter) {
    console.warn('⚠️ [Email] Servicio SMTP no disponible para enviar invitación institucional.');
    return false;
  }

  const roleLabel = (role === 'administrator') ? 'Administrador/a de Sistema' : 'Docente';
  const subject = `[Colegio HLL] 🎓 Bienvenida y Configuración de Contraseña`;

  const linkButtonHtml = resetLink ? `
    <div style="text-align:center; margin:26px 0 18px;">
      <a href="${resetLink}" style="display:inline-block; background:linear-gradient(135deg, #0B2545, #133A68); color:#FFFFFF; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:700; font-size:15px; letter-spacing:0.3px; box-shadow:0 4px 14px rgba(11,37,69,0.25);">
        👉 Crear Mi Contraseña de Acceso
      </a>
    </div>
  ` : '';

  const contentHtml = `
    <p style="font-size:15px; color:#334155; margin: 0 0 14px; line-height:1.6;">
      Estimado/a <b>${name || 'Docente'}</b>,
    </p>
    <p style="font-size:14px; color:#475569; margin: 0 0 16px; line-height:1.5;">
      Le informamos que el Administrador del Colegio Santo Domingo Helen Lee Lassen le ha creado una cuenta oficial con perfil de <b>${roleLabel}</b> para acceder a la Intranet y Sistema de Reservas de la Sala de Computación.
    </p>
    <p style="font-size:14px; color:#475569; margin: 0 0 16px; line-height:1.5;">
      Para comenzar a reservar y gestionar sus clases, por favor presione el siguiente botón y establezca su contraseña de acceso personal:
    </p>
    ${linkButtonHtml}
    <div style="background:#F8FAFC; border:2px dashed #0B2545; border-radius:10px; padding:16px; text-align:center; margin:20px 0;">
      <span style="font-size:12px; color:#64748B; text-transform:uppercase; letter-spacing:1px; font-weight:700; display:block; margin-bottom:6px;">
        Código de Activación de Respaldo
      </span>
      <span style="font-size:28px; font-weight:800; color:#0B2545; letter-spacing:5px; font-family:monospace;">
        ${resetCode}
      </span>
      <span style="font-size:11px; color:#64748B; display:block; margin-top:6px;">
        (Si prefiere ingresar manualmente, elija "¿Olvidó su contraseña?" en la pantalla del sistema e introduzca este código)
      </span>
    </div>
    ${resetLink ? `
    <p style="font-size:12px; color:#94A3B8; margin: 16px 0 0; line-height:1.4; border-top:1px solid #E2E8F0; padding-top:12px;">
      Si el botón anterior no abre su navegador, copie y pegue el siguiente enlace directo:<br>
      <a href="${resetLink}" style="color:#0B2545; word-break:break-all;">${resetLink}</a>
    </p>
    ` : ''}
  `;

  const html = getEmailTemplate({
    title: 'Bienvenida al Sistema de Reservas HLL',
    badgeColor: '#0B2545',
    badgeText: '🎓 Nueva Cuenta Institucional',
    contentHtml
  });

  const mailOptions = {
    from: `"Sistema Reservas HLL" <${smtpUser}>`,
    to: email,
    subject,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ [Email] Invitación con link de activación enviada con éxito a ${email}`);
    return true;
  } catch (err) {
    console.error(`❌ [Email] Error al enviar invitación a ${email}:`, err.message);
    throw err;
  }
}

module.exports = {
  sendReservationCancelledNotification,
  sendReservationCreatedNotification,
  sendPasswordResetEmail,
  sendUserInvitationEmail
};
