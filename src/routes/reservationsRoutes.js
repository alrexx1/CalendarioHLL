/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Rutas de Reservas y Bloqueos
 * ══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const reservationsController = require('../controllers/reservationsController');
const { optionalAuth, requireAdmin } = require('../middleware/authMiddleware');

router.use(optionalAuth);

// Consultar reservas de un mes (?month=YYYY-MM)
router.get('/', reservationsController.getMonthReservas);

// Guardar o actualizar reserva / bloqueo
router.post('/', reservationsController.createOrUpdateReserva);

// Eliminar reserva o desbloquear
router.delete('/', reservationsController.deleteReserva);

// Importación masiva desde planilla Excel (Exclusivo Administrador)
router.post('/batch-import', requireAdmin, reservationsController.batchImportReservas);

// Exportar planilla Excel con diseño ejecutivo oficial
router.get('/export-excel', reservationsController.exportReservasExcel);

module.exports = router;
