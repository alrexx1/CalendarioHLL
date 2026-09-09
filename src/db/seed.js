/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Módulo de Sembrado Inicial (Admin por defecto & Horarios)
 * ══════════════════════════════════════════════════════════════════════════════
 */

const db = require('./index');
const { DEFAULT_ADMIN, AUGUST_2026_DEFAULT } = require('../config/constants');
const { hashPassword } = require('../utils/security');

async function seedInitialData() {
  const pool = db.getPool();
  if (!pool || !db.isNeonConnected()) return;

  let client = null;
  try {
    client = await pool.connect();
    // 1. Verificar y sembrar Administrador inicial
    const adminCheck = await client.query(
      `SELECT id, email, must_change_password FROM users WHERE role = 'administrator' LIMIT 1;`
    );

    if (adminCheck.rows.length === 0 && DEFAULT_ADMIN.email && DEFAULT_ADMIN.initialPassword) {
      console.log('🌱 [Neon DB] Creando Administrador inicial configurado en variables de entorno...');
      const passwordHash = hashPassword(DEFAULT_ADMIN.initialPassword);

      await client.query(`
        INSERT INTO users (email, password_hash, name, role, must_change_password)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING;
      `, [
        DEFAULT_ADMIN.email,
        passwordHash,
        DEFAULT_ADMIN.name,
        DEFAULT_ADMIN.role,
        true // Debe cambiar la contraseña obligatoriamente al primer ingreso
      ]);

      console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║ 🔑 ADMINISTRADOR INICIAL REGISTRADO (Neon DB)                                 ║
║ • Correo:      ${DEFAULT_ADMIN.email}                                         ║
║ • Estado:      Cambio obligatorio de contraseña requerido en el 1er acceso   ║
╚══════════════════════════════════════════════════════════════════════════════╝
      `);
    }

    // 2. Verificar y sembrar horarios por defecto de Agosto 2026
    const resvCheck = await client.query(
      `SELECT COUNT(*) FROM reservas WHERE year_month = '2026-08';`
    );
    const count = parseInt(resvCheck.rows[0].count, 10);

    if (count === 0) {
      console.log('🌱 [Neon DB] Sembrando horarios base de Agosto 2026...');
      for (let weekIdx = 0; weekIdx < AUGUST_2026_DEFAULT.length; weekIdx++) {
        const weekData = AUGUST_2026_DEFAULT[weekIdx];
        for (const [day, slots] of Object.entries(weekData)) {
          for (const [slot, item] of Object.entries(slots)) {
            await client.query(`
              INSERT INTO reservas (year_month, week_idx, day, slot, docente, curso, nota, is_blocked)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (year_month, week_idx, day, slot) DO NOTHING;
            `, [
              '2026-08',
              weekIdx,
              day,
              slot,
              item.docente || '',
              item.curso || '',
              item.nota || '',
              Boolean(item.isBlocked)
            ]);
          }
        }
      }
      console.log('✓ [Neon DB] Horarios base insertados exitosamente.');
    }
  } catch (err) {
    console.error('❌ [Neon DB] Error durante la siembra de datos iniciales:', err.message);
  } finally {
    if (client) client.release();
  }
}

module.exports = {
  seedInitialData
};
