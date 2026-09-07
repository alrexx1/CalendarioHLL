/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Servicio Inteligente de Mantenimiento Activo (Anti-Sleep para Render)
 * ══════════════════════════════════════════════════════════════════════════════
 */

const PING_INTERVAL_MS = 12 * 60 * 1000; // 12 minutos (Render suspende a los 15 min)

function isSchoolHours() {
  try {
    // Calcular la hora local en Chile (Colegio Santo Domingo HLL)
    const options = { timeZone: 'America/Santiago', hour12: false, weekday: 'short', hour: 'numeric', minute: 'numeric' };
    const formatter = new Intl.DateTimeFormat('es-CL', options);
    const parts = formatter.formatToParts(new Date());

    const weekdayPart = parts.find(p => p.type === 'weekday')?.value.toLowerCase() || '';
    const hourPart = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minutePart = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

    // Días escolares: lunes a viernes
    const isWeekday = !weekdayPart.startsWith('sáb') && !weekdayPart.startsWith('dom') && !weekdayPart.startsWith('sat') && !weekdayPart.startsWith('sun');

    // Horario escolar: 07:00 a 19:30 hrs
    const totalMinutes = hourPart * 60 + minutePart;
    const startMinutes = 7 * 60; // 07:00
    const endMinutes = 19 * 60 + 30; // 19:30

    return isWeekday && totalMinutes >= startMinutes && totalMinutes <= endMinutes;
  } catch {
    // Si falla la conversión de zona horaria, operar por defecto
    const d = new Date();
    const day = d.getDay();
    const hour = d.getUTCHours() - 3; // UTC-3 aproximado
    return day >= 1 && day <= 5 && hour >= 7 && hour < 20;
  }
}

function initKeepAlive(port = 3000) {
  // Render asigna automáticamente RENDER_EXTERNAL_URL en producción
  const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;

  if (!externalUrl) {
    console.log('ℹ️ [KeepAlive] Modo local detectado. El servicio de ping externo se activará en Render.');
    return;
  }

  const pingEndpoint = `${externalUrl.replace(/\/$/, '')}/api/health`;
  console.log(`⚡ [KeepAlive] Servicio Anti-Suspensión activado hacia: ${pingEndpoint}`);

  // Ejecutar el primer ping tras 1 minuto de arranque
  setTimeout(() => pingServer(pingEndpoint), 60 * 1000);

  // Intervalo recurrente cada 12 minutos
  setInterval(() => pingServer(pingEndpoint), PING_INTERVAL_MS);
}

async function pingServer(endpoint) {
  if (!isSchoolHours()) {
    console.log('🌙 [KeepAlive] Fuera de horario escolar. Servidor en modo ahorro de cuota mensual.');
    return;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'User-Agent': 'HLL-KeepAlive-Bot/1.0' }
    });
    if (res.ok) {
      console.log(`🔄 [KeepAlive] Ping institucional exitoso (Código ${res.status}) — Servidor activo.`);
    } else {
      console.warn(`⚠️ [KeepAlive] Ping respondió con código: ${res.status}`);
    }
  } catch (err) {
    console.warn(`⚠️ [KeepAlive] Aviso al realizar ping: ${err.message}`);
  }
}

module.exports = {
  initKeepAlive,
  isSchoolHours
};
