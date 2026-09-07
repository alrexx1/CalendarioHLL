/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Rutas de Autenticación y Cuentas
 * ══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Inicio de sesión unificado
router.post('/login', authController.login);
router.post('/login-teacher', authController.login);

// Cambio obligatorio o voluntario de contraseña
router.post('/change-password', requireAuth, authController.changePassword);

// Registro de docentes institucionales
router.post('/register-teacher', authController.registerTeacher);

// Recuperación y restablecimiento de contraseña
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Verificación de sesión actual
router.get('/me', requireAuth, authController.verifySession);

module.exports = router;
