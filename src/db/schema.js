/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Esquema DDL de Base de Datos — PostgreSQL
 * ══════════════════════════════════════════════════════════════════════════════
 */

const db = require('./index');

async function initSchema() {
  const pool = db.getPool();
  if (!pool) return false;

  const client = await pool.connect();
  try {
    console.log('🔄 [Neon DB] Creando/Verificando tablas (users, reservas)...');

    // Tabla de Usuarios y Administradores
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(150) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'docente',
        must_change_password BOOLEAN DEFAULT TRUE,
        reset_token VARCHAR(255) DEFAULT NULL,
        reset_token_expires TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) DEFAULT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ DEFAULT NULL;

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Tabla de Reservas de Sala de Computación
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id SERIAL PRIMARY KEY,
        year_month VARCHAR(7) NOT NULL,
        week_idx INTEGER NOT NULL,
        day VARCHAR(3) NOT NULL,
        slot VARCHAR(30) NOT NULL,
        docente VARCHAR(150) NOT NULL,
        curso VARCHAR(150) NOT NULL,
        nota TEXT DEFAULT '',
        is_blocked BOOLEAN DEFAULT FALSE,
        user_email VARCHAR(150) DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_slot_per_week UNIQUE (year_month, week_idx, day, slot)
      );

      CREATE INDEX IF NOT EXISTS idx_reservas_ym ON reservas(year_month);
    `);

    db.setIsConnected(true);
    console.log('✅ [Neon DB] Esquema verificado con éxito.');
    return true;
  } catch (err) {
    console.error('❌ [Neon DB] Error al crear tablas:', err.message);
    db.setIsConnected(false);
    return false;
  } finally {
    client.release();
  }
}

module.exports = {
  initSchema
};
