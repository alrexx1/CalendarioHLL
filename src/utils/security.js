/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Utilidades de Seguridad — Hashing de Contraseñas y Gestión de Tokens
 * ══════════════════════════════════════════════════════════════════════════════
 */

const crypto = require('crypto');

const SECRET_KEY = process.env.SESSION_SECRET || 'hll_secret_super_secure_key_2026';

/**
 * Hashea una contraseña usando scrypt con salt aleatorio
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifica una contraseña contra el hash almacenado (formato salt:hash)
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;

  const [salt, key] = storedHash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);

  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

/**
 * Genera un token de sesión seguro con payload y firma HMAC
 */
function generateToken(payload) {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
  });
  const dataB64 = Buffer.from(data).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(dataB64).digest('base64url');
  return `${dataB64}.${signature}`;
}

/**
 * Valida y extrae el payload de un token
 */
function verifyToken(token) {
  if (!token || !token.includes('.')) return null;

  const [dataB64, signature] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(dataB64).digest('base64url');

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expirado
    }
    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken
};
