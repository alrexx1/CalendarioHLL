/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Middleware de Autenticación y Autorización
 * ══════════════════════════════════════════════════════════════════════════════
 */

const { verifyToken } = require('../utils/security');

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.query.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Autenticación requerida. Token no proporcionado.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Sesión inválida o expirada. Por favor inicie sesión nuevamente.' });
  }

  req.user = payload;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'administrator') {
      return res.status(403).json({ success: false, message: 'Acceso denegado. Se requieren permisos de Administrador.' });
    }
    next();
  });
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.query.token;

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth
};
