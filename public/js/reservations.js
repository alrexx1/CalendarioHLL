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
    this.updateSlotSelect(diaSel.value, slot);

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

  updateSlotSelect(day, targetSlot) {
    const bloqSel = document.getElementById('f-bloque');
    if (!bloqSel) return;
    bloqSel.innerHTML = '';

    if (day === 'fri') {
      if (Auth.isAdmin) {
        const allFri = [
          { id: '08:00 - 08:45', label: '08:00 – 08:45 (Horario institucional)' },
          { id: '08:45 - 09:30', label: '08:45 – 09:30 (Horario institucional)' },
          { id: '09:30 - 10:15', label: '09:30 – 10:15 (Espacio sin bloque)' },
          { id: '10:30 - 11:15', label: '10:30 – 11:15 (Bloque Viernes)' },
          { id: '11:30 - 12:15', label: '11:30 – 12:15 (Bloque Viernes)' },
          { id: '12:15 - 13:00', label: '12:15 – 13:00 (Horario institucional)' },
          { id: '14:30 - 15:15', label: '14:30 – 15:15 (Tarde sin clases)' },
          { id: '15:15 - 16:00', label: '15:15 – 16:00 (Tarde sin clases)' }
        ];
        allFri.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.label;
          bloqSel.appendChild(opt);
        });
      } else {
        [
          { id: '10:30 - 11:15', label: '10:30 – 11:15 (Bloque Viernes)' },
          { id: '11:30 - 12:15', label: '11:30 – 12:15 (Bloque Viernes)' }
        ].forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.label;
          bloqSel.appendChild(opt);
        });
      }
    } else {
      const standardSlots = [
        '08:00 - 08:45',
        '08:45 - 09:30',
        '09:30 - 10:15',
        '10:30 - 11:15',
        '11:15 - 12:00',
        '12:15 - 13:00',
        '13:00 - 13:45',
        '14:30 - 15:15',
        '15:15 - 16:00'
      ];
      standardSlots.forEach(s => {
        const isBlocked = Calendar.DEFAULT_BLOCKED_SLOTS?.[day]?.includes(s);
        if (!Auth.isAdmin && isBlocked) return;
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = isBlocked ? `${s} (No disponible institucional)` : s;
        bloqSel.appendChild(opt);
      });
    }

    if (targetSlot) {
      bloqSel.value = targetSlot;
    }
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

    const isSinBloque = (reservation.curso === 'Sin Bloque' || reservation.isSinBloque);
    const isOverrideFree = (reservation.curso === 'DISPONIBLE');
    let typeLabel = '📌 RESERVADO';
    let typeStyle = '';
    if (reservation.isBlocked) {
      typeLabel = '🔒 NO DISPONIBLE';
      typeStyle = 'background:#475569; color:#FFF;';
    } else if (isSinBloque) {
      typeLabel = '⚪ SIN BLOQUE';
      typeStyle = 'background:#94A3B8; color:#FFF;';
    } else if (isOverrideFree) {
      typeLabel = '🟢 DISPONIBLE';
      typeStyle = 'background:#059669; color:#FFF;';
    }

    let deleteBtnText = 'Eliminar reserva';
    if (reservation.isBlocked) deleteBtnText = 'Desbloquear horario';
    else if (isSinBloque) deleteBtnText = 'Eliminar "Sin bloque" / Restaurar';
    else if (isOverrideFree) deleteBtnText = 'Restaurar bloqueo original';

    body.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">${(reservation.isBlocked || isSinBloque) ? 'Estado' : 'Docente'}</span>
          <span class="detail-value">${reservation.docente}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">${(reservation.isBlocked || isSinBloque) ? 'Motivo' : 'Curso'}</span>
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
          <span class="detail-tag" style="${typeStyle}">
            ${typeLabel}
          </span>
        </div>
      </div>
      ${reservation.nota ? `<div style="margin-top:14px; padding:10px 14px; background:rgba(0,0,0,0.04); border-radius:8px; font-size:.82rem; color:var(--text-secondary);"><b>Nota:</b> ${reservation.nota}</div>` : ''}
      <div class="detail-actions">
        ${canDelete ? `
          <button class="btn-danger" id="delete-resv-btn">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            ${deleteBtnText}
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
    if (Calendar.cache) {
      Calendar.cache[ym] = { data: Calendar.db[ym], timestamp: Date.now() };
    }
    Calendar.lastSyncTime = Date.now();
    Calendar.updateSyncUI?.();

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
        } else if (e.target.value === 'sin_bloque') {
          docRow.style.opacity = '0.6';
          document.getElementById('f-docente').value = '—';
          document.getElementById('f-curso').value = 'Sin Bloque';
        } else if (e.target.value === 'disponible') {
          docRow.style.opacity = '0.6';
          document.getElementById('f-docente').value = '—';
          document.getElementById('f-curso').value = 'DISPONIBLE';
        } else {
          docRow.style.opacity = '1';
          document.getElementById('f-docente').value = Auth.isAdmin ? '' : (Auth.currentUser?.name || '');
          document.getElementById('f-curso').value = '';
        }
      });
    }

    const diaSel = document.getElementById('f-dia');
    if (diaSel) {
      diaSel.addEventListener('change', () => {
        this.updateSlotSelect(diaSel.value);
      });
    }

    const form = document.getElementById('reservation-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.hideError();

        const tipo = (tipoSelect ? tipoSelect.value : 'reserva');
        const isBloqueo = (tipo === 'bloqueo');
        const isSinBloque = (tipo === 'sin_bloque');
        const isDisponible = (tipo === 'disponible');

        let docente = document.getElementById('f-docente').value.trim();
        let curso = document.getElementById('f-curso').value.trim();
        const weekIdx = parseInt(document.getElementById('f-semana').value, 10);
        const day = document.getElementById('f-dia').value;
        const slot = document.getElementById('f-bloque').value;
        const nota = document.getElementById('f-nota').value.trim();

        if (isBloqueo) {
          if (!docente) docente = '🔒 ADMIN';
          if (!curso) curso = 'Bloqueo Institucional';
        } else if (isSinBloque) {
          if (!docente) docente = '—';
          if (!curso) curso = 'Sin Bloque';
        } else if (isDisponible) {
          if (!docente) docente = '—';
          if (!curso) curso = 'DISPONIBLE';
        } else {
          if (!docente) { this.showError('Por favor ingresa el nombre del docente.'); return; }
          if (!curso) { this.showError('Por favor ingresa el curso o actividad.'); return; }
        }

        const w = Calendar.activeWeeks[weekIdx];
        if (!Auth.isAdmin && w.reservations[day]?.[slot]) {
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
          isSinBloque: isSinBloque,
          userCreated: true,
          userEmail
        };
        w.reservations[day][slot] = resvObj;

        const ym = Calendar.currentYearMonth;
        if (!Calendar.db[ym]) Calendar.db[ym] = [];
        while (Calendar.db[ym].length <= weekIdx) Calendar.db[ym].push({});
        if (!Calendar.db[ym][weekIdx][day]) Calendar.db[ym][weekIdx][day] = {};
        Calendar.db[ym][weekIdx][day][slot] = resvObj;
        if (Calendar.cache) {
          Calendar.cache[ym] = { data: Calendar.db[ym], timestamp: Date.now() };
        }
        Calendar.lastSyncTime = Date.now();
        Calendar.updateSyncUI?.();

        this.closeAddModal();
        Calendar.render();

        let toastMsg = `✓ Reserva guardada para ${docente}`;
        if (isBloqueo) toastMsg = '🔒 Bloqueo institucional registrado';
        else if (isSinBloque) toastMsg = '⚪ Horario configurado como "Sin bloque"';
        else if (isDisponible) toastMsg = '🟢 Horario habilitado como Disponible';
        showToast(toastMsg);

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
