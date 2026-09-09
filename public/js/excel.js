/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Módulo de Exportación e Importación de Planillas Excel (SheetJS)
 * Formato Oficial Idéntico al Documento Institucional HLL
 * ══════════════════════════════════════════════════════════════════════════════
 */

const ExcelExport = {
  parsedReservations: [],
  selectedFile: null,

  MONTH_NAMES: {
    '01': 'ENERO',
    '02': 'FEBRERO',
    '03': 'MARZO',
    '04': 'ABRIL',
    '05': 'MAYO',
    '06': 'JUNIO',
    '07': 'JULIO',
    '08': 'AGOSTO',
    '09': 'SEPTIEMBRE',
    '10': 'OCTUBRE',
    '11': 'NOVIEMBRE',
    '12': 'DICIEMBRE'
  },

  STANDARD_SLOTS: [
    '08:00 - 08:45',
    '08:45 - 09:30',
    '09:30 - 10:15',
    '09:45 - 10:30',
    '10:30 - 11:15',
    '11:15 - 12:00',
    '11:30 - 12:15',
    '12:15 - 13:00',
    '13:00 - 13:45',
    '14:30 - 15:15',
    '15:15 - 16:00'
  ],

  init() {
    // 1. Botón Exportar
    const btnExport = document.getElementById('btn-export-excel');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportCurrentMonth());
    }

    // 2. Botón Importar (Abre modal)
    const btnImport = document.getElementById('btn-import-excel');
    if (btnImport) {
      btnImport.addEventListener('click', () => this.openImportModal());
    }

    // 3. Modal de Importación
    const modalClose = document.getElementById('import-excel-close');
    const modalCancel = document.getElementById('import-cancel-btn');
    const overlay = document.getElementById('import-excel-overlay');

    if (modalClose) modalClose.addEventListener('click', () => this.closeImportModal());
    if (modalCancel) modalCancel.addEventListener('click', () => this.closeImportModal());
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeImportModal();
      });
    }

    // 4. Descargar Plantilla Oficial
    const btnTemplate = document.getElementById('btn-download-template');
    if (btnTemplate) {
      btnTemplate.addEventListener('click', () => this.downloadTemplate());
    }

    // 5. Zona de Carga / Drag & Drop
    const dropzone = document.getElementById('excel-dropzone');
    const fileInput = document.getElementById('excel-file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) this.processFile(file);
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--primary)';
        dropzone.style.background = 'rgba(11,37,69,0.06)';
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--border-light)';
        dropzone.style.background = 'var(--bg-surface-2)';
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-light)';
        dropzone.style.background = 'var(--bg-surface-2)';
        const file = e.dataTransfer.files?.[0];
        if (file) this.processFile(file);
      });
    }

    // 6. Botón Confirmar Importación
    const submitBtn = document.getElementById('import-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.executeImport());
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // CONSTRUCCIÓN DEL FORMATO INSTITUCIONAL OFICIAL CON EXCELJS
  // Logo, colores institucionales, anchos holgados y alturas ejecutivas
  // ═══════════════════════════════════════════════════════════════════
  async buildStyledExcelSheet(workbook, week, yearMonth, weekIdx, logoBuffer) {
    const [year, month] = (yearMonth || Calendar.currentYearMonth || '2026-09').split('-');
    const monthName = this.MONTH_NAMES[month] || 'SEPTIEMBRE';

    // Formatear fechas D/M/YYYY (compatible con Date objetos o cadenas ISO/locales)
    const fromDate = week?.from ? (week.from instanceof Date ? week.from : new Date(week.from)) : null;
    const toDate = week?.to ? (week.to instanceof Date ? week.to : new Date(week.to)) : null;
    const fromStr = fromDate && !isNaN(fromDate.getTime()) ? `${fromDate.getDate()}/${fromDate.getMonth() + 1}/${fromDate.getFullYear()}` : '';
    const toStr = toDate && !isNaN(toDate.getTime()) ? `${toDate.getDate()}/${toDate.getMonth() + 1}/${toDate.getFullYear()}` : '';

    const res = week?.reservations || {};
    const mon = res.mon || {};
    const tue = res.tue || {};
    const wed = res.wed || {};
    const thu = res.thu || {};
    const fri = res.fri || {};

    const sheetName = `SEMANA_0${weekIdx + 1}`;
    const ws = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }]
    });

    // Ancho de columnas espacioso y bien distribuido (para no verse apretado)
    ws.columns = [
      { key: 'colA', width: 4 },    // Margen izquierdo
      { key: 'colB', width: 17 },   // Horario Lunes-Jueves
      { key: 'colC', width: 25 },   // Lunes Docente
      { key: 'colD', width: 19 },   // Lunes Curso
      { key: 'colE', width: 25 },   // Martes Docente
      { key: 'colF', width: 19 },   // Martes Curso
      { key: 'colG', width: 25 },   // Miércoles Docente
      { key: 'colH', width: 19 },   // Miércoles Curso
      { key: 'colI', width: 25 },   // Jueves Docente
      { key: 'colJ', width: 19 },   // Jueves Curso
      { key: 'colK', width: 17 },   // Horario Viernes
      { key: 'colL', width: 25 },   // Viernes Docente
      { key: 'colM', width: 19 }    // Viernes Curso
    ];

    // Estilos de fuentes institucionales
    const fontTitle = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0B2545' } };
    const fontHeaderDays = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    const fontSubheader = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    const fontMetaLabel = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0B2545' } };
    const fontMetaValue = { name: 'Calibri', size: 10.5, color: { argb: 'FF1E293B' } };
    const fontSlotBadge = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0B2545' } };
    const fontDocente = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
    const fontCurso = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };

    // Estilos de bordes y rellenos
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

    // Fila 1: Margen superior
    ws.getRow(1).height = 10;

    // Fila 2: Cabecera con Logo en B2 y Título en C2:J2
    ws.getRow(2).height = 44;
    ws.mergeCells('C2:J2');
    const titleCell = ws.getCell('C2');
    titleCell.value = `Registro y Uso de Sala de Computación ${year}`;
    titleCell.font = fontTitle;
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // Incrustar Logo oficial si está disponible
    if (logoBuffer) {
      try {
        const imageId = workbook.addImage({
          buffer: logoBuffer,
          extension: 'png'
        });
        ws.addImage(imageId, {
          tl: { col: 1.15, row: 1.15 },
          ext: { width: 44, height: 44 },
          editAs: 'oneCell'
        });
      } catch (err) {
        console.warn('No fue posible incrustar el logo en Excel:', err);
      }
    }

    // Fila 3: Espaciado
    ws.getRow(3).height = 10;

    // Fila 4: MES DE: [MES]
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

    // Fila 5: SEMANA DEL [D/M/YYYY] HASTA EL [D/M/YYYY]
    ws.getRow(5).height = 24;
    const b5 = ws.getCell('B5');
    b5.value = 'SEMANA DEL';
    b5.font = fontMetaLabel;
    b5.fill = fillMetaLabel;
    b5.border = borderThin;
    b5.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('C5:D5');
    const c5 = ws.getCell('C5');
    c5.value = fromStr;
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
    f5.value = toStr;
    f5.font = fontMetaValue;
    f5.fill = fillMetaVal;
    f5.alignment = { vertical: 'middle', horizontal: 'center' };
    ['F5', 'G5'].forEach(c => ws.getCell(c).border = borderThin);

    // Fila 6: Espaciado antes de la tabla
    ws.getRow(6).height = 12;

    // Fila 7: Días de la semana (Azul Marino HLL)
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

    // Fila 8: Subencabezados DOCENTE / CURSO
    ws.getRow(8).height = 22;
    ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M'].forEach((col, idx) => {
      const cell = ws.getCell(`${col}8`);
      cell.value = (idx % 2 === 0) ? 'DOCENTE' : 'CURSO';
      cell.font = fontSubheader;
      cell.fill = fillNavySub;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderThin;
    });

    // Definición de filas, bloques y celdas institucionales no disponibles
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
          L: fri['09:30 - 10:15']?.docente || '', M: fri['09:30 - 10:15']?.curso || ''
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

      // Altura amplia y espaciosa (28pt) para evitar el aspecto apretado
      row.height = 28;

      // Col B: Horario Lunes a Jueves
      const bCell = ws.getCell(`B${item.r}`);
      bCell.value = item.slotMain;
      bCell.font = fontSlotBadge;
      bCell.fill = fillSlot;
      bCell.alignment = { vertical: 'middle', horizontal: 'center' };
      bCell.border = borderThin;

      // Celdas Lunes a Jueves
      const dayCols = [
        { d: 'C', c: 'D' }, // Lunes
        { d: 'E', c: 'F' }, // Martes
        { d: 'G', c: 'H' }, // Miércoles
        { d: 'I', c: 'J' }, // Jueves
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

      // Horario y Celdas de Viernes
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
  },

  // ═══════════════════════════════════════════════════════════════════
  // EXPORTACIÓN DE PLANILLAS DEL MES ACTUAL (DISEÑO PROFESIONAL EXCELJS)
  // ═══════════════════════════════════════════════════════════════════
  async exportCurrentMonth() {
    if (typeof ExcelJS === 'undefined') {
      alert('La librería ExcelJS no está cargada.');
      return;
    }

    try {
      showToast('⏳ Generando planilla ejecutiva con diseño oficial...');
      const ym = Calendar.currentYearMonth || '2026-09';
      const [year, month] = ym.split('-');
      const monthName = this.MONTH_NAMES[month] || 'SEPTIEMBRE';

      // Obtener logo del colegio
      let logoBuffer = null;
      try {
        let resp = await fetch('icons/icon-192.png').catch(() => null);
        if (!resp || !resp.ok) {
          resp = await fetch('/icons/icon-192.png').catch(() => null);
        }
        if (resp && resp.ok) logoBuffer = await resp.arrayBuffer();
      } catch (e) {
        console.warn('Logo no disponible:', e);
      }

      if (!Calendar.activeWeeks || Calendar.activeWeeks.length === 0) {
        Calendar.activeWeeks = Calendar.buildMonthStructure(ym);
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Colegio Santo Domingo Helen Lee Lassen';
      workbook.created = new Date();

      for (let wIdx = 0; wIdx < Calendar.activeWeeks.length; wIdx++) {
        const w = Calendar.activeWeeks[wIdx];
        await this.buildStyledExcelSheet(workbook, w, ym, wIdx, logoBuffer);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `${month}_${monthName}_SALA_DE_COMPUTACION_${year}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(`📥 Planilla exportada con éxito: ${fileName}`);
    } catch (err) {
      console.error('Error al exportar planilla:', err);
      showToast(`❌ Error al exportar la planilla Excel: ${err.message || 'Error desconocido'}`, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // DESCARGA DE PLANTILLA MODELO OFICIAL (VACÍA CON ESTILO INSTITUCIONAL)
  // ═══════════════════════════════════════════════════════════════════
  async downloadTemplate() {
    if (typeof ExcelJS === 'undefined') {
      alert('La librería ExcelJS no está cargada.');
      return;
    }

    try {
      showToast('⏳ Generando plantilla oficial con diseño institucional...');
      const ym = Calendar.currentYearMonth || '2026-09';
      const [year, month] = ym.split('-');
      const monthName = this.MONTH_NAMES[month] || 'SEPTIEMBRE';

      let logoBuffer = null;
      try {
        let resp = await fetch('icons/icon-192.png').catch(() => null);
        if (!resp || !resp.ok) {
          resp = await fetch('/icons/icon-192.png').catch(() => null);
        }
        if (resp && resp.ok) logoBuffer = await resp.arrayBuffer();
      } catch (e) {
        console.warn('Logo no disponible:', e);
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Colegio Santo Domingo Helen Lee Lassen';
      workbook.created = new Date();

      // Generar 5 semanas modelo con sus rangos estimados
      for (let wIdx = 0; wIdx < 5; wIdx++) {
        const sampleWeek = {
          from: new Date(Number(year), Number(month) - 1, 1 + wIdx * 7),
          to: new Date(Number(year), Number(month) - 1, 5 + wIdx * 7),
          reservations: {}
        };
        await this.buildStyledExcelSheet(workbook, sampleWeek, ym, wIdx, logoBuffer);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `${month}_${monthName}_SALA_DE_COMPUTACION_${year}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(`📄 Plantilla oficial descargada: ${fileName}`);
    } catch (err) {
      console.error('Error al descargar plantilla:', err);
      showToast(`❌ Error al generar la plantilla oficial: ${err.message || 'Error desconocido'}`, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // MODAL DE IMPORTACIÓN
  // ═══════════════════════════════════════════════════════════════════
  openImportModal() {
    const overlay = document.getElementById('import-excel-overlay');
    const monthSelect = document.getElementById('import-month-select');
    const yearSelect = document.getElementById('import-year-select');
    const submitBtn = document.getElementById('import-submit-btn');
    const errBox = document.getElementById('import-error');
    const previewArea = document.getElementById('import-preview-area');
    const dropText = document.getElementById('dropzone-text');
    const fileInput = document.getElementById('excel-file-input');

    if (Calendar.currentYearMonth) {
      const [y, m] = Calendar.currentYearMonth.split('-');
      if (yearSelect) yearSelect.value = y;
      if (monthSelect) monthSelect.value = m;
    }

    this.parsedReservations = [];
    this.selectedFile = null;

    if (fileInput) fileInput.value = '';
    if (errBox) {
      errBox.textContent = '';
      errBox.classList.remove('visible');
    }
    if (previewArea) previewArea.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Confirmar e Importar al Calendario';
    }
    if (dropText) {
      dropText.innerHTML = `Arrastra tu archivo .xlsx aquí o <span style="color:var(--primary); text-decoration:underline; cursor:pointer;">haz clic para seleccionar</span>`;
    }

    if (overlay) overlay.classList.add('open');
  },

  closeImportModal() {
    const overlay = document.getElementById('import-excel-overlay');
    if (overlay) overlay.classList.remove('open');
  },

  // ═══════════════════════════════════════════════════════════════════
  // PROCESAMIENTO Y PARSEO DEL ARCHIVO EXCEL
  // ═══════════════════════════════════════════════════════════════════
  async processFile(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      this.showError('Por favor selecciona un archivo de Excel válido (.xlsx o .xls).');
      return;
    }

    this.selectedFile = file;
    const dropText = document.getElementById('dropzone-text');
    if (dropText) {
      dropText.innerHTML = `📄 <strong>${this.escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        this.parseWorkbook(workbook);
      } catch (err) {
        console.error('Error al leer Excel:', err);
        this.showError('No fue posible leer el archivo Excel. Asegúrate de que no esté dañado.');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  parseWorkbook(wb) {
    const reservations = [];
    let sheetsProcessed = 0;

    wb.SheetNames.forEach((sheetName, index) => {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return;

      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (!rows || rows.length === 0) return;

      let weekIdx = index;
      const weekMatch = sheetName.match(/(\d+)/);
      if (weekMatch) {
        const parsedNum = parseInt(weekMatch[1], 10);
        if (parsedNum >= 1 && parsedNum <= 6) {
          weekIdx = parsedNum - 1;
        }
      }

      const parsedSheetRes = this.parseSheetRows(rows, weekIdx);
      if (parsedSheetRes.length > 0) {
        reservations.push(...parsedSheetRes);
        sheetsProcessed++;
      }
    });

    if (reservations.length === 0) {
      this.showError('No se encontraron reservas con docentes o cursos válidos en el archivo. Comprueba que las celdas contengan datos.');
      document.getElementById('import-preview-area').style.display = 'none';
      document.getElementById('import-submit-btn').disabled = true;
      return;
    }

    this.parsedReservations = reservations;
    this.renderPreview(reservations, sheetsProcessed);
  },

  parseSheetRows(rows, weekIdx) {
    const results = [];

    // Mapeo de columnas oficiales según el diseño exacto:
    // Col B (1): Bloque Lunes-Jueves
    // Col C (2): Lunes Docente, Col D (3): Lunes Curso
    // Col E (4): Martes Docente, Col F (5): Martes Curso
    // Col G (6): Miércoles Docente, Col H (7): Miércoles Curso
    // Col I (8): Jueves Docente, Col J (9): Jueves Curso
    // Col K (10): Bloque Viernes
    // Col L (11): Viernes Docente, Col M (12): Viernes Curso
    let colMap = {
      mon: { doc: 2, cur: 3 },
      tue: { doc: 4, cur: 5 },
      wed: { doc: 6, cur: 7 },
      thu: { doc: 8, cur: 9 },
      fri: { doc: 11, cur: 12, slotCol: 10 }
    };

    rows.forEach((row) => {
      if (!Array.isArray(row) || row.length === 0) return;

      // Buscar si la fila define un bloque horario en Col B (índice 1)
      const slotMonThu = this.normalizeSlot(row[1]);
      const slotFri = this.normalizeSlot(row[10]) || slotMonThu;

      if (!slotMonThu && !slotFri) return;

      // 1. Procesar Lunes a Jueves
      if (slotMonThu) {
        ['mon', 'tue', 'wed', 'thu'].forEach(day => {
          const docCol = colMap[day].doc;
          const curCol = colMap[day].cur;
          const docente = row[docCol] ? String(row[docCol]).trim() : '';
          const curso = row[curCol] ? String(row[curCol]).trim() : '';

          if (docente || curso) {
            if (docente.toUpperCase() === 'DOCENTE' && curso.toUpperCase() === 'CURSO') return;

            const isBlocked = docente.toUpperCase().includes('BLOQUEO') || curso.toUpperCase().includes('BLOQUEO');

            results.push({
              weekIdx,
              day,
              slot: slotMonThu,
              docente,
              curso,
              nota: isBlocked ? 'Cargado desde planilla Excel' : '',
              isBlocked
            });
          }
        });
      }

      // 2. Procesar Viernes
      if (slotFri) {
        const docCol = colMap.fri.doc;
        const curCol = colMap.fri.cur;
        const docente = row[docCol] ? String(row[docCol]).trim() : '';
        const curso = row[curCol] ? String(row[curCol]).trim() : '';

        if (docente || curso) {
          if (docente.toUpperCase() === 'DOCENTE' && curso.toUpperCase() === 'CURSO') return;

          const isBlocked = docente.toUpperCase().includes('BLOQUEO') || curso.toUpperCase().includes('BLOQUEO');

          results.push({
            weekIdx,
            day: 'fri',
            slot: slotFri,
            docente,
            curso,
            nota: isBlocked ? 'Cargado desde planilla Excel' : '',
            isBlocked
          });
        }
      }
    });

    return results;
  },

  normalizeSlot(val) {
    if (!val) return null;
    const clean = String(val).replace(/–/g, '-').replace(/\s+/g, ' ').trim();

    // Mapeo flexible
    if ((clean.includes('08:00') || clean.includes('8:00')) && (clean.includes('08:45') || clean.includes('8:45'))) return '08:00 - 08:45';
    if ((clean.includes('08:45') || clean.includes('8:45')) && (clean.includes('09:30') || clean.includes('9:30'))) return '08:45 - 09:30';
    if ((clean.includes('09:30') || clean.includes('9:30')) && clean.includes('10:15')) return '09:30 - 10:15';
    if ((clean.includes('09:45') || clean.includes('9:45')) && clean.includes('10:30')) return '09:45 - 10:30';
    if (clean.includes('10:30') && clean.includes('11:15')) return '10:30 - 11:15';
    if (clean.includes('11:15') && clean.includes('12:00')) return '11:15 - 12:00';
    if (clean.includes('11:30') && clean.includes('12:15')) return '11:30 - 12:15';
    if (clean.includes('12:15') && clean.includes('13:00')) return '12:15 - 13:00';
    if (clean.includes('13:00') && clean.includes('13:45')) return '13:00 - 13:45';
    if (clean.includes('14:30') && clean.includes('15:15')) return '14:30 - 15:15';
    if (clean.includes('15:15') && clean.includes('16:00')) return '15:15 - 16:00';

    return null;
  },

  renderPreview(reservations, sheetsCount) {
    const errBox = document.getElementById('import-error');
    if (errBox) {
      errBox.textContent = '';
      errBox.classList.remove('visible');
    }

    const previewArea = document.getElementById('import-preview-area');
    const countLabel = document.getElementById('preview-count-label');
    const sheetsLabel = document.getElementById('preview-sheets-label');
    const tbody = document.getElementById('preview-table-body');
    const submitBtn = document.getElementById('import-submit-btn');

    if (countLabel) countLabel.textContent = `✓ ${reservations.length} reservas detectadas con datos`;
    if (sheetsLabel) sheetsLabel.textContent = `${sheetsCount} hoja(s) procesada(s)`;

    if (tbody) {
      tbody.innerHTML = '';
      const dayNames = { mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes' };

      reservations.slice(0, 15).forEach(r => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-light)';
        tr.innerHTML = `
          <td style="padding:6px 10px; font-weight:600;">Semana ${r.weekIdx + 1}</td>
          <td style="padding:6px 10px;">${dayNames[r.day] || r.day}</td>
          <td style="padding:6px 10px; font-family:monospace; font-size:0.75rem;">${r.slot}</td>
          <td style="padding:6px 10px; color:var(--primary); font-weight:600;">${this.escapeHtml(r.docente || '-')}</td>
          <td style="padding:6px 10px; color:#B38F1B; font-weight:600;">${this.escapeHtml(r.curso || '-')}</td>
        `;
        tbody.appendChild(tr);
      });

      if (reservations.length > 15) {
        const trMore = document.createElement('tr');
        trMore.innerHTML = `
          <td colspan="5" style="padding:8px 10px; text-align:center; color:var(--text-muted); font-style:italic;">
            ... y ${reservations.length - 15} reservas adicionales listas para importar.
          </td>
        `;
        tbody.appendChild(trMore);
      }
    }

    if (previewArea) previewArea.style.display = 'block';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = `Confirmar e Importar ${reservations.length} Reservas`;
    }
  },

  async executeImport() {
    if (this.parsedReservations.length === 0) return;

    const submitBtn = document.getElementById('import-submit-btn');
    const errBox = document.getElementById('import-error');
    const month = document.getElementById('import-month-select')?.value;
    const year = document.getElementById('import-year-select')?.value;
    const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'merge';

    const targetYearMonth = `${year}-${month}`;

    const origText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Importando y guardando en Neon DB...';

    if (errBox) {
      errBox.textContent = '';
      errBox.classList.remove('visible');
    }

    try {
      const payload = {
        yearMonth: targetYearMonth,
        mode,
        reservations: this.parsedReservations
      };

      const res = await API.batchImportReservas(payload);

      this.closeImportModal();
      showToast(res.message || 'Planilla importada exitosamente.');

      if (Calendar.currentYearMonth === targetYearMonth) {
        await Calendar.loadMonth(targetYearMonth);
      } else {
        const calMonth = document.getElementById('month-select');
        const calYear = document.getElementById('year-select');
        if (calMonth) calMonth.value = month;
        if (calYear) calYear.value = year;
        await Calendar.loadMonth(targetYearMonth);
      }
    } catch (err) {
      console.error('Error en executeImport:', err);
      this.showError(err.message || 'Error al procesar la importación en el servidor.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
    }
  },

  showError(msg) {
    const errBox = document.getElementById('import-error');
    if (errBox) {
      errBox.textContent = msg;
      errBox.classList.add('visible');
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
