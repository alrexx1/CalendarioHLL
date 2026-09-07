/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Controlador de Autenticación y Cuentas de Usuario
 * ══════════════════════════════════════════════════════════════════════════════
 */

const db = require('../db');
const { verifyPassword, hashPassword, generateToken } = require('../utils/security');

/**
 * Inicio de sesión unificado (Administrador / Docente)
 */
async function login(req, res) {
  const email = (req.body.email || req.body.username || '').toLowerCase().trim();
  const password = req.body.password || '';

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Por favor ingrese su correo y contraseña.'
    });
  }

  const pool = db.getPool();
  if (pool && db.isNeonConnected()) {
    try {
      const result = await pool.query(
        `SELECT id, email, password_hash, name, role, must_change_password FROM users WHERE email = $1;`,
        [email]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        const isMatch = verifyPassword(password, user.password_hash);

        if (isMatch) {
          const token = generateToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mustChangePassword: user.must_change_password
          });

          return res.json({
            success: true,
            message: user.must_change_password
              ? 'Inicio de sesión correcto. Debe cambiar su contraseña obligatoriamente.'
              : 'Autenticación exitosa.',
            mustChangePassword: Boolean(user.must_change_password),
            user: {
              name: user.name,
              email: user.email,
              role: user.role
            },
            token
          });
        }
      }
    } catch (err) {
      console.error('Error durante autenticación en Neon:', err.message);
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Correo electrónico o contraseña incorrectos.'
  });
}

/**
 * Cambio obligatorio de contraseña (Primer inicio de sesión o actualización voluntaria)
 */
async function changePassword(req, res) {
  const userId = req.user?.userId;
  const { newPassword, confirmPassword } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'No autenticado.' });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'La nueva contraseña debe tener un mínimo de 8 caracteres.'
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Las contraseñas ingresadas no coinciden.'
    });
  }

  const pool = db.getPool();
  if (!pool || !db.isNeonConnected()) {
    return res.status(500).json({
      success: false,
      message: 'Base de datos no disponible para actualizar la contraseña.'
    });
  }

  try {
    const newHash = hashPassword(newPassword);

    const updateRes = await pool.query(`
      UPDATE users
      SET password_hash = $1,
          must_change_password = FALSE,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, name, role;
    `, [newHash, userId]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const updatedUser = updateRes.rows[0];
    const freshToken = generateToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      mustChangePassword: false
    });

    console.log(`🔒 [Seguridad] Contraseña actualizada exitosamente para: ${updatedUser.email}`);

    return res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente.',
      mustChangePassword: false,
      token: freshToken,
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (err) {
    console.error('Error al cambiar contraseña:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar la contraseña.' });
  }
}

/**
 * Registro de docente institucional (@colegiohll.cl)
 */
async function registerTeacher(req, res) {
  const email = (req.body.email || '').toLowerCase().trim();
  const name = (req.body.name || '').trim();
  const password = req.body.password || '';

  if (!email || !name || !password) {
    return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
  }

  if (!email.endsWith('@colegiohll.cl')) {
    return res.status(400).json({
      success: false,
      message: 'Solo se permiten registros con correos institucionales terminados en @colegiohll.cl.'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña debe tener al menos 8 caracteres.'
    });
  }

  const pool = db.getPool();
  if (!pool || !db.isNeonConnected()) {
    return res.status(500).json({ success: false, message: 'Base de datos no disponible.' });
  }

  try {
    const existing = await pool.query(`SELECT id FROM users WHERE email = $1;`, [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Este correo ya se encuentra registrado. Por favor inicie sesión.'
      });
    }

    const passwordHash = hashPassword(password);
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, name, role, must_change_password)
      VALUES ($1, $2, $3, 'docente', FALSE)
      RETURNING id, email, name, role;
    `, [email, passwordHash, name]);

    const newUser = result.rows[0];
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      mustChangePassword: false
    });

    return res.json({
      success: true,
      message: 'Docente registrado exitosamente.',
      token,
      user: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('Error al registrar docente:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno al registrar docente.' });
  }
}

/**
 * Verifica la validez de la sesión actual
 */
function verifySession(req, res) {
  res.json({
    success: true,
    user: req.user
  });
}

module.exports = {
  login,
  changePassword,
  registerTeacher,
  verifySession
};
