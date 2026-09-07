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
 * Enviar notificación al Administrador cuando una reserva se cancela/anula
 */
async function sendReservationCancelledNotification({ reservation, day, slot, weekIdx, yearMonth, cancelledBy }) {
  if (!transporter || !adminEmail) return;

  const dayName = DAY_NAMES[day] || day;
  const subject = `[Colegio HLL] ⚠️ Cancelación de Horario — ${dayName} ${slot}`;

  const contentHtml = `
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
      <tr>
        <td class="label">Cancelado por</td>
        <td class="value" style="color:#DC2626;">${cancelledBy || 'Usuario del sistema'}</td>
      </tr>
    </table>
  `;

  const html = getEmailTemplate({
    title: 'Horario Cancelado / Liberado',
    badgeColor: '#DC2626',
    badgeText: '⚠️ Cancelación Registrada',
    contentHtml
  });

  const mailOptions = {
    from: `"Sistema Reservas HLL" <${smtpUser}>`,
    to: adminEmail,
    subject,
    html
  };

  // Si el docente tenía correo asociado, enviarle copia de respaldo
  if (reservation.userEmail && reservation.userEmail !== adminEmail && reservation.userEmail.includes('@')) {
    mailOptions.cc = reservation.userEmail;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ [Email] Notificación de cancelación enviada con éxito a ${adminEmail}`);
  } catch (err) {
    console.error('❌ [Email] Error al enviar notificación de cancelación:', err.message);
  }
}

/**
 * Enviar notificación cuando se crea una nueva reserva
 */
async function sendReservationCreatedNotification({ reservation, day, slot, weekIdx, yearMonth, createdBy }) {
  if (!transporter || !adminEmail) return;

  const dayName = DAY_NAMES[day] || day;
  const isBlocked = Boolean(reservation.isBlocked);
  const subject = isBlocked
    ? `[Colegio HLL] 🔒 Bloqueo de Horario — ${dayName} ${slot}`
    : `[Colegio HLL] 📌 Nueva Reserva Agendada — ${reservation.docente} (${dayName} ${slot})`;

  const contentHtml = `
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
      <tr>
        <td class="label">Registrado por</td>
        <td class="value" style="color:#059669;">${createdBy || reservation.docente}</td>
      </tr>
    </table>
  `;

  const html = getEmailTemplate({
    title: isBlocked ? 'Bloqueo Horario Institucional' : 'Nueva Reserva Confirmada',
    badgeColor: isBlocked ? '#475569' : '#059669',
    badgeText: isBlocked ? '🔒 Bloqueo Registrado' : '📌 Reserva Confirmada',
    contentHtml
  });

  const mailOptions = {
    from: `"Sistema Reservas HLL" <${smtpUser}>`,
    to: adminEmail,
    subject,
    html
  };

  if (reservation.userEmail && reservation.userEmail !== adminEmail && reservation.userEmail.includes('@')) {
    mailOptions.cc = reservation.userEmail;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ [Email] Notificación de nueva reserva enviada con éxito a ${adminEmail}`);
  } catch (err) {
    console.error('❌ [Email] Error al enviar notificación de reserva:', err.message);
  }
}

module.exports = {
  sendReservationCancelledNotification,
  sendReservationCreatedNotification
};
