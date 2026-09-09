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
      try {
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
      } catch (neonErr) {
        console.warn('⚠️ [Neon DB] Advertencia en getMonthReservas (usando fallback local):', neonErr.message);
      }
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

    const isAdmin = req.user?.role === 'administrator';
    const reqUserEmail = (req.user?.email || '').toLowerCase().trim();

    // 1. Solo administradores pueden registrar o alterar un bloqueo institucional
    if (isBlocked && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden aplicar o modificar bloqueos institucionales.'
      });
    }

    const pool = db.getPool();
    let savedSource = 'local';
    let savedId = null;

    // Email efectivo: los docentes siempre registran su propio email; el admin puede especificar uno si agenda por otro
    const effectiveEmail = (isAdmin && userEmail)
      ? userEmail.toLowerCase().trim()
      : reqUserEmail;

    // Verificar si ya existe una reserva en este bloque para validar permisos de sobreescritura
    let existingResv = null;
    if (pool && db.isNeonConnected()) {
      const checkRes = await pool.query(
        `SELECT docente, curso, nota, is_blocked, user_email FROM reservas WHERE year_month = $1 AND week_idx = $2 AND day = $3 AND slot = $4;`,
        [yearMonth, parseInt(weekIdx, 10), day, slot]
      );
      existingResv = checkRes.rows[0];
    } else {
      const localDb = db.getLocalJson();
      const w = parseInt(weekIdx, 10);
      existingResv = localDb[yearMonth]?.[w]?.[day]?.[slot];
    }

    const isExistingAvailable = (existingResv?.curso === 'DISPONIBLE');
    if (existingResv && !isExistingAvailable) {
      const existingIsBlocked = Boolean(existingResv.is_blocked || existingResv.isBlocked);
      const existingEmail = (existingResv.user_email || existingResv.userEmail || '').toLowerCase().trim();

      // No se puede sobreescribir un bloqueo institucional a menos que sea admin
      if (existingIsBlocked && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Este bloque cuenta con un bloqueo institucional y no puede ser modificado por docentes.'
        });
      }

      // No se puede sobreescribir la reserva de otro docente a menos que sea admin
      if (!isAdmin && existingEmail && existingEmail !== reqUserEmail) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar la reserva de otro docente.'
        });
      }
    }

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
        docente || (isBlocked ? '🔒 ADMIN' : (req.user?.name || '')),
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
        docente: docente || (isBlocked ? '🔒 ADMIN' : (req.user?.name || '')),
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
        docente: docente || (isBlocked ? '🔒 ADMIN' : (req.user?.name || '')),
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

    const isAdmin = req.user?.role === 'administrator';
    const reqUserEmail = (req.user?.email || '').toLowerCase().trim();

    const pool = db.getPool();
    let existingResv = null;

    let effectiveSlot = slot;
    if (pool && db.isNeonConnected()) {
      let checkRes = await pool.query(`
        SELECT docente, curso, nota, is_blocked, user_email, slot
        FROM reservas
        WHERE year_month = $1 AND week_idx = $2 AND day = $3 AND slot = $4;
      `, [yearMonth, parseInt(weekIdx, 10), day, slot]);

      if (checkRes.rows.length === 0 && day === 'fri') {
        const altSlot = (slot === '10:30 - 11:15') ? '11:15 - 12:00' :
                        (slot === '11:15 - 12:00') ? '10:30 - 11:15' :
                        (slot === '12:15 - 13:00') ? '13:00 - 13:45' :
                        (slot === '13:00 - 13:45') ? '12:15 - 13:00' : null;
        if (altSlot) {
          const altCheck = await pool.query(`
            SELECT docente, curso, nota, is_blocked, user_email, slot
            FROM reservas
            WHERE year_month = $1 AND week_idx = $2 AND day = $3 AND slot = $4;
          `, [yearMonth, parseInt(weekIdx, 10), day, altSlot]);
          if (altCheck.rows.length > 0) {
            checkRes = altCheck;
            effectiveSlot = altSlot;
          }
        }
      }

      existingResv = checkRes.rows[0];
    } else {
      const localDb = db.getLocalJson();
      const w = parseInt(weekIdx, 10);
      existingResv = localDb[yearMonth]?.[w]?.[day]?.[slot];
      if (!existingResv && day === 'fri') {
        const altSlot = (slot === '10:30 - 11:15') ? '11:15 - 12:00' :
                        (slot === '11:15 - 12:00') ? '10:30 - 11:15' :
                        (slot === '12:15 - 13:00') ? '13:00 - 13:45' :
                        (slot === '13:00 - 13:45') ? '12:15 - 13:00' : null;
        if (altSlot && localDb[yearMonth]?.[w]?.[day]?.[altSlot]) {
          existingResv = localDb[yearMonth][w][day][altSlot];
          effectiveSlot = altSlot;
        }
      }
    }

    // Validar permisos de eliminación
    if (existingResv) {
      const isBlockedResv = Boolean(existingResv.is_blocked || existingResv.isBlocked);
      if (isBlockedResv && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden anular bloqueos institucionales.'
        });
      }

      const ownerEmail = (existingResv.user_email || existingResv.userEmail || '').toLowerCase().trim();
      if (!isAdmin && ownerEmail && ownerEmail !== reqUserEmail) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para cancelar la reserva de otro docente.'
        });
      }
    }

    // Proceder con la eliminación en Neon o Local
    if (pool && db.isNeonConnected()) {
      await pool.query(`
        DELETE FROM reservas
        WHERE year_month = $1 AND week_idx = $2 AND day = $3 AND slot = $4;
      `, [yearMonth, parseInt(weekIdx, 10), day, effectiveSlot]);
    } else {
      const localDb = db.getLocalJson();
      const w = parseInt(weekIdx, 10);
      if (localDb[yearMonth]?.[w]?.[day]?.[effectiveSlot]) {
        delete localDb[yearMonth][w][day][effectiveSlot];
        db.saveLocalJson(localDb);
      }
    }

    // Si no se encontró en la tabla (por ejemplo un horario por defecto que aún no tenía fila persistida),
    // tomar los datos enviados por el cliente
    if (!existingResv && (req.body.docente || req.body.curso)) {
      existingResv = {
        docente: req.body.docente,
        curso: req.body.curso,
        nota: req.body.nota,
        user_email: req.body.userEmail
      };
    }

    // Disparar correo de notificación de cancelación al Administrador y Docente
    const resvToCancel = existingResv || {
      docente: req.body.docente || 'Docente',
      curso: req.body.curso || 'Reserva Horaria',
      nota: req.body.nota || '',
      user_email: req.body.userEmail
    };

    emailService.sendReservationCancelledNotification({
      reservation: {
        docente: resvToCancel.docente || 'Docente',
        curso: resvToCancel.curso || 'Reserva',
        nota: resvToCancel.nota || '',
        userEmail: resvToCancel.user_email || resvToCancel.userEmail
      },
      day,
      slot,
      weekIdx,
      yearMonth,
      cancelledBy: req.user?.name || req.user?.email || 'Docente HLL'
    }).catch(e => console.warn('Aviso email cancelación:', e.message));

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

