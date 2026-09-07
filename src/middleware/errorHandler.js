/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Middleware de Manejo Centralizado de Errores
 * ══════════════════════════════════════════════════════════════════════════════
 */

function errorHandler(err, req, res, next) {
  console.error('💥 [Error no controlado]:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = errorHandler;
