/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Módulo de Exportación a Excel (SheetJS)
 * ══════════════════════════════════════════════════════════════════════════════
 */

const ExcelExport = {
  init() {
    const btn = document.getElementById('btn-export-excel');
    if (btn) {
      btn.addEventListener('click', () => this.exportCurrentMonth());
    }
  },

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
  }
};
