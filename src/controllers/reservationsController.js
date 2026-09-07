/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Controlador de Reservas y Bloqueos de Sala de Computación
 * ══════════════════════════════════════════════════════════════════════════════
 */

const db = require('../db');

/**
 * Obtiene todas las reservas de un mes organizadas por semana y día
 */
async function getMonthReservas(req, res) {
  try {
    const yearMonth = req.query.month || '2026-08';
    const pool = db.getPool();

    if (pool && db.isNeonConnected()) {
      const result = await pool.query(`
        SELECT id, year_month, week_idx, day, slot, docente, curso, nota, is_blocked, user_email
        FROM reservas
        WHERE year_month = $1
        ORDER BY week_idx ASC, day ASC, slot ASC;
      `, [yearMonth]);

      const weeksArray = [];
      result.rows.forEach(row => {
        const wIdx = row.week_idx;
        while (weeksArray.length <= wIdx) {
          weeksArray.push({});
        }
        if (!weeksArray[wIdx][row.day]) {
          weeksArray[wIdx][row.day] = {};
        }
        weeksArray[wIdx][row.day][row.slot] = {
          id: row.id,
          docente: row.docente,
          curso: row.curso,
          nota: row.nota,
          isBlocked: row.is_blocked,
          userEmail: row.user_email
        };
      });

      return res.json({
        success: true,
        month: yearMonth,
        source: 'neon',
        data: weeksArray
      });
    }

    // Fallback local
    const localDb = db.getLocalJson();
    return res.json({
      success: true,
      month: yearMonth,
      source: 'local',
      data: localDb[yearMonth] || []
    });
  } catch (err) {
    console.error('Error en getMonthReservas:', err.message);
    res.status(500).json({ success: false, error: 'Error al consultar reservas' });
  }
}

/**
 * Guarda o actualiza una reserva o bloqueo
 */
async function createOrUpdateReserva(req, res) {
  try {
    const { yearMonth, weekIdx, day, slot, docente, curso, nota, isBlocked, userEmail } = req.body;

    if (!yearMonth || weekIdx === undefined || !day || !slot) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos (yearMonth, weekIdx, day, slot).'
      });
    }

    const pool = db.getPool();
    if (pool && db.isNeonConnected()) {
      const query = `
        INSERT INTO reservas (year_month, week_idx, day, slot, docente, curso, nota, is_blocked, user_email, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        ON CONFLICT (year_month, week_idx, day, slot)
        DO UPDATE SET
          docente = EXCLUDED.docente,
          curso = EXCLUDED.curso,
          nota = EXCLUDED.nota,
          is_blocked = EXCLUDED.is_blocked,
          user_email = EXCLUDED.user_email,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id;
      `;
      const result = await pool.query(query, [
        yearMonth,
        parseInt(weekIdx, 10),
        day,
        slot,
        docente || (isBlocked ? '🔒 ADMIN' : ''),
        curso || (isBlocked ? 'Bloqueo Institucional' : ''),
        nota || '',
        Boolean(isBlocked),
        userEmail || ''
      ]);

      return res.json({
        success: true,
        id: result.rows[0]?.id,
        message: isBlocked ? 'Bloqueo institucional registrado' : 'Reserva guardada con éxito',
        source: 'neon'
      });
    }

    // Fallback local
    const localDb = db.getLocalJson();
    if (!localDb[yearMonth]) localDb[yearMonth] = [];
    const w = parseInt(weekIdx, 10);
    while (localDb[yearMonth].length <= w) localDb[yearMonth].push({});
    if (!localDb[yearMonth][w][day]) localDb[yearMonth][w][day] = {};

    localDb[yearMonth][w][day][slot] = {
      docente: docente || (isBlocked ? '🔒 ADMIN' : ''),
      curso: curso || (isBlocked ? 'Bloqueo Institucional' : ''),
      nota: nota || '',
      isBlocked: Boolean(isBlocked),
      userEmail: userEmail || ''
    };
    db.saveLocalJson(localDb);

    return res.json({
      success: true,
      message: 'Reserva guardada localmente',
      source: 'local'
    });
  } catch (err) {
    console.error('Error en createOrUpdateReserva:', err.message);
    res.status(500).json({ success: false, error: 'Error al guardar reserva' });
  }
}

/**
 * Elimina una reserva o desbloquea un horario
 */
async function deleteReserva(req, res) {
  try {
    const { yearMonth, weekIdx, day, slot } = req.body;

    if (!yearMonth || weekIdx === undefined || !day || !slot) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos para eliminar.'
      });
    }

    const pool = db.getPool();
    if (pool && db.isNeonConnected()) {
      await pool.query(`
        DELETE FROM reservas
        WHERE year_month = $1 AND week_idx = $2 AND day = $3 AND slot = $4;
      `, [yearMonth, parseInt(weekIdx, 10), day, slot]);

      return res.json({
        success: true,
        message: 'Reserva o bloqueo eliminado con éxito',
        source: 'neon'
      });
    }

    // Fallback local
    const localDb = db.getLocalJson();
    const w = parseInt(weekIdx, 10);
    if (localDb[yearMonth]?.[w]?.[day]?.[slot]) {
      delete localDb[yearMonth][w][day][slot];
      db.saveLocalJson(localDb);
    }

    return res.json({
      success: true,
      message: 'Eliminado localmente',
      source: 'local'
    });
  } catch (err) {
    console.error('Error en deleteReserva:', err.message);
    res.status(500).json({ success: false, error: 'Error al eliminar reserva' });
  }
}

module.exports = {
  getMonthReservas,
  createOrUpdateReserva,
  deleteReserva
};