/**
 * Exporta las reservas de un mes a un archivo Excel (.xlsx) con diseño institucional
 */
async function exportReservasExcel(req, res) {
  try {
    const ExcelJS = require('exceljs');
    const path = require('path');
    const fs = require('fs');

    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const yearMonth = req.query.month || currentYM;
    const [year, month] = yearMonth.split('-');

    const MONTH_NAMES = {
      '01': 'ENERO', '02': 'FEBRERO', '03': 'MARZO', '04': 'ABRIL',
      '05': 'MAYO', '06': 'JUNIO', '07': 'JULIO', '08': 'AGOSTO',
      '09': 'SEPTIEMBRE', '10': 'OCTUBRE', '11': 'NOVIEMBRE', '12': 'DICIEMBRE'
    };
    const monthName = MONTH_NAMES[month] || 'SEPTIEMBRE';

    // Obtener reservas de Neon DB
    const pool = db.getPool();
    const weeksData = [{}, {}, {}, {}, {}];

    if (pool && db.isNeonConnected()) {
      const result = await pool.query(`
        SELECT week_idx, day, slot, docente, curso, is_blocked
        FROM reservas
        WHERE year_month = $1
        ORDER BY week_idx ASC, day ASC, slot ASC;
      `, [yearMonth]);

      result.rows.forEach(r => {
        const wIdx = r.week_idx || 0;
        if (!weeksData[wIdx]) weeksData[wIdx] = {};
        if (!weeksData[wIdx][r.day]) weeksData[wIdx][r.day] = {};
        weeksData[wIdx][r.day][r.slot] = {
          docente: r.docente,
          curso: r.curso,
          isBlocked: r.is_blocked
        };
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Colegio Santo Domingo Helen Lee Lassen';
    workbook.created = new Date();

    const logoPath = path.join(__dirname, '../../public/icons/icon-192.png');
    let logoImageId = null;
    if (fs.existsSync(logoPath)) {
      logoImageId = workbook.addImage({
        filename: logoPath,
        extension: 'png'
      });
    }

    const borderThin = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
    const fillNavy = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2545' } };
    const fillNavySub = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF134074' } };
    const fillMetaLabel = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    const fillMetaVal = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    const fillSlot = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    const fillBlocked = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
    const fillWhite = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

    const fontTitle = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0B2545' } };
    const fontHeaderDays = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    const fontSubheader = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    const fontMetaLabel = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0B2545' } };
    const fontMetaValue = { name: 'Calibri', size: 10.5, color: { argb: 'FF1E293B' } };
    const fontSlotBadge = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0B2545' } };
    const fontDocente = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
    const fontCurso = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };

    for (let wIdx = 0; wIdx < 5; wIdx++) {
      const ws = workbook.addWorksheet(`SEMANA_0${wIdx + 1}`, {
        views: [{ showGridLines: true }]
      });

      ws.columns = [
        { key: 'colA', width: 4 },
        { key: 'colB', width: 17 },
        { key: 'colC', width: 25 },
        { key: 'colD', width: 19 },
        { key: 'colE', width: 25 },
        { key: 'colF', width: 19 },
        { key: 'colG', width: 25 },
        { key: 'colH', width: 19 },
        { key: 'colI', width: 25 },
        { key: 'colJ', width: 19 },
        { key: 'colK', width: 17 },
        { key: 'colL', width: 25 },
        { key: 'colM', width: 19 }
      ];

      // Fila 1
      ws.getRow(1).height = 10;

      // Fila 2: Título + Logo
      ws.getRow(2).height = 44;
      ws.mergeCells('C2:J2');
      const tCell = ws.getCell('C2');
      tCell.value = `Registro y Uso de Sala de Computación ${year}`;
      tCell.font = fontTitle;
      tCell.alignment = { vertical: 'middle', horizontal: 'left' };

      if (logoImageId !== null) {
        ws.addImage(logoImageId, {
          tl: { col: 1.15, row: 1.15 },
          ext: { width: 44, height: 44 },
          editAs: 'oneCell'
        });
      }

      // Fila 3
      ws.getRow(3).height = 10;

      // Fila 4: MES DE
      ws.getRow(4).height = 24;
      const b4 = ws.getCell('B4');
      b4.value = 'MES DE:';
      b4.font = fontMetaLabel;
      b4.fill = fillMetaLabel;
      b4.border = borderThin;
      b4.alignment = { vertical: 'middle', horizontal: 'center' };

      ws.mergeCells('C4:D4');
      const c4 = ws.getCell('C4');
      c4.value = monthName;
      c4.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0B2545' } };
      c4.fill = fillMetaVal;
      c4.alignment = { vertical: 'middle', horizontal: 'center' };
      ['C4', 'D4'].forEach(c => ws.getCell(c).border = borderThin);

      // Fila 5: Fechas
      const fromDay = 1 + wIdx * 7;
      const toDay = Math.min(fromDay + 4, 31);
      ws.getRow(5).height = 24;

      const b5 = ws.getCell('B5');
      b5.value = 'SEMANA DEL';
      b5.font = fontMetaLabel;
      b5.fill = fillMetaLabel;
      b5.border = borderThin;
      b5.alignment = { vertical: 'middle', horizontal: 'center' };

      ws.mergeCells('C5:D5');
      const c5 = ws.getCell('C5');
      c5.value = `${fromDay}/${parseInt(month, 10)}/${year}`;
      c5.font = fontMetaValue;
      c5.fill = fillMetaVal;
      c5.alignment = { vertical: 'middle', horizontal: 'center' };
      ['C5', 'D5'].forEach(c => ws.getCell(c).border = borderThin);

      const e5 = ws.getCell('E5');
      e5.value = 'HASTA EL';
      e5.font = fontMetaLabel;
      e5.fill = fillMetaLabel;
      e5.border = borderThin;
      e5.alignment = { vertical: 'middle', horizontal: 'center' };

      ws.mergeCells('F5:G5');
      const f5 = ws.getCell('F5');
      f5.value = `${toDay}/${parseInt(month, 10)}/${year}`;
      f5.font = fontMetaValue;
      f5.fill = fillMetaVal;
      f5.alignment = { vertical: 'middle', horizontal: 'center' };
      ['F5', 'G5'].forEach(c => ws.getCell(c).border = borderThin);

      // Fila 6
      ws.getRow(6).height = 12;

      // Fila 7: Días
      ws.getRow(7).height = 28;
      const days = [
        { s: 'C', e: 'D', name: 'LUNES' },
        { s: 'E', e: 'F', name: 'MARTES' },
        { s: 'G', e: 'H', name: 'MIERCOLES' },
        { s: 'I', e: 'J', name: 'JUEVES' },
        { s: 'L', e: 'M', name: 'VIERNES' }
      ];
      days.forEach(d => {
        ws.mergeCells(`${d.s}7:${d.e}7`);
        const cell = ws.getCell(`${d.s}7`);
        cell.value = d.name;
        cell.font = fontHeaderDays;
        cell.fill = fillNavy;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getCell(`${d.s}7`).border = borderThin;
        ws.getCell(`${d.e}7`).border = borderThin;
      });

      // Fila 8: Subencabezados
      ws.getRow(8).height = 22;
      ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M'].forEach((col, idx) => {
        const cell = ws.getCell(`${col}8`);
        cell.value = (idx % 2 === 0) ? 'DOCENTE' : 'CURSO';
        cell.font = fontSubheader;
        cell.fill = fillNavySub;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = borderThin;
      });

      // Reservas de la semana
      const resWeek = weeksData[wIdx] || {};
      const mon = resWeek.mon || {};
      const tue = resWeek.tue || {};
      const wed = resWeek.wed || {};
      const thu = resWeek.thu || {};
      const fri = resWeek.fri || {};

      const rowsDef = [
        {
          r: 9, slotMain: '08:00 - 08:45', slotFri: '08:00 - 08:45',
          data: {
            C: mon['08:00 - 08:45']?.docente || '', D: mon['08:00 - 08:45']?.curso || '',
            E: tue['08:00 - 08:45']?.docente || '', F: tue['08:00 - 08:45']?.curso || '',
            G: wed['08:00 - 08:45']?.docente || '', H: wed['08:00 - 08:45']?.curso || '',
            I: thu['08:00 - 08:45']?.docente || '', J: thu['08:00 - 08:45']?.curso || '',
            L: fri['08:00 - 08:45']?.docente || '', M: fri['08:00 - 08:45']?.curso || ''
          },
          defaultBlocked: ['C', 'D', 'L', 'M']
        },
        {
          r: 10, slotMain: '08:45 - 09:30', slotFri: '08:45 - 09:30',
          data: {
            C: mon['08:45 - 09:30']?.docente || '', D: mon['08:45 - 09:30']?.curso || '',
            E: tue['08:45 - 09:30']?.docente || '', F: tue['08:45 - 09:30']?.curso || '',
            G: wed['08:45 - 09:30']?.docente || '', H: wed['08:45 - 09:30']?.curso || '',
            I: thu['08:45 - 09:30']?.docente || '', J: thu['08:45 - 09:30']?.curso || '',
            L: fri['08:45 - 09:30']?.docente || '', M: fri['08:45 - 09:30']?.curso || ''
          },
          defaultBlocked: ['L', 'M']
        },
        {
          r: 11, slotMain: '09:30 - 10:15', slotFri: '',
          data: {
            C: mon['09:30 - 10:15']?.docente || '', D: mon['09:30 - 10:15']?.curso || '',
            E: tue['09:30 - 10:15']?.docente || '', F: tue['09:30 - 10:15']?.curso || '',
            G: wed['09:30 - 10:15']?.docente || '', H: wed['09:30 - 10:15']?.curso || '',
            I: thu['09:30 - 10:15']?.docente || '', J: thu['09:30 - 10:15']?.curso || '',
            L: '', M: ''
          },
          defaultBlocked: ['E', 'F']
        },
        { r: 12, isBreak: true },
        {
          r: 13, slotMain: '10:30 - 11:15', slotFri: '09:45 - 10:30',
          data: {
            C: mon['10:30 - 11:15']?.docente || '', D: mon['10:30 - 11:15']?.curso || '',
            E: tue['10:30 - 11:15']?.docente || '', F: tue['10:30 - 11:15']?.curso || '',
            G: wed['10:30 - 11:15']?.docente || '', H: wed['10:30 - 11:15']?.curso || '',
            I: thu['10:30 - 11:15']?.docente || '', J: thu['10:30 - 11:15']?.curso || '',
            L: fri['09:45 - 10:30']?.docente || '', M: fri['09:45 - 10:30']?.curso || ''
          },
          defaultBlocked: []
        },
        {
          r: 14, slotMain: '11:15 - 12:00', slotFri: '10:30 - 11:15',
          data: {
            C: mon['11:15 - 12:00']?.docente || '', D: mon['11:15 - 12:00']?.curso || '',
            E: tue['11:15 - 12:00']?.docente || '', F: tue['11:15 - 12:00']?.curso || '',
            G: wed['11:15 - 12:00']?.docente || '', H: wed['11:15 - 12:00']?.curso || '',
            I: thu['11:15 - 12:00']?.docente || '', J: thu['11:15 - 12:00']?.curso || '',
            L: fri['10:30 - 11:15']?.docente || '', M: fri['10:30 - 11:15']?.curso || ''
          },
          defaultBlocked: []
        },
        { r: 15, isBreak: true },
        {
          r: 16, slotMain: '12:15 - 13:00', slotFri: '11:30 - 12:15',
          data: {
            C: mon['12:15 - 13:00']?.docente || '', D: mon['12:15 - 13:00']?.curso || '',
            E: tue['12:15 - 13:00']?.docente || '', F: tue['12:15 - 13:00']?.curso || '',
            G: wed['12:15 - 13:00']?.docente || '', H: wed['12:15 - 13:00']?.curso || '',
            I: thu['12:15 - 13:00']?.docente || '', J: thu['12:15 - 13:00']?.curso || '',
            L: (fri['11:30 - 12:15'] || fri['11:15 - 12:00'])?.docente || '', M: (fri['11:30 - 12:15'] || fri['11:15 - 12:00'])?.curso || ''
          },
          defaultBlocked: ['I', 'J']
        },
        {
          r: 17, slotMain: '13:00 - 13:45', slotFri: '12:15 - 13:00',
          data: {
            C: mon['13:00 - 13:45']?.docente || '', D: mon['13:00 - 13:45']?.curso || '',
            E: tue['13:00 - 13:45']?.docente || '', F: tue['13:00 - 13:45']?.curso || '',
            G: wed['13:00 - 13:45']?.docente || '', H: wed['13:00 - 13:45']?.curso || '',
            I: thu['13:00 - 13:45']?.docente || '', J: thu['13:00 - 13:45']?.curso || '',
            L: (fri['12:15 - 13:00'] || fri['13:00 - 13:45'])?.docente || '', M: (fri['12:15 - 13:00'] || fri['13:00 - 13:45'])?.curso || ''
          },
          defaultBlocked: ['I', 'J', 'L', 'M']
        },
        { r: 18, isBreak: true },
        {
          r: 19, slotMain: '14:30 - 15:15', slotFri: '',
          data: {
            C: mon['14:30 - 15:15']?.docente || '', D: mon['14:30 - 15:15']?.curso || '',
            E: tue['14:30 - 15:15']?.docente || '', F: tue['14:30 - 15:15']?.curso || '',
            G: wed['14:30 - 15:15']?.docente || '', H: wed['14:30 - 15:15']?.curso || '',
            I: thu['14:30 - 15:15']?.docente || '', J: thu['14:30 - 15:15']?.curso || '',
            L: '', M: ''
          },
          defaultBlocked: []
        },
        {
          r: 20, slotMain: '15:15 - 16:00', slotFri: '',
          data: {
            C: mon['15:15 - 16:00']?.docente || '', D: mon['15:15 - 16:00']?.curso || '',
            E: tue['15:15 - 16:00']?.docente || '', F: tue['15:15 - 16:00']?.curso || '',
            G: wed['15:15 - 16:00']?.docente || '', H: wed['15:15 - 16:00']?.curso || '',
            I: thu['15:15 - 16:00']?.docente || '', J: thu['15:15 - 16:00']?.curso || '',
            L: '', M: ''
          },
          defaultBlocked: []
        }
      ];

      rowsDef.forEach(item => {
        const row = ws.getRow(item.r);
        if (item.isBreak) {
          row.height = 10;
          ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(c => {
            ws.getCell(`${c}${item.r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
          return;
        }

        row.height = 28;

        const bCell = ws.getCell(`B${item.r}`);
        bCell.value = item.slotMain;
        bCell.font = fontSlotBadge;
        bCell.fill = fillSlot;
        bCell.alignment = { vertical: 'middle', horizontal: 'center' };
        bCell.border = borderThin;

        const dayCols = [
          { d: 'C', c: 'D' },
          { d: 'E', c: 'F' },
          { d: 'G', c: 'H' },
          { d: 'I', c: 'J' },
        ];

        dayCols.forEach(pair => {
          const docVal = item.data[pair.d] || '';
          const curVal = item.data[pair.c] || '';
          const curUpper = curVal.toUpperCase();
          const docUpper = docVal.toUpperCase();
          const isSinBloque = curUpper.includes('SIN BLOQUE') || docUpper.includes('SIN BLOQUE');
          const isOverrideFree = (curUpper === 'DISPONIBLE');
          const isBlocked = !isOverrideFree && !isSinBloque && (
            item.defaultBlocked.includes(pair.d) ||
            docUpper.includes('BLOQUEO') ||
            curUpper.includes('BLOQUEO')
          );

          const dCell = ws.getCell(`${pair.d}${item.r}`);
          const cCell = ws.getCell(`${pair.c}${item.r}`);

          dCell.value = (isBlocked || isSinBloque || isOverrideFree) ? '' : docVal;
          cCell.value = (isBlocked || isSinBloque || isOverrideFree) ? '' : curVal;

          dCell.font = fontDocente;
          cCell.font = fontCurso;
          dCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          dCell.border = borderThin;
          cCell.border = borderThin;

          if (isBlocked) {
            dCell.fill = fillBlocked;
            cCell.fill = fillBlocked;
          } else {
            let cellFill = fillWhite;
            if (curUpper.includes('EDUTEN')) {
              cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
            } else if (curUpper.includes('BEEVERSO')) {
              cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
            } else if (curUpper.includes('MEDIO')) {
              cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
            }
            dCell.fill = cellFill;
            cCell.fill = cellFill;
          }
        });

        if (item.slotFri) {
          const kCell = ws.getCell(`K${item.r}`);
          kCell.value = item.slotFri;
          kCell.font = fontSlotBadge;
          kCell.fill = fillSlot;
          kCell.alignment = { vertical: 'middle', horizontal: 'center' };
          kCell.border = borderThin;

          const docVal = item.data.L || '';
          const curVal = item.data.M || '';
          const curUpper = curVal.toUpperCase();
          const docUpper = docVal.toUpperCase();
          const isSinBloque = curUpper.includes('SIN BLOQUE') || docUpper.includes('SIN BLOQUE');
          const isOverrideFree = (curUpper === 'DISPONIBLE');
          const isBlocked = !isOverrideFree && !isSinBloque && (
            item.defaultBlocked.includes('L') ||
            docUpper.includes('BLOQUEO') ||
            curUpper.includes('BLOQUEO')
          );

          const lCell = ws.getCell(`L${item.r}`);
          const mCell = ws.getCell(`M${item.r}`);

          lCell.value = (isBlocked || isSinBloque || isOverrideFree) ? '' : docVal;
          mCell.value = (isBlocked || isSinBloque || isOverrideFree) ? '' : curVal;

          lCell.font = fontDocente;
          mCell.font = fontCurso;
          lCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          mCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          lCell.border = borderThin;
          mCell.border = borderThin;

          if (isBlocked) {
            lCell.fill = fillBlocked;
            mCell.fill = fillBlocked;
          } else {
            let cellFill = fillWhite;
            if (curUpper.includes('EDUTEN')) {
              cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
            } else if (curUpper.includes('BEEVERSO')) {
              cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
            } else if (curUpper.includes('MEDIO')) {
              cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
            }
            lCell.fill = cellFill;
            mCell.fill = cellFill;
          }
        }
      });

      // Fila 21: Espacio
      ws.getRow(21).height = 10;

      // Fila 22: NOTA institucional idéntica a la captura
      ws.getRow(22).height = 24;
      const noteTag = ws.getCell('B22');
      noteTag.value = 'NOTA:';
      noteTag.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0B2545' } };
      noteTag.alignment = { vertical: 'middle', horizontal: 'right' };

      const noteLabel = ws.getCell('C22');
      noteLabel.value = 'Los bloques';
      noteLabel.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF1E293B' } };
      noteLabel.alignment = { vertical: 'middle', horizontal: 'center' };

      const sampleBox = ws.getCell('D22');
      sampleBox.value = '';
      sampleBox.fill = fillBlocked;
      sampleBox.border = borderThin;

      ws.mergeCells('E22:H22');
      const noteText = ws.getCell('E22');
      noteText.value = 'no está disponible la sala.';
      noteText.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF1E293B' } };
      noteText.alignment = { vertical: 'middle', horizontal: 'left' };
    }

    const fileName = `${month}_${monthName}_SALA_DE_COMPUTACION_${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error en exportReservasExcel:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error al exportar planilla Excel.' });
    }
  }
}

module.exports = {
  getMonthReservas,
  createOrUpdateReserva,
  deleteReserva,
  batchImportReservas,
  exportReservasExcel
};

