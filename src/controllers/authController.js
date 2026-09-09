/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Controlador de Autenticación y Cuentas de Usuario
 * ══════════════════════════════════════════════════════════════════════════════
 */

const db = require('../db');
const crypto = require('crypto');
const { verifyPassword, hashPassword, generateToken } = require('../utils/security');
const emailService = require('../services/emailService');

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
  if (!pool || !db.isNeonConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Servicio de base de datos no disponible temporalmente. Por favor intente en unos momentos.'
    });
  }

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

    return res.status(401).json({
      success: false,
      message: 'Correo electrónico o contraseña incorrectos.'
    });
  } catch (err) {
    console.error('Error durante autenticación en Neon:', err.message);
    return res.status(503).json({
      success: false,
      message: 'Servicio de base de datos no disponible temporalmente. Por favor intente en unos momentos.'
    });
  }
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
 * Solicitar código de recuperación de contraseña vía correo electrónico
 */
async function forgotPassword(req, res) {
  const email = (req.body.email || '').toLowerCase().trim();

  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Por favor ingrese un correo electrónico válido.'
    });
  }

  const pool = db.getPool();
  if (!pool || !db.isNeonConnected()) {
    return res.status(500).json({
      success: false,
      message: 'Servicio de base de datos no disponible temporalmente.'
    });
  }

  try {
    const userRes = await pool.query(
      `SELECT id, email, name, role FROM users WHERE email = $1;`,
      [email]
    );

    if (userRes.rows.length === 0) {
      // Por seguridad evitamos enumeración de correos
      return res.json({
        success: true,
        message: 'Si el correo ingresado está registrado, se enviará un código de verificación en breve.'
      });
    }

    const user = userRes.rows[0];

    // Generar código numérico de 6 dígitos
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await pool.query(`
      UPDATE users
      SET reset_token = $1,
          reset_token_expires = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3;
    `, [resetCode, expiresAt, user.id]);

    // Enviar código por correo
    await emailService.sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetCode
    });

    return res.json({
      success: true,
      message: `Hemos enviado un código de verificación de 6 dígitos a ${user.email}.`
    });
  } catch (err) {
    console.error('Error en forgotPassword:', err.message);
    return res.status(500).json({
      success: false,
      message: 'No fue posible procesar la solicitud de recuperación. Intente más tarde.'
    });
  }
}

/**
 * Restablecer contraseña con código de verificación
 */
async function resetPassword(req, res) {
  const email = (req.body.email || '').toLowerCase().trim();
  const resetCode = (req.body.resetCode || req.body.code || '').trim();
  const { newPassword, confirmPassword } = req.body;

  if (!email || !resetCode || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son obligatorios.'
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'La nueva contraseña debe tener mínimo 8 caracteres.'
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Las contraseñas no coinciden.'
    });
  }

  const pool = db.getPool();
  if (!pool || !db.isNeonConnected()) {
    return res.status(500).json({
      success: false,
      message: 'Base de datos no disponible.'
    });
  }

  try {
    const userRes = await pool.query(`
      SELECT id, email, name, role, reset_token, reset_token_expires
      FROM users
      WHERE email = $1;
    `, [email]);

    if (userRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Código de verificación inválido o usuario no encontrado.'
      });
    }

    const user = userRes.rows[0];

    if (!user.reset_token || user.reset_token !== resetCode) {
      return res.status(400).json({
        success: false,
        message: 'El código de verificación ingresado es incorrecto.'
      });
    }

    if (!user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'El código de verificación ha expirado. Solicite uno nuevo.'
      });
    }

    // Hashear nueva contraseña
    const newHash = hashPassword(newPassword);

    await pool.query(`
      UPDATE users
      SET password_hash = $1,
          must_change_password = FALSE,
          reset_token = NULL,
          reset_token_expires = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `, [newHash, user.id]);

    // Generar token de sesión para inicio automático
    const freshToken = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: false
    });

    console.log(`🔑 [Seguridad] Contraseña restablecida con éxito para: ${user.email}`);

    return res.json({
      success: true,
      message: '¡Contraseña restablecida exitosamente!',
      token: freshToken,
      user: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Error en resetPassword:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno al restablecer la contraseña.'
    });
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

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * MÉTODOS DE ADMINISTRACIÓN DE USUARIOS (Exclusivo Rol 'administrator')
 * ══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Obtiene todos los usuarios del sistema junto con el conteo de reservas
 */
