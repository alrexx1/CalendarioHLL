/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Módulo de Gestión de Reservas y Bloqueos Institucionales
 * ══════════════════════════════════════════════════════════════════════════════
 */

const Reservations = {
  init() {
    this.bindEvents();
  },

  openAddModal(weekIdx, day, slot) {
    const modalOverlay = document.getElementById('modal-overlay');
    const semSel = document.getElementById('f-semana');
    const diaSel = document.getElementById('f-dia');
    const bloqSel = document.getElementById('f-bloque');
    const tipoSelect = document.getElementById('f-tipo');
    const docenteField = document.getElementById('f-docente');

    if (!modalOverlay || !semSel) return;

    semSel.innerHTML = '';
    Calendar.activeWeeks.forEach((w, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${w.label} (${Calendar.formatDate(w.from)} - ${Calendar.formatDate(w.to)})`;
      semSel.appendChild(opt);
    });

    semSel.value = String(weekIdx);
    diaSel.value = day || 'mon';
    if (slot && bloqSel) bloqSel.value = slot;

    if (Auth.isAdmin) {
      docenteField.value = '';
      docenteField.removeAttribute('readonly');
      if (tipoSelect) tipoSelect.value = 'reserva';
    } else if (Auth.currentUser) {
      docenteField.value = Auth.currentUser.name;
      docenteField.setAttribute('readonly', 'readonly');
      if (tipoSelect) tipoSelect.value = 'reserva';
    } else {
      docenteField.value = '';
      docenteField.removeAttribute('readonly');
    }

    document.getElementById('f-curso').value = '';
    document.getElementById('f-nota').value = '';
    const emailField = document.getElementById('f-email');
    if (emailField) {
      emailField.value = Auth.currentUser?.email || '';
    }
    document.getElementById('docente-curso-row').style.opacity = '1';
    this.hideError();

    modalOverlay.classList.add('open');
    document.getElementById('f-curso').focus();
  },

  closeAddModal() {
    document.getElementById('modal-overlay')?.classList.remove('open');
  },

  showError(msg) {
    const el = document.getElementById('form-error');
    if (el) {
      el.textContent = msg;
      el.classList.add('visible');
    }
  },

  hideError() {
    document.getElementById('form-error')?.classList.remove('visible');
  },

  showDetail(reservation, day, slot, weekIdx) {
    const w = Calendar.activeWeeks[weekIdx];
    const dayIdx = Calendar.DAYS.indexOf(day);
    const date = Calendar.getDayDate(weekIdx, dayIdx);

    const canDelete = Auth.isAdmin || (Auth.currentUser && reservation.userCreated);

    const body = document.getElementById('detail-body');
    if (!body) return;

    body.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">${reservation.isBlocked ? 'Estado' : 'Docente'}</span>
          <span class="detail-value">${reservation.docente}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">${reservation.isBlocked ? 'Motivo' : 'Curso'}</span>
          <span class="detail-value">${reservation.curso}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Día</span>
          <span class="detail-value">${Calendar.DAY_NAMES[day]}, ${date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Horario</span>
          <span class="detail-value">${slot}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Semana</span>
          <span class="detail-value">${w.label}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Tipo</span>
          <span class="detail-tag" style="${reservation.isBlocked ? 'background:#475569; color:#FFF;' : ''}">
            ${reservation.isBlocked ? '🔒 BLOQUEADO' : '📌 RESERVADO'}
          </span>
        </div>
      </div>
      ${reservation.nota ? `<div style="margin-top:14px; padding:10px 14px; background:rgba(0,0,0,0.04); border-radius:8px; font-size:.82rem; color:var(--text-secondary);"><b>Nota:</b> ${reservation.nota}</div>` : ''}
      <div class="detail-actions">
        ${canDelete ? `
          <button class="btn-danger" id="delete-resv-btn">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            ${reservation.isBlocked ? 'Desbloquear horario' : 'Eliminar reserva'}
          </button>
        ` : `<span style="font-size:.78rem; color:var(--text-muted); align-self:center;">Solo un Administrador o el autor puede eliminar esta reserva</span>`}
        <button class="btn-secondary" id="detail-close-btn" style="margin-left:auto; color:var(--text-primary); border-color:var(--border-strong);">Cerrar</button>
      </div>
    `;

    document.getElementById('detail-overlay')?.classList.add('open');

    document.getElementById('delete-resv-btn')?.addEventListener('click', () => {
      this.deleteReservation(weekIdx, day, slot);
    });
    document.getElementById('detail-close-btn')?.addEventListener('click', () => {
      document.getElementById('detail-overlay')?.classList.remove('open');
    });
  },

  async deleteReservation(weekIdx, day, slot) {
    const ym = Calendar.currentYearMonth;
    const currentResv = Calendar.activeWeeks[weekIdx]?.reservations?.[day]?.[slot] || {};

    if (Calendar.activeWeeks[weekIdx]?.reservations[day]) {
      delete Calendar.activeWeeks[weekIdx].reservations[day][slot];
    }
    if (Calendar.db[ym]?.[weekIdx]?.[day]) {
      delete Calendar.db[ym][weekIdx][day][slot];
    }

    document.getElementById('detail-overlay')?.classList.remove('open');
    Calendar.render();

    try {
      await API.deleteReserva({
        yearMonth: ym,
        weekIdx,
        day,
        slot,
        docente: currentResv.docente,
        curso: currentResv.curso,
        nota: currentResv.nota,
        userEmail: currentResv.userEmail
      });
      showToast('Reserva o bloqueo eliminado');
    } catch (err) {
      console.warn('Error eliminando en servidor:', err.message);
      showToast('Eliminado en vista local');
    }
  },

  bindEvents() {
    document.getElementById('btn-add-modal')?.addEventListener('click', () => {
      if (!Auth.isTeacher && !Auth.isAdmin) {
        Auth.openAdminLoginModal();
      } else {
        this.openAddModal(Calendar.currentWeek, 'mon', null);
      }
    });

    document.getElementById('modal-close')?.addEventListener('click', () => this.closeAddModal());
    document.getElementById('modal-cancel')?.addEventListener('click', () => this.closeAddModal());

    const tipoSelect = document.getElementById('f-tipo');
    if (tipoSelect) {
      tipoSelect.addEventListener('change', (e) => {
        const docRow = document.getElementById('docente-curso-row');
        if (e.target.value === 'bloqueo') {
          docRow.style.opacity = '0.6';
          document.getElementById('f-docente').value = '🔒 ADMIN';
          document.getElementById('f-curso').value = 'Bloqueo Institucional';
        } else {
          docRow.style.opacity = '1';
          document.getElementById('f-docente').value = Auth.isAdmin ? '' : (Auth.currentUser?.name || '');
          document.getElementById('f-curso').value = '';
        }
      });
    }

    const form = document.getElementById('reservation-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.hideError();

        const isBloqueo = (tipoSelect && tipoSelect.value === 'bloqueo');
        let docente = document.getElementById('f-docente').value.trim();
        let curso = document.getElementById('f-curso').value.trim();
        const weekIdx = parseInt(document.getElementById('f-semana').value, 10);
        const day = document.getElementById('f-dia').value;
        const slot = document.getElementById('f-bloque').value;
        const nota = document.getElementById('f-nota').value.trim();

        if (isBloqueo) {
          if (!docente) docente = '🔒 ADMIN';
          if (!curso) curso = 'Bloqueo Institucional';
        } else {
          if (!docente) { this.showError('Por favor ingresa el nombre del docente.'); return; }
          if (!curso) { this.showError('Por favor ingresa el curso o actividad.'); return; }
        }

        const w = Calendar.activeWeeks[weekIdx];
        if (w.reservations[day]?.[slot]) {
          this.showError('Este bloque ya está ocupado o bloqueado. Elige otro horario.');
          return;
        }

        const userEmail = (document.getElementById('f-email')?.value.trim() || Auth.currentUser?.email || '').trim();

        if (!w.reservations[day]) w.reservations[day] = {};
        const resvObj = {
          docente,
          curso,
          nota,
          isBlocked: isBloqueo,
          userCreated: true,
          userEmail
        };
        w.reservations[day][slot] = resvObj;

        const ym = Calendar.currentYearMonth;
        if (!Calendar.db[ym]) Calendar.db[ym] = [];
        while (Calendar.db[ym].length <= weekIdx) Calendar.db[ym].push({});
        if (!Calendar.db[ym][weekIdx][day]) Calendar.db[ym][weekIdx][day] = {};
        Calendar.db[ym][weekIdx][day][slot] = resvObj;

        this.closeAddModal();
        Calendar.render();
        showToast(isBloqueo ? '🔒 Bloqueo institucional registrado' : `✓ Reserva guardada para ${docente}`);

        try {
          await API.saveReserva({
            yearMonth: ym,
            weekIdx,
            day,
            slot,
            docente,
            curso,
            nota,
            isBlocked: isBloqueo,
            userEmail
          });
        } catch (err) {
          console.warn('Error guardando en el servidor:', err.message);
        }
      });
    }

    document.getElementById('detail-close')?.addEventListener('click', () => {
      document.getElementById('detail-overlay')?.classList.remove('open');
    });
  }
};
