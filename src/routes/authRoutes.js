/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Rutas de Autenticación y Cuentas
 * ══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { authLimiter, forgotLimiter } = require('../middleware/rateLimiter');

// Inicio de sesión unificado con protección anti-fuerza bruta
router.post('/login', authLimiter, authController.login);
router.post('/login-teacher', authLimiter, authController.login);

// Cambio obligatorio o voluntario de contraseña
router.post('/change-password', requireAuth, authController.changePassword);

// Registro de docentes institucionales
router.post('/register-teacher', authController.registerTeacher);

// Recuperación y restablecimiento de contraseña
router.post('/forgot-password', forgotLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Verificación de sesión actual
router.get('/me', requireAuth, authController.verifySession);

// ═══════════════════════════════════════════════════════════════════
// Rutas Administrativas de Gestión de Usuarios y Docentes
// ═══════════════════════════════════════════════════════════════════
router.get('/users', requireAdmin, authController.getAllUsers);
router.post('/users', requireAdmin, authController.createUser);
router.patch('/users/:id/role', requireAdmin, authController.updateUserRole);
router.post('/users/:id/reset-password', requireAdmin, authController.adminResetUserPassword);
router.delete('/users/:id', requireAdmin, authController.deleteUser);

module.exports = router;
