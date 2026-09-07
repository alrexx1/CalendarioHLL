/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Ruta de Monitoreo de Salud (Render & Neon)
 * ══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Sistema de Reservas Sala de Computación HLL',
    neonConnected: db.isNeonConnected(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
