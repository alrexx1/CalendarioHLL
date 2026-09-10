/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Middleware Centralizado de Seguridad Web y Cabeceras HTTP
 * ══════════════════════════════════════════════════════════════════════════════
 * Resuelve las vulnerabilidades detectadas en auditorías externas de seguridad:
 * - Content-Security-Policy (XSS e inyección)
 * - Strict-Transport-Security (HSTS con precarga)
 * - X-Frame-Options (Protección anti-clickjacking)
 * - X-Content-Type-Options (MIME-sniffing prevention)
 * - Referrer-Policy (Control de metadatos de navegación)
 * - Permissions-Policy (Restricción de hardware y APIs del navegador)
 * - Eliminación de huellas de servidor y framework (X-Powered-By, Server)
 * - Redirección forzada HTTP -> HTTPS
 */

function enforceHttps(req, res, next) {
  // En Render y proxies inversos, x-forwarded-proto indica el protocolo del cliente
  const proto = req.headers['x-forwarded-proto'];
  if (proto && proto === 'http') {
    // Si viene por un puerto alternativo (ej: 8080), limpiarlo para forzar el puerto 443 estándar de HTTPS
    const rawHost = req.headers['x-forwarded-host'] || req.headers.host || '';
    const isLocalhost = rawHost.startsWith('localhost') || rawHost.startsWith('127.0.0.1');
    const cleanHost = isLocalhost ? rawHost : rawHost.split(':')[0];
    return res.redirect(301, `https://${cleanHost}${req.url}`);
  }
  next();
}

function setSecurityHeaders(req, res, next) {
  // 1. Eliminar firmas del framework y servidor
  res.removeHeader('X-Powered-By');
  res.removeHeader('x-powered-by');
  res.removeHeader('Server');

  // 2. Strict-Transport-Security (HSTS)
  // Fuerza HTTPS durante 1 año, aplicable a subdominios y apto para listas de precarga
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // 3. X-Content-Type-Options
  // Impide que los navegadores interpreten archivos como un tipo MIME diferente
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 4. X-Frame-Options
  // Impide que el sitio sea incrustado en iframes ajenos (anti-clickjacking)
  res.setHeader('X-Frame-Options', 'DENY');

  // 5. Referrer-Policy
  // Protege la privacidad evitando enviar URLs completas a terceros
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 6. Permissions-Policy
  // Restringe APIs invasivas de hardware (cámara, micrófono, geolocalización, etc.)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=(), magnetometer=(), accelerometer=(), gyroscope=()'
  );

  // 7. Content-Security-Policy (CSP)
  // Permite recursos de la propia app ('self'), fuentes de Google Fonts, scripts de SheetJS/ExcelJS CDN
  // y blobs/data URIs para exportaciones de Excel y canvas
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://www.colegiohll.cl",
    "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  // 8. Cabeceras complementarias de defensa en profundidad
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  next();
}

module.exports = {
  enforceHttps,
  setSecurityHeaders
};
