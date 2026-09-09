/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Rutas de Reservas y Bloqueos
 * ══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const reservationsController = require('../controllers/reservationsController');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Consultar reservas de un mes (?month=YYYY-MM) - Acceso público de solo lectura
router.get('/', optionalAuth, reservationsController.getMonthReservas);

// Guardar o actualizar reserva / bloqueo - Requiere usuario autenticado
router.post('/', requireAuth, reservationsController.createOrUpdateReserva);

// Eliminar reserva o desbloquear - Requiere usuario autenticado
router.delete('/', requireAuth, reservationsController.deleteReserva);

// Importación masiva desde planilla Excel (Exclusivo Administrador)
router.post('/batch-import', requireAdmin, reservationsController.batchImportReservas);

// Exportar planilla Excel con diseño ejecutivo oficial
router.get('/export-excel', optionalAuth, reservationsController.exportReservasExcel);

module.exports = router;