async function getAllUsers(req, res) {
  const pool = db.getPool();
  if (!pool || !db.isNeonConnected()) {
    return res.status(500).json({ success: false, message: 'Base de datos no disponible.' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.role, 
        u.must_change_password, 
        u.created_at, 
        u.updated_at,
        COUNT(r.id)::int AS total_reservas
      FROM users u
      LEFT JOIN reservas r ON LOWER(r.user_email) = LOWER(u.email)
      GROUP BY u.id
      ORDER BY 
        CASE WHEN u.role = 'administrator' THEN 0 ELSE 1 END,
        u.name ASC;
    `);

    return res.json({
      success: true,
      users: result.rows
    });
  } catch (err) {
    console.error('Error al listar usuarios:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno al consultar usuarios.' });
  }
}

/**
 * Modifica el rol de un usuario (docente <-> administrator)
 */
async function updateUserRole(req, res) {
  const targetId = parseInt(req.params.id, 10);
  const { role } = req.body;
  const currentAdminId = req.user.userId;

  if (isNaN(targetId)) {
    return res.status(400).json({ success: false, message: 'ID de usuario inválido.' });
  }

  if (!['docente', 'administrator'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Rol no permitido. Debe ser "docente" o "administrator".' });
  }

  // Evitar que el administrador se quite permisos a sí mismo
  if (targetId === currentAdminId && role !== 'administrator') {
    return res.status(400).json({
      success: false,
      message: 'Por seguridad institucional, no puede revocar sus propios permisos de Administrador.'
    });
  }

  const pool = db.getPool();
  if (!pool || !db.isNeonConnected()) {
    return res.status(500).json({ success: false, message: 'Base de datos no disponible.' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role;`,
      [role, targetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const updated = result.rows[0];
    console.log(`🛡️ [Admin] Rol actualizado para ${updated.email}: ${updated.role} (por admin ID ${currentAdminId})`);

    return res.json({
      success: true,
      message: `Rol de ${updated.name} actualizado a "${updated.role === 'administrator' ? 'Administrador' : 'Docente'}" exitosamente.`,
      user: updated
    });
  } catch (err) {
    console.error('Error al actualizar rol:', err.message);
    return res.status(500).json({ success: false, message: 'Error al cambiar rol del usuario.' });
  }
}

/**
 * Restablece la contraseña de un usuario desde el panel de administración
 * Puede asignar una contraseña manual/temporal obligatoria o enviar correo de reseteo
 */
async function adminResetUserPassword(req, res) {
  const targetId = parseInt(req.params.id, 10);
  const { mode, temporaryPassword } = req.body; // mode: 'temporary' | 'email'

  if (isNaN(targetId)) {
    return res.status(400).json({ success: false, message: 'ID de usuario inválido.' });
  }

  const pool = db.getPool();
  if (!pool || !db.isNeonConnected()) {
    return res.status(500).json({ success: false, message: 'Base de datos no disponible.' });
  }

  try {
    const userRes = await pool.query(`SELECT id, email, name, role FROM users WHERE id = $1;`, [targetId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    const user = userRes.rows[0];

    if (mode === 'email') {
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const resetLink = `${baseUrl}/sala_computacion.html?action=reset&email=${encodeURIComponent(user.email)}&code=${resetCode}`;

      await pool.query(
        `UPDATE users SET reset_token = $1, reset_token_expires = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3;`,
        [resetCode, expiresAt, user.id]
      );

      // Enviar correo con plantilla oficial y enlace directo
      await emailService.sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetCode,
        resetLink
      });

      return res.json({
        success: true,
        message: `Se envió un correo con el código y enlace de recuperación a ${user.email}.`
      });
    } else {
      // Modo 'temporary': Asignar contraseña temporal
      const newPass = (temporaryPassword && temporaryPassword.trim().length >= 8) 
        ? temporaryPassword.trim() 
        : `HLL${Math.floor(1000 + Math.random() * 9000)}*`;

      const newHash = hashPassword(newPass);

      await pool.query(`
        UPDATE users 
        SET password_hash = $1, 
            must_change_password = TRUE, 
            reset_token = NULL, 
            reset_token_expires = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2;
      `, [newHash, user.id]);

      console.log(`🔑 [Admin] Contraseña temporal asignada a ${user.email}: ${newPass}`);

      return res.json({
        success: true,
        message: `Contraseña temporal asignada exitosamente para ${user.name}. Al iniciar sesión se le exigirá cambiarla.`,
        temporaryPassword: newPass
      });
    }
  } catch (err) {
    console.error('Error al resetear contraseña como admin:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno al restablecer contraseña.' });
  }
}

/**
 * Crea un nuevo usuario / docente desde el panel de administración
 * Opciones disponibles:
 * 1. mode === 'email': Envía enlace y código para que cree su propia contraseña
 * 2. mode === 'temporary': Asigna contraseña provisional con cambio obligatorio al primer ingreso
 */
async function createUser(req, res) {
  const email = (req.body.email || '').toLowerCase().trim();
  const name = (req.body.name || '').trim();
  const role = (req.body.role === 'administrator') ? 'administrator' : 'docente';
  const mode = req.body.mode || 'email'; // 'email' | 'temporary'
  const temporaryPassword = (req.body.temporaryPassword || '').trim();

  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Por favor ingrese un correo electrónico válido.'
    });
  }

  // Si no se proporcionó nombre, tomar prefijo del correo
  const displayName = name || email.split('@')[0];

  const pool = db.getPool();
  if (!pool || !db.isNeonConnected()) {
    return res.status(500).json({ success: false, message: 'Base de datos no disponible.' });
  }

  try {
    // Comprobar si ya existe el correo
    const existing = await pool.query(`SELECT id, email, name FROM users WHERE email = $1;`, [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `El correo "${email}" ya se encuentra registrado en el sistema.`
      });
    }

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    if (mode === 'email') {
      // 1. Enviar enlace por correo para que cree contraseña
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas de vigencia para activación
      // Hash temporal aleatorio imposible de adivinar para proteger la cuenta hasta que active
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const dummyHash = hashPassword(randomSecret);

      const result = await pool.query(`
        INSERT INTO users (email, name, role, password_hash, reset_token, reset_token_expires, must_change_password)
        VALUES ($1, $2, $3, $4, $5, $6, FALSE)
        RETURNING id, email, name, role;
      `, [email, displayName, role, dummyHash, resetCode, expiresAt]);

      const newUser = result.rows[0];
      const resetLink = `${baseUrl}/sala_computacion.html?action=reset&email=${encodeURIComponent(newUser.email)}&code=${resetCode}`;

      // Enviar correo de bienvenida con enlace de activación
      try {
        await emailService.sendUserInvitationEmail({
          email: newUser.email,
          name: newUser.name,
          resetCode,
          resetLink,
          role: newUser.role
        });
      } catch (mailErr) {
        console.warn(`⚠️ [Admin] Usuario creado pero no se pudo enviar correo a ${email}:`, mailErr.message);
      }

      console.log(`👤 [Admin] Nuevo usuario creado con invitación: ${newUser.name} (${newUser.email}) - Rol: ${newUser.role}`);

      return res.json({
        success: true,
        message: `Usuario ${newUser.name} registrado con éxito. Se ha enviado un correo con el enlace de activación a ${newUser.email}.`,
        user: newUser,
        mode: 'email'
      });
    } else {
      // 2. Contraseña temporal: debe cambiarla obligatoriamente al ingresar
      const tempPass = (temporaryPassword && temporaryPassword.length >= 8)
        ? temporaryPassword
        : `HLL${Math.floor(1000 + Math.random() * 9000)}*`;

      const passwordHash = hashPassword(tempPass);

      const result = await pool.query(`
        INSERT INTO users (email, name, role, password_hash, must_change_password)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING id, email, name, role;
      `, [email, displayName, role, passwordHash]);

      const newUser = result.rows[0];
      console.log(`👤 [Admin] Nuevo usuario creado con clave temporal: ${newUser.name} (${newUser.email})`);

      return res.json({
        success: true,
        message: `Usuario ${newUser.name} registrado exitosamente con clave temporal. Al ingresar se le exigirá cambiarla de inmediato.`,
        user: newUser,
        temporaryPassword: tempPass,
        mode: 'temporary'
      });
    }
  } catch (err) {
    console.error('Error al crear usuario como admin:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno al crear usuario.' });
  }
}

