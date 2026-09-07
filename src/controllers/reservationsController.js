/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Controlador de Reservas y Bloqueos de Sala de Computación
 * ══════════════════════════════════════════════════════════════════════════════
 */

const db = require('../db');
const emailService = require('../services/emailService');

/**
 * Obtiene todas las reservas de un mes organizadas por semana y día
 */
async function getMonthReservas(req, res) {
  try {
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const yearMonth = req.query.month || currentYM;
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
    let savedSource = 'local';
    let savedId = null;

    const effectiveEmail = (userEmail || req.user?.email || '').toLowerCase().trim();

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
        effectiveEmail
      ]);

      savedSource = 'neon';
      savedId = result.rows[0]?.id;
    } else {
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
        userEmail: effectiveEmail
      };
      db.saveLocalJson(localDb);
    }

    // Notificación por correo asíncrona (no retrasa la respuesta HTTP)
    emailService.sendReservationCreatedNotification({
      reservation: {
        docente: docente || (isBlocked ? '🔒 ADMIN' : ''),
        curso: curso || (isBlocked ? 'Bloqueo Institucional' : ''),
        nota: nota || '',
        isBlocked: Boolean(isBlocked),
        userEmail: effectiveEmail
      },
      day,
      slot,
      weekIdx,
      yearMonth,
      createdBy: req.user?.name || docente
    }).catch(e => console.warn('Aviso email:', e.message));

    return res.json({
      success: true,
      id: savedId,
      message: isBlocked ? 'Bloqueo institucional registrado' : 'Reserva guardada con éxito',
      source: savedSource
    });
  } catch (err) {
    console.error('Error en createOrUpdateReserva:', err.message);
    res.status(500).json({ success: false, error: 'Error al guardar reserva' });
  }
}

/**
 * Elimina una reserva o desbloquea un horario y notifica por correo
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
    let existingResv = null;

    if (pool && db.isNeonConnected()) {
      // Consultar datos de la reserva antes de eliminarla para incluir en el correo
      const checkRes = await pool.query(`
        SELECT docente, curso, nota, is_blocked, user_email
        FROM reservas
        WHERE year_month = $1 AND week_idx = $2 AND day = $3 AND slot = $4;
      `, [yearMonth, parseInt(weekIdx, 10), day, slot]);

      existingResv = checkRes.rows[0];

      await pool.query(`
        DELETE FROM reservas
        WHERE year_month = $1 AND week_idx = $2 AND day = $3 AND slot = $4;
      `, [yearMonth, parseInt(weekIdx, 10), day, slot]);
    } else {
      // Fallback local
      const localDb = db.getLocalJson();
      const w = parseInt(weekIdx, 10);
      existingResv = localDb[yearMonth]?.[w]?.[day]?.[slot];

      if (localDb[yearMonth]?.[w]?.[day]?.[slot]) {
        delete localDb[yearMonth][w][day][slot];
        db.saveLocalJson(localDb);
      }
    }

    // Disparar correo de notificación de cancelación al Administrador
    if (existingResv) {
      emailService.sendReservationCancelledNotification({
        reservation: {
          docente: existingResv.docente,
          curso: existingResv.curso,
          nota: existingResv.nota,
          userEmail: existingResv.user_email || existingResv.userEmail
        },
        day,
        slot,
        weekIdx,
        yearMonth,
        cancelledBy: req.user?.name || 'Usuario del sistema'
      }).catch(e => console.warn('Aviso email:', e.message));
    }

    return res.json({
      success: true,
      message: 'Reserva o bloqueo eliminado con éxito',
      source: pool && db.isNeonConnected() ? 'neon' : 'local'
    });
  } catch (err) {
    console.error('Error en deleteReserva:', err.message);
    res.status(500).json({ success: false, error: 'Error al eliminar reserva' });
  }
}

/**
 * Importación masiva de reservas desde planilla Excel (Exclusivo Administrador)
 */
async function batchImportReservas(req, res) {
  try {
    const { yearMonth, mode, reservations } = req.body;

    if (!yearMonth || !Array.isArray(reservations)) {
      return res.status(400).json({
        success: false,
        message: 'Datos insuficientes. Se requiere el mes (yearMonth) y las reservas a importar.'
      });
    }

    const pool = db.getPool();
    if (!pool || !db.isNeonConnected()) {
      return res.status(500).json({
        success: false,
        message: 'Base de datos no disponible.'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Si el modo es 'replace', limpiamos el mes especificado antes de cargar
      if (mode === 'replace') {
        await client.query('DELETE FROM reservas WHERE year_month = $1;', [yearMonth]);
      }

      let count = 0;
      for (const item of reservations) {
        const { weekIdx, day, slot, docente, curso, nota, isBlocked, userEmail } = item;

        if (weekIdx === undefined || !day || !slot) continue;
        if (!docente && !curso && !isBlocked) continue; // omitir vacíos

        const normalizedDay = day.toLowerCase().trim();
        const effectiveDocente = (docente || (isBlocked ? '🔒 ADMIN' : '')).trim();
        const effectiveCurso = (curso || (isBlocked ? 'Bloqueo Institucional' : '')).trim();
        const effectiveEmail = (userEmail || req.user?.email || '').toLowerCase().trim();

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
            updated_at = CURRENT_TIMESTAMP;
        `;

        await client.query(query, [
          yearMonth,
          parseInt(weekIdx, 10),
          normalizedDay,
          slot.trim(),
          effectiveDocente,
          effectiveCurso,
          (nota || '').trim(),
          Boolean(isBlocked),
          effectiveEmail
        ]);
        count++;
      }

      await client.query('COMMIT');

      console.log(`📥 [Importación Excel] ${count} reservas procesadas para ${yearMonth} (modo: ${mode || 'merge'}) por ${req.user?.email}`);

      return res.json({
        success: true,
        message: `Planilla procesada con éxito. Se importaron ${count} reservas para el mes ${yearMonth}.`,
        count,
        yearMonth
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error en batchImportReservas:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno al importar reservas desde Excel.'
    });
  }
}

module.exports = {
  getMonthReservas,
  createOrUpdateReserva,
  deleteReserva,
  batchImportReservas
};
