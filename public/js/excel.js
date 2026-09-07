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
  // CONSTRUCCIÓN DEL FORMATO INSTITUCIONAL OFICIAL (HLL)
  // ═══════════════════════════════════════════════════════════════════
  buildOfficialSheetData(week, yearMonth) {
    const [year, month] = (yearMonth || Calendar.currentYearMonth || '2026-09').split('-');
    const monthName = this.MONTH_NAMES[month] || 'SEPTIEMBRE';

    // Formatear fechas D/M/YYYY
    const fromStr = week?.from ? `${week.from.getDate()}/${week.from.getMonth() + 1}/${week.from.getFullYear()}` : '';
    const toStr = week?.to ? `${week.to.getDate()}/${week.to.getMonth() + 1}/${week.to.getFullYear()}` : '';

    const res = week?.reservations || {};
    const mon = res.mon || {};
    const tue = res.tue || {};
    const wed = res.wed || {};
    const thu = res.thu || {};
    const fri = res.fri || {};

    const wsData = [
      [], // Fila 1 (margen superior)
      ['', `Registro y Uso de Sala de Computación ${year}`], // Fila 2 (B2)
      [], // Fila 3
      ['', 'MES DE:', monthName], // Fila 4 (B4: MES DE:, C4:D4: Nombre Mes)
      ['', 'SEMANA DEL', fromStr, '', 'HASTA EL', toStr], // Fila 5 (B5: SEMANA DEL, C5:D5, E5: HASTA EL, F5:G5)
      [], // Fila 6
      // Fila 7: Días de la semana
      ['', '', 'LUNES', '', 'MARTES', '', 'MIERCOLES', '', 'JUEVES', '', '', 'VIERNES', ''],
      // Fila 8: Subencabezados DOCENTE / CURSO
      ['', '', 'DOCENTE', 'CURSO', 'DOCENTE', 'CURSO', 'DOCENTE', 'CURSO', 'DOCENTE', 'CURSO', '', 'DOCENTE', 'CURSO'],

      // Fila 9: Bloque 1
      ['', '08:00 - 08:45',
        mon['08:00 - 08:45']?.docente || '', mon['08:00 - 08:45']?.curso || '',
        tue['08:00 - 08:45']?.docente || '', tue['08:00 - 08:45']?.curso || '',
        wed['08:00 - 08:45']?.docente || '', wed['08:00 - 08:45']?.curso || '',
        thu['08:00 - 08:45']?.docente || '', thu['08:00 - 08:45']?.curso || '',
        '08:00 - 08:45',
        fri['08:00 - 08:45']?.docente || '', fri['08:00 - 08:45']?.curso || ''
      ],
      // Fila 10: Bloque 2
      ['', '08:45 - 09:30',
        mon['08:45 - 09:30']?.docente || '', mon['08:45 - 09:30']?.curso || '',
        tue['08:45 - 09:30']?.docente || '', tue['08:45 - 09:30']?.curso || '',
        wed['08:45 - 09:30']?.docente || '', wed['08:45 - 09:30']?.curso || '',
        thu['08:45 - 09:30']?.docente || '', thu['08:45 - 09:30']?.curso || '',
        '08:45 - 09:30',
        fri['08:45 - 09:30']?.docente || '', fri['08:45 - 09:30']?.curso || ''
      ],
      // Fila 11: Bloque 3
      ['', '09:30 - 10:15',
        mon['09:30 - 10:15']?.docente || '', mon['09:30 - 10:15']?.curso || '',
        tue['09:30 - 10:15']?.docente || '', tue['09:30 - 10:15']?.curso || '',
        wed['09:30 - 10:15']?.docente || '', wed['09:30 - 10:15']?.curso || '',
        thu['09:30 - 10:15']?.docente || '', thu['09:30 - 10:15']?.curso || '',
        '',
        fri['09:30 - 10:15']?.docente || '', fri['09:30 - 10:15']?.curso || ''
      ],

      // Fila 12: Recreo 1 (Espacio en blanco)
      [],

      // Fila 13: Bloque 4
      ['', '10:30 - 11:15',
        mon['10:30 - 11:15']?.docente || '', mon['10:30 - 11:15']?.curso || '',
        tue['10:30 - 11:15']?.docente || '', tue['10:30 - 11:15']?.curso || '',
        wed['10:30 - 11:15']?.docente || '', wed['10:30 - 11:15']?.curso || '',
        thu['10:30 - 11:15']?.docente || '', thu['10:30 - 11:15']?.curso || '',
        '',
        '', ''
      ],
      // Fila 14: Bloque 5 (En viernes corresponde a 10:30 - 11:15)
      ['', '11:15 - 12:00',
        mon['11:15 - 12:00']?.docente || '', mon['11:15 - 12:00']?.curso || '',
        tue['11:15 - 12:00']?.docente || '', tue['11:15 - 12:00']?.curso || '',
        wed['11:15 - 12:00']?.docente || '', wed['11:15 - 12:00']?.curso || '',
        thu['11:15 - 12:00']?.docente || '', thu['11:15 - 12:00']?.curso || '',
        '10:30 - 11:15',
        fri['10:30 - 11:15']?.docente || '', fri['10:30 - 11:15']?.curso || ''
      ],

      // Fila 15: Recreo 2 (Espacio en blanco)
      [],

      // Fila 16: Bloque 6 (En viernes 11:30 - 12:15 o 11:15 - 12:00)
      ['', '12:15 - 13:00',
        mon['12:15 - 13:00']?.docente || '', mon['12:15 - 13:00']?.curso || '',
        tue['12:15 - 13:00']?.docente || '', tue['12:15 - 13:00']?.curso || '',
        wed['12:15 - 13:00']?.docente || '', wed['12:15 - 13:00']?.curso || '',
        thu['12:15 - 13:00']?.docente || '', thu['12:15 - 13:00']?.curso || '',
        '11:30 - 12:15',
        (fri['11:30 - 12:15'] || fri['11:15 - 12:00'])?.docente || '', (fri['11:30 - 12:15'] || fri['11:15 - 12:00'])?.curso || ''
      ],
      // Fila 17: Bloque 7 (En viernes 12:15 - 13:00)
      ['', '13:00 - 13:45',
        mon['13:00 - 13:45']?.docente || '', mon['13:00 - 13:45']?.curso || '',
        tue['13:00 - 13:45']?.docente || '', tue['13:00 - 13:45']?.curso || '',
        wed['13:00 - 13:45']?.docente || '', wed['13:00 - 13:45']?.curso || '',
        thu['13:00 - 13:45']?.docente || '', thu['13:00 - 13:45']?.curso || '',
        '12:15 - 13:00',
        (fri['12:15 - 13:00'] || fri['13:00 - 13:45'])?.docente || '', (fri['12:15 - 13:00'] || fri['13:00 - 13:45'])?.curso || ''
      ],

      // Fila 18: Almuerzo (Espacio en blanco)
      [],

      // Fila 19: Bloque 8
      ['', '14:30 - 15:15',
        mon['14:30 - 15:15']?.docente || '', mon['14:30 - 15:15']?.curso || '',
        tue['14:30 - 15:15']?.docente || '', tue['14:30 - 15:15']?.curso || '',
        wed['14:30 - 15:15']?.docente || '', wed['14:30 - 15:15']?.curso || '',
        thu['14:30 - 15:15']?.docente || '', thu['14:30 - 15:15']?.curso || '',
        '',
        '', ''
      ],
      // Fila 20: Bloque 9
      ['', '15:15 - 16:00',
        mon['15:15 - 16:00']?.docente || '', mon['15:15 - 16:00']?.curso || '',
        tue['15:15 - 16:00']?.docente || '', tue['15:15 - 16:00']?.curso || '',
        wed['15:15 - 16:00']?.docente || '', wed['15:15 - 16:00']?.curso || '',
        thu['15:15 - 16:00']?.docente || '', thu['15:15 - 16:00']?.curso || '',
        '',
        '', ''
      ],

      // Fila 21: Espacio
      [],
      // Fila 22: NOTA institucional
      ['', 'NOTA:', 'Los bloques sombreados corresponden a horarios donde no está disponible la sala.']
    ];

    return wsData;
  },

  getSheetMerges() {
    return [
      // B2:H2 (Título principal)
      { s: { r: 1, c: 1 }, e: { r: 1, c: 7 } },
      // C4:D4 (Nombre de Mes)
      { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
      // C5:D5 (Fecha Desde)
      { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
      // F5:G5 (Fecha Hasta)
      { s: { r: 4, c: 5 }, e: { r: 4, c: 6 } },
      // C7:D7 (LUNES)
      { s: { r: 6, c: 2 }, e: { r: 6, c: 3 } },
      // E7:F7 (MARTES)
      { s: { r: 6, c: 4 }, e: { r: 6, c: 5 } },
      // G7:H7 (MIERCOLES)
      { s: { r: 6, c: 6 }, e: { r: 6, c: 7 } },
      // I7:J7 (JUEVES)
      { s: { r: 6, c: 8 }, e: { r: 6, c: 9 } },
      // L7:M7 (VIERNES)
      { s: { r: 6, c: 11 }, e: { r: 6, c: 12 } },
      // C22:J22 (Nota informativa)
      { s: { r: 21, c: 2 }, e: { r: 21, c: 9 } }
    ];
  },

  getSheetCols() {
    return [
      { wch: 3 },   // A
      { wch: 14 },  // B (Bloque Horario Lunes-Jueves)
      { wch: 18 },  // C (Lunes Docente)
      { wch: 15 },  // D (Lunes Curso)
      { wch: 18 },  // E (Martes Docente)
      { wch: 15 },  // F (Martes Curso)
      { wch: 18 },  // G (Miércoles Docente)
      { wch: 15 },  // H (Miércoles Curso)
      { wch: 18 },  // I (Jueves Docente)
      { wch: 15 },  // J (Jueves Curso)
      { wch: 14 },  // K (Bloque Horario Viernes)
      { wch: 18 },  // L (Viernes Docente)
      { wch: 15 }   // M (Viernes Curso)
    ];
  },

  // ═══════════════════════════════════════════════════════════════════
  // EXPORTACIÓN DE PLANILLAS DEL MES ACTUAL
  // ═══════════════════════════════════════════════════════════════════
  exportCurrentMonth() {
    if (typeof XLSX === 'undefined') {
      alert('La librería SheetJS (XLSX) no está cargada.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const ym = Calendar.currentYearMonth || '2026-09';
    const [year, month] = ym.split('-');
    const monthName = this.MONTH_NAMES[month] || 'SEPTIEMBRE';

    Calendar.activeWeeks.forEach((w, wIdx) => {
      const wsData = this.buildOfficialSheetData(w, ym);
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws['!merges'] = this.getSheetMerges();
      ws['!cols'] = this.getSheetCols();

      XLSX.utils.book_append_sheet(wb, ws, `SEMANA_0${wIdx + 1}`);
    });

    const fileName = `${month}_${monthName}_SALA_DE_COMPUTACION_${year}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`📥 Planilla exportada: ${fileName}`);
  },

  // ═══════════════════════════════════════════════════════════════════
  // DESCARGA DE PLANTILLA MODELO OFICIAL (VACÍA PARA LLENAR)
  // ═══════════════════════════════════════════════════════════════════
  downloadTemplate() {
    if (typeof XLSX === 'undefined') {
      alert('La librería SheetJS (XLSX) no está cargada.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const ym = Calendar.currentYearMonth || '2026-09';
    const [year, month] = ym.split('-');
    const monthName = this.MONTH_NAMES[month] || 'SEPTIEMBRE';

    // Generar 5 semanas modelo con sus rangos estimados
    for (let wIdx = 0; wIdx < 5; wIdx++) {
      const sampleWeek = {
        from: new Date(Number(year), Number(month) - 1, 1 + wIdx * 7),
        to: new Date(Number(year), Number(month) - 1, 5 + wIdx * 7),
        reservations: {}
      };

      const wsData = this.buildOfficialSheetData(sampleWeek, ym);
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws['!merges'] = this.getSheetMerges();
      ws['!cols'] = this.getSheetCols();

      XLSX.utils.book_append_sheet(wb, ws, `SEMANA_0${wIdx + 1}`);
    }

    const fileName = `${month}_${monthName}_SALA_DE_COMPUTACION_${year}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`📄 Plantilla oficial descargada: ${fileName}`);
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
    if (clean.includes('08:00') && clean.includes('08:45')) return '08:00 - 08:45';
    if (clean.includes('08:45') && clean.includes('09:30')) return '08:45 - 09:30';
    if (clean.includes('09:30') && clean.includes('10:15')) return '09:30 - 10:15';
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