/**
 * Elimina un usuario del sistema (Excluye al administrador en sesión)
 */
async function deleteUser(req, res) {
  const targetId = parseInt(req.params.id, 10);
  const currentAdminId = req.user.userId;

  if (isNaN(targetId)) {
    return res.status(400).json({ success: false, message: 'ID de usuario inválido.' });
  }

  if (targetId === currentAdminId) {
    return res.status(400).json({ success: false, message: 'No puede eliminar su propia cuenta de administrador.' });
  }

  const pool = db.getPool();
  if (!pool || !db.isNeonConnected()) {
    return res.status(500).json({ success: false, message: 'Base de datos no disponible.' });
  }

  try {
    const result = await pool.query(`DELETE FROM users WHERE id = $1 RETURNING email, name;`, [targetId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const deleted = result.rows[0];
    console.log(`🗑️ [Admin] Usuario eliminado: ${deleted.name} (${deleted.email})`);

    return res.json({
      success: true,
      message: `El usuario ${deleted.name} (${deleted.email}) ha sido eliminado correctamente.`
    });
  } catch (err) {
    console.error('Error al eliminar usuario:', err.message);
    return res.status(500).json({ success: false, message: 'Error al eliminar usuario.' });
  }
}

module.exports = {
  login,
  changePassword,
  registerTeacher,
  forgotPassword,
  resetPassword,
  verifySession,
  getAllUsers,
  createUser,
  updateUserRole,
  adminResetUserPassword,
  deleteUser
};
