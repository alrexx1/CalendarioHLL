/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Módulo de Exportación e Importación de Planillas Excel (SheetJS)
 * Exclusivo para Administrador
 * ══════════════════════════════════════════════════════════════════════════════
 */

const ExcelExport = {
  parsedReservations: [],
  selectedFile: null,

  // Bloques estándar reconocidos
  STANDARD_SLOTS: [
    '08:00 - 08:45',
    '08:45 - 09:30',
    '09:30 - 10:15',
    '10:30 - 11:15',
    '11:15 - 12:00',
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
  // EXPORTACIÓN DE PLANILLAS
  // ═══════════════════════════════════════════════════════════════════
  exportCurrentMonth() {
    if (typeof XLSX === 'undefined') {
      alert('La librería SheetJS (XLSX) no está cargada.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const ym = Calendar.currentYearMonth;

    Calendar.activeWeeks.forEach((w, wIdx) => {
      const wsData = [
        ['', '', `Registro y Uso de Sala de Computación — Colegio HLL`],
        ['', 'MES DE:', ym],
        ['', 'SEMANA DEL', Calendar.formatDate(w.from), '', 'HASTA EL', Calendar.formatDate(w.to)],
        [],
        ['', '', 'LUNES', '', 'MARTES', '', 'MIÉRCOLES', '', 'JUEVES', '', '', 'VIERNES', ''],
        ['', '', 'DOCENTE', 'CURSO', 'DOCENTE', 'CURSO', 'DOCENTE', 'CURSO', 'DOCENTE', 'CURSO', '', 'DOCENTE', 'CURSO']
      ];

      Calendar.TIME_SLOTS.forEach(ts => {
        if (ts.break) return;

        const mon = w.reservations.mon?.[ts.id] || {};
        const tue = w.reservations.tue?.[ts.id] || {};
        const wed = w.reservations.wed?.[ts.id] || {};
        const thu = w.reservations.thu?.[ts.id] || {};
        const fri = w.reservations.fri?.[ts.id] || {};

        wsData.push([
          '',
          ts.id,
          mon.docente || '', mon.curso || '',
          tue.docente || '', tue.curso || '',
          wed.docente || '', wed.curso || '',
          thu.docente || '', thu.curso || '',
          ts.id,
          fri.docente || '', fri.curso || ''
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, `SEMANA_0${wIdx + 1}`);
    });

    XLSX.writeFile(wb, `RESERVAS_SALA_COMPUTACION_${ym}.xlsx`);
    showToast('📥 Planilla Excel exportada exitosamente');
  },

  // ═══════════════════════════════════════════════════════════════════
  // DESCARGA DE PLANTILLA MODELO OFICIAL
  // ═══════════════════════════════════════════════════════════════════
  downloadTemplate() {
    if (typeof XLSX === 'undefined') {
      alert('La librería SheetJS (XLSX) no está cargada.');
      return;
    }

    const wb = XLSX.utils.book_new();

    for (let wIdx = 0; wIdx < 5; wIdx++) {
      const wsData = [
        ['', '', 'Colegio Santo Domingo Helen Lee Lassen — Plantilla Oficial de Horarios'],
        ['', 'INSTRUCCIONES:', 'Complete las columnas DOCENTE y CURSO para cada bloque horario según corresponda.'],
        [],
        ['', 'HORARIO', 'LUNES', '', 'MARTES', '', 'MIÉRCOLES', '', 'JUEVES', '', 'VIERNES', ''],
        ['', 'BLOQUE', 'DOCENTE', 'CURSO', 'DOCENTE', 'CURSO', 'DOCENTE', 'CURSO', 'DOCENTE', 'CURSO', 'DOCENTE', 'CURSO']
      ];

      this.STANDARD_SLOTS.forEach(slot => {
        wsData.push([
          '',
          slot,
          '', '', // Lunes
          '', '', // Martes
          '', '', // Miércoles
          '', '', // Jueves
          '', ''  // Viernes
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, `SEMANA_0${wIdx + 1}`);
    }

    XLSX.writeFile(wb, 'PLANTILLA_HORARIOS_SALA_HLL.xlsx');
    showToast('📄 Plantilla oficial descargada con éxito');
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

    // Inicializar mes y año con el actual del calendario
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

    // Recorrer cada hoja de cálculo
    wb.SheetNames.forEach((sheetName, index) => {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return;

      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (!rows || rows.length === 0) return;

      // Determinar índice de la semana (0 a 4)
      let weekIdx = index;
      const weekMatch = sheetName.match(/(\d+)/);
      if (weekMatch) {
        const parsedNum = parseInt(weekMatch[1], 10);
        if (parsedNum >= 1 && parsedNum <= 6) {
          weekIdx = parsedNum - 1;
        }
      }

      // Buscar si es formato estándar o tabla plana
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

    // Mapeo de columnas por día (detectado dinámicamente o por posición predeterminada)
    let colMap = {
      mon: { doc: 2, cur: 3 },
      tue: { doc: 4, cur: 5 },
      wed: { doc: 6, cur: 7 },
      thu: { doc: 8, cur: 9 },
      fri: { doc: 11, cur: 12 }
    };

    // Escanear filas en busca del encabezado de días para ajustar índices
    rows.forEach((row, rIdx) => {
      if (!Array.isArray(row)) return;

      const rowText = row.join(' ').toUpperCase();
      if (rowText.includes('LUNES') && rowText.includes('MARTES')) {
        // Encontramos cabecera de días
        row.forEach((cell, cIdx) => {
          const str = String(cell || '').toUpperCase().trim();
          if (str.includes('LUNES')) colMap.mon.doc = cIdx;
          if (str.includes('MARTES')) colMap.tue.doc = cIdx;
          if (str.includes('MIÉRCOLES') || str.includes('MIERCOLES')) colMap.wed.doc = cIdx;
          if (str.includes('JUEVES')) colMap.thu.doc = cIdx;
          if (str.includes('VIERNES')) colMap.fri.doc = cIdx;
        });
        colMap.mon.cur = colMap.mon.doc + 1;
        colMap.tue.cur = colMap.tue.doc + 1;
        colMap.wed.cur = colMap.wed.doc + 1;
        colMap.thu.cur = colMap.thu.doc + 1;
        colMap.fri.cur = colMap.fri.doc + 1;
      }

      // Buscar celda que contenga un bloque horario
      let foundSlot = null;
      for (const cell of row) {
        if (!cell) continue;
        const normalized = this.normalizeSlot(String(cell));
        if (normalized) {
          foundSlot = normalized;
          break;
        }
      }

      if (foundSlot) {
        const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
        days.forEach(day => {
          const docCol = colMap[day]?.doc;
          const curCol = colMap[day]?.cur;

          const docente = (row[docCol] !== undefined) ? String(row[docCol]).trim() : '';
          const curso = (row[curCol] !== undefined) ? String(row[curCol]).trim() : '';

          // Si hay docente o curso (o ambos)
          if (docente || curso) {
            // Descartar si coincide con nombres de cabecera como 'DOCENTE' o 'CURSO'
            if (docente.toUpperCase() === 'DOCENTE' && curso.toUpperCase() === 'CURSO') return;

            const isBlocked = docente.toUpperCase().includes('BLOQUEO') || curso.toUpperCase().includes('BLOQUEO');

            results.push({
              weekIdx,
              day,
              slot: foundSlot,
              docente,
              curso,
              nota: isBlocked ? 'Cargado desde planilla Excel' : '',
              isBlocked
            });
          }
        });
      }
    });

    return results;
  },

  normalizeSlot(text) {
    if (!text) return null;
    const clean = text.replace(/–/g, '-').replace(/\s+/g, ' ').trim();
    for (const slot of this.STANDARD_SLOTS) {
      if (clean.includes(slot) || slot.includes(clean)) {
        return slot;
      }
    }
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

      // Mostrar primeros 15 registros en la vista previa
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

      // Si el mes importado es el actualmente visible en el calendario, recargarlo
      if (Calendar.currentYearMonth === targetYearMonth) {
        await Calendar.loadMonth(targetYearMonth);
      } else {
        // Cambiar el selector al mes importado y cargarlo
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
