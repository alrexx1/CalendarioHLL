/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Middleware de Rate Limiting (Protección contra Ataques de Fuerza Bruta)
 * ══════════════════════════════════════════════════════════════════════════════
 */

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 10, message = 'Demasiadas solicitudes. Por favor espere unos minutos antes de reintentar.' }) {
  const hits = new Map();

  // Limpieza periódica de IPs inactivas cada 5 minutos para evitar fugas de memoria
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now - record.startTime > windowMs) {
        hits.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
  if (timer && timer.unref) timer.unref();

  return function rateLimiter(req, res, next) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip || 'unknown';
    const now = Date.now();

    let record = hits.get(ip);
    if (!record || (now - record.startTime > windowMs)) {
      record = { count: 1, startTime: now };
      hits.set(ip, record);
      return next();
    }

    record.count++;

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      console.warn(`🛡️ [Seguridad] Rate limit excedido para IP ${ip} en ${req.originalUrl}. Bloqueado por ${retryAfterSeconds}s.`);
      return res.status(429).json({
        success: false,
        message: `${message} (Intente nuevamente en ${Math.ceil(retryAfterSeconds / 60)} min).`,
        retryAfter: retryAfterSeconds
      });
    }

    next();
  };
}

// 1. Límite para inicio de sesión: máx. 10 intentos cada 10 minutos por IP
const authLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de acceso fallidos. Por seguridad institucional de la Intranet HLL, su conexión ha sido temporalmente restringida.'
});

// 2. Límite para solicitud de recuperación de contraseña: máx. 5 intentos cada 15 minutos por IP
const forgotLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Ha alcanzado el límite de solicitudes de recuperación de contraseña.'
});

module.exports = {
  authLimiter,
  forgotLimiter
};
