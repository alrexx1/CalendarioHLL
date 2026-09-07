/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Módulo de Calendario — Estructura Temporal, Horarios y Renderizado
 * ══════════════════════════════════════════════════════════════════════════════
 */

const Calendar = {
  TIME_SLOTS: [
    { id: '08:00 - 08:45', label: '08:00 – 08:45', break: false },
    { id: '08:45 - 09:30', label: '08:45 – 09:30', break: false },
    { id: '09:30 - 10:15', label: '09:30 – 10:15', break: false },
    { id: 'BREAK_1',       label: 'Recreo',          break: true  },
    { id: '10:30 - 11:15', label: '10:30 – 11:15', break: false },
    { id: '11:15 - 12:00', label: '11:15 – 12:00', break: false },
    { id: 'BREAK_2',       label: 'Recreo',          break: true  },
    { id: '12:15 - 13:00', label: '12:15 – 13:00', break: false },
    { id: '13:00 - 13:45', label: '13:00 – 13:45', break: false },
    { id: 'BREAK_3',       label: 'Almuerzo',        break: true  },
    { id: '14:30 - 15:15', label: '14:30 – 15:15', break: false },
    { id: '15:15 - 16:00', label: '15:15 – 16:00', break: false },
  ],

  DAYS: ['mon', 'tue', 'wed', 'thu', 'fri'],
  DAY_NAMES: { mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes' },
  DAY_CLASSES: { mon: 'day-mon', tue: 'day-tue', wed: 'day-wed', thu: 'day-thu', fri: 'day-fri' },

  // Mapeo oficial de filas para el día Viernes según jornada institucional HLL
  FRIDAY_GRID_MAP: [
    { slotId: '08:00 - 08:45', fridaySlot: '08:00 - 08:45', isClass: false, isDefaultBlocked: true, label: '08:00 – 08:45' },
    { slotId: '08:45 - 09:30', fridaySlot: '08:45 - 09:30', isClass: false, isDefaultBlocked: true, label: '08:45 – 09:30' },
    { slotId: '09:30 - 10:15', fridaySlot: null,            isClass: false, isDefaultBlocked: false, label: '— Sin bloque —' },
    { slotId: '10:30 - 11:15', fridaySlot: null,            isClass: false, isDefaultBlocked: false, label: '— Sin bloque —' },
    { slotId: '11:15 - 12:00', fridaySlot: '10:30 - 11:15', isClass: true,  isDefaultBlocked: false, label: '10:30 – 11:15', lookupSlots: ['10:30 - 11:15', '11:15 - 12:00'] },
    { slotId: '12:15 - 13:00', fridaySlot: '11:30 - 12:15', isClass: true,  isDefaultBlocked: false, label: '11:30 – 12:15', lookupSlots: ['11:30 - 12:15', '12:15 - 13:00'] },
    { slotId: '13:00 - 13:45', fridaySlot: '12:15 - 13:00', isClass: false, isDefaultBlocked: true,  label: '12:15 – 13:00', lookupSlots: ['12:15 - 13:00', '13:00 - 13:45'] },
    { slotId: '14:30 - 15:15', fridaySlot: null,            isClass: false, isDefaultBlocked: false, label: '— Sin clases —', isAfternoon: true },
    { slotId: '15:15 - 16:00', fridaySlot: null,            isClass: false, isDefaultBlocked: false, label: '— Sin clases —', isAfternoon: true },
  ],

  // Bloques institucionales por defecto donde la sala no está disponible (según planilla oficial)
  DEFAULT_BLOCKED_SLOTS: {
    mon: ['08:00 - 08:45'],
    tue: ['09:30 - 10:15'],
    wed: [],
    thu: ['12:15 - 13:00', '13:00 - 13:45'],
    fri: ['08:00 - 08:45', '08:45 - 09:30', '12:15 - 13:00']
  },

  // Bloques oficiales del Viernes para selects
  FRIDAY_SLOTS: [
    { id: '10:30 - 11:15', label: '10:30 – 11:15 (Bloque Viernes)', isBlocked: false },
    { id: '11:30 - 12:15', label: '11:30 – 12:15 (Bloque Viernes)', isBlocked: false },
    { id: '08:00 - 08:45', label: '08:00 – 08:45 (No disponible institucional)', isBlocked: true },
    { id: '08:45 - 09:30', label: '08:45 – 09:30 (No disponible institucional)', isBlocked: true },
    { id: '12:15 - 13:00', label: '12:15 – 13:00 (No disponible institucional)', isBlocked: true }
  ],

  currentYearMonth: '',
  currentWeek: 0,
  activeWeeks: [],
  db: {},
  cache: {},
  lastSyncTime: null,
  syncIntervalId: null,
  selectedMobileDay: 'all',

  init() {
    // 1. Detectar automáticamente el año y mes en curso en tiempo real
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
    this.currentYearMonth = `${currentYear}-${currentMonthStr}`;

    // 2. Sincronizar los selectores del DOM con la fecha actual
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');

    if (monthSelect) {
      monthSelect.value = currentMonthStr;
    }
    if (yearSelect) {
      if (!Array.from(yearSelect.options).some(opt => opt.value === String(currentYear))) {
        const opt = document.createElement('option');
        opt.value = String(currentYear);
        opt.textContent = String(currentYear);
        yearSelect.appendChild(opt);
      }
      yearSelect.value = String(currentYear);
    }

    // 3. Construir la estructura semanal del mes en curso
    this.activeWeeks = this.buildMonthStructure(this.currentYearMonth);

    // 4. Posicionar automáticamente en la semana que estamos hoy
    this.currentWeek = this.getTodayWeekIndex();

    this.bindEvents();
    this.initSyncTimer();
    this.initSwipeGestures();
    this.render();
    this.fetchMonth(this.currentYearMonth);
    this.checkHealth();
  },

  getTodayWeekIndex() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < this.activeWeeks.length; i++) {
      const from = new Date(this.activeWeeks[i].from);
      from.setHours(0, 0, 0, 0);
      const to = new Date(this.activeWeeks[i].to);
      to.setHours(23, 59, 59, 999);
      if (today >= from && today <= to) {
        return i;
      }
    }
    return 0;
  },

  buildMonthStructure(yearMonthKey) {
    const [yearStr, monthStr] = yearMonthKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;

    const weeks = [];
    const firstDayOfMonth = new Date(year, monthIdx, 1);
    const lastDayOfMonth = new Date(year, monthIdx + 1, 0);

    let curr = new Date(firstDayOfMonth);
    while (curr.getDay() !== 1) {
      curr.setDate(curr.getDate() + 1);
    }

    let weekCount = 1;
    while (curr <= lastDayOfMonth || weeks.length === 0) {
      const mon = new Date(curr);
      const fri = new Date(curr);
      fri.setDate(mon.getDate() + 4);

      weeks.push({
        label: `Semana ${weekCount}`,
        from: mon,
        to: fri,
        reservations: JSON.parse(JSON.stringify(this.db[yearMonthKey]?.[weekCount - 1] || {}))
      });

      weekCount++;
      curr.setDate(curr.getDate() + 7);
      if (curr.getMonth() !== monthIdx && curr.getDate() > 7) break;
    }

    return weeks;
  },

  formatDate(d) {
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
  },

  getDayDate(weekIdx, dayIdx) {
    if (!this.activeWeeks[weekIdx]) return new Date();
    const base = this.activeWeeks[weekIdx].from;
    const d = new Date(base);
    d.setDate(base.getDate() + dayIdx);
    return d;
  },

  isToday(d) {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  },

  renderWeekTabs() {
    const container = document.getElementById('week-tabs');
    if (!container) return;
    container.innerHTML = '';

    this.activeWeeks.forEach((w, i) => {
      const btn = document.createElement('button');
      btn.className = 'week-tab' + (i === this.currentWeek ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === this.currentWeek);
      btn.id = `week-tab-${i}`;
      btn.innerHTML = `${w.label}<span class="tab-dates">${this.formatDate(w.from)} – ${this.formatDate(w.to)}</span>`;
      btn.addEventListener('click', () => {
        const prevWeek = this.currentWeek;
        if (i === prevWeek) return;
        this.currentWeek = i;
        const anim = i > prevWeek ? 'anim-slide-left' : 'anim-slide-right';
        this.renderWithAnimation(anim);
      });
      if (i === this.currentWeek) {
        setTimeout(() => {
          btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }, 60);
      }
      container.appendChild(btn);
    });

    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    if (btnPrev) btnPrev.disabled = this.currentWeek === 0;
    if (btnNext) btnNext.disabled = this.currentWeek === this.activeWeeks.length - 1;
  },

  renderWeekBanner() {
    const w = this.activeWeeks[this.currentWeek] || this.activeWeeks[0];
    if (!w) return;

    const label = `${w.from.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })} al ${w.to.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
    const rangeLabel = document.getElementById('week-range-label');
    if (rangeLabel) {
      rangeLabel.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    }

    let total = 0, occupied = 0, blocked = 0;
    this.DAYS.forEach(day => {
      if (day === 'fri') {
        this.FRIDAY_GRID_MAP.forEach(friDef => {
          if (!friDef.fridaySlot) return;
          total++;
          const lookup = friDef.lookupSlots || [friDef.fridaySlot];
          let res = null;
          for (const s of lookup) {
            if (w.reservations.fri?.[s]) {
              res = w.reservations.fri[s];
              break;
            }
          }
          if (res) {
            if (res.isBlocked) blocked++;
            else occupied++;
          } else if (friDef.isDefaultBlocked) {
            blocked++;
          }
        });
      } else {
        this.TIME_SLOTS.filter(ts => !ts.break).forEach(ts => {
          total++;
          const res = w.reservations[day]?.[ts.id];
          const isDefBlocked = this.DEFAULT_BLOCKED_SLOTS[day]?.includes(ts.id);
          if (res) {
            if (res.isBlocked) blocked++;
            else occupied++;
          } else if (isDefBlocked) {
            blocked++;
          }
        });
      }
    });
    const free = Math.max(0, total - (occupied + blocked));

    const statsEl = document.getElementById('week-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-pill occupied">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
          ${occupied} reservados
        </div>
        ${blocked > 0 ? `<div class="stat-pill" style="background:#475569; color:#FFF; border:1px solid #334155;">🔒 ${blocked} no disponibles</div>` : ''}
        <div class="stat-pill free">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>
          ${free} disponibles
        </div>
      `;
    }
  },

  renderCalendarGrid() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    grid.className = 'calendar-grid fade-in';

    // Mantener filtro activo de día móvil si corresponde
    if (this.selectedMobileDay && this.selectedMobileDay !== 'all') {
      grid.classList.add(`filter-${this.selectedMobileDay}`);
    }

    const w = this.activeWeeks[this.currentWeek] || this.activeWeeks[0];
    if (!w) return;

    // Encabezado de Horas
    const timeHeader = document.createElement('div');
    timeHeader.className = 'cal-header-cell time-col';
    timeHeader.setAttribute('data-day', 'time');
    timeHeader.textContent = 'Horario';
    grid.appendChild(timeHeader);

    // Encabezados de Días
    this.DAYS.forEach((day, idx) => {
      const date = this.getDayDate(this.currentWeek, idx);
      const cell = document.createElement('div');
      cell.className = `cal-header-cell day-${day}${this.isToday(date) ? ' day-today' : ''}`;
      cell.setAttribute('data-day', day);
      cell.innerHTML = `${this.DAY_NAMES[day]}<span class="day-date">${this.formatDate(date)}</span>`;
      grid.appendChild(cell);
    });

    // Filas de Horario
    this.TIME_SLOTS.forEach(ts => {
      if (ts.break) {
        const breakTime = document.createElement('div');
        breakTime.className = 'cal-break-cell';
        breakTime.setAttribute('data-day', 'time');
        breakTime.textContent = ts.label;
        grid.appendChild(breakTime);

        this.DAYS.forEach((day) => {
          const cell = document.createElement('div');
          cell.className = 'cal-slot break-row';
          cell.setAttribute('data-day', day);
          grid.appendChild(cell);
        });
        return;
      }

      const timeCell = document.createElement('div');
      timeCell.className = 'cal-time-cell';
      timeCell.setAttribute('data-day', 'time');
      timeCell.textContent = ts.label;
      grid.appendChild(timeCell);

      this.DAYS.forEach(day => {
        const slotCell = document.createElement('div');
        slotCell.setAttribute('data-day', day);

        // Tratamiento específico para el día VIERNES
        if (day === 'fri') {
          const friDef = this.FRIDAY_GRID_MAP.find(m => m.slotId === ts.id);
          let customResv = w.reservations.fri?.[ts.id];

          if (!friDef || friDef.fridaySlot === null) {
            if (customResv && customResv.curso !== 'Sin Bloque' && customResv.curso !== 'DISPONIBLE') {
              slotCell.className = 'cal-slot occupied-slot';
              const card = document.createElement('div');
              card.className = `reservation-card ${customResv.isBlocked ? 'blocked-card' : this.DAY_CLASSES.fri}`;
              card.innerHTML = `
                <span class="slot-friday-badge">🕒 ${ts.label}</span>
                <span class="card-teacher">${customResv.isBlocked ? '🔒 NO DISPONIBLE' : customResv.docente}</span>
                <span class="card-course">${customResv.curso || ''}</span>
              `;
              card.addEventListener('click', () => {
                Reservations.showDetail(customResv, 'fri', ts.id, this.currentWeek);
              });
              slotCell.appendChild(card);
              grid.appendChild(slotCell);
              return;
            }

            slotCell.className = 'cal-slot slot-no-class';
            if (Auth.isAdmin) {
              slotCell.style.cursor = 'pointer';
              slotCell.setAttribute('title', `Administrador: Clic para configurar o reservar este horario (${ts.label})`);
              slotCell.addEventListener('click', () => {
                Reservations.openAddModal(this.currentWeek, 'fri', ts.id);
              });
            }
            slotCell.innerHTML = `
              <div class="slot-no-class-inner">
                <span class="no-class-text">${friDef ? friDef.label : '— Sin bloque —'}</span>
                ${friDef?.isAfternoon ? '<span class="no-class-sub">Salida 13:00 hrs</span>' : ''}
              </div>
            `;
            grid.appendChild(slotCell);
            return;
          }

          const actualSlot = friDef.fridaySlot;
          let reservation = null;
          const lookup = friDef.lookupSlots || [actualSlot];
          for (const s of lookup) {
            if (w.reservations.fri?.[s]) {
              reservation = w.reservations.fri[s];
              break;
            }
          }

          if (reservation) {
            if (reservation.curso === 'Sin Bloque' || reservation.isSinBloque) {
              slotCell.className = 'cal-slot slot-no-class';
              if (Auth.isAdmin) {
                slotCell.style.cursor = 'pointer';
                slotCell.setAttribute('title', `Administrador: Clic para ver detalle o modificar (${friDef.label})`);
                slotCell.addEventListener('click', () => {
                  Reservations.showDetail(reservation, 'fri', actualSlot, this.currentWeek);
                });
              }
              slotCell.innerHTML = `
                <div class="slot-no-class-inner">
                  <span class="no-class-text">— Sin bloque —</span>
                  <span class="no-class-sub">Configurado por admin</span>
                </div>
              `;
              grid.appendChild(slotCell);
              return;
            }

            if (reservation.curso === 'DISPONIBLE') {
              slotCell.className = 'cal-slot free-slot';
              slotCell.setAttribute('title', `Disponible: Viernes ${friDef.label}`);
              slotCell.innerHTML = `
                <div class="slot-empty">
                  <span class="slot-friday-badge free">🕒 ${friDef.label}</span>
                  <div class="slot-empty-icon">+</div>
                  <span class="slot-empty-label">Disponible</span>
                </div>
              `;
              slotCell.addEventListener('click', () => {
                if (!Auth.isTeacher && !Auth.isAdmin) {
                  Auth.openAdminLoginModal();
                } else if (typeof Reservations !== 'undefined') {
                  Reservations.openAddModal(this.currentWeek, 'fri', actualSlot);
                }
              });
              grid.appendChild(slotCell);
              return;
            }

            slotCell.className = 'cal-slot occupied-slot';
            const card = document.createElement('div');

            if (reservation.isBlocked) {
              card.className = 'reservation-card blocked-card';
              card.setAttribute('title', `Bloqueado por Administración: ${reservation.curso || 'Uso institucional'}`);
              card.innerHTML = `
                <span class="slot-friday-badge">🕒 ${friDef.label}</span>
                <span class="card-teacher">🔒 NO DISPONIBLE</span>
                <span class="card-course">${reservation.curso || 'Uso institucional'}</span>
              `;
            } else {
              card.className = `reservation-card ${this.DAY_CLASSES[day]}`;
              card.setAttribute('title', `Viernes ${friDef.label}: ${reservation.docente} — ${reservation.curso}`);
              let html = `<span class="slot-friday-badge">🕒 ${friDef.label}</span>`;
              html += `<span class="card-teacher">${reservation.docente}</span>`;
              html += `<span class="card-course">${reservation.curso}</span>`;
              if (reservation.nota) html += `<span class="card-note">${reservation.nota}</span>`;
              card.innerHTML = html;
            }

            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.addEventListener('click', () => {
              if (typeof Reservations !== 'undefined') {
                Reservations.showDetail(reservation, 'fri', actualSlot, this.currentWeek);
              }
            });
            slotCell.appendChild(card);
          } else if (friDef.isDefaultBlocked) {
            slotCell.className = 'cal-slot blocked-slot-cell';
            const card = document.createElement('div');
            card.className = 'reservation-card blocked-card default-blocked';
            card.setAttribute('title', `Viernes ${friDef.label}: Horario no disponible según jornada institucional`);
            card.innerHTML = `
              <span class="slot-friday-badge">🕒 ${friDef.label}</span>
              <span class="card-teacher">🔒 NO DISPONIBLE</span>
              <span class="card-course">Horario institucional</span>
            `;
            card.addEventListener('click', () => {
              if (Auth.isAdmin) {
                Reservations.openAddModal(this.currentWeek, 'fri', actualSlot);
              } else {
                if (typeof showToast === 'function') {
                  showToast('ℹ️ Este bloque no está disponible según la jornada institucional.');
                } else {
                  alert('Este bloque no está disponible según la jornada institucional.');
                }
              }
            });
            slotCell.appendChild(card);
          } else {
            slotCell.className = 'cal-slot free-slot';
            slotCell.setAttribute('title', `Disponible: Viernes ${friDef.label}`);
            slotCell.innerHTML = `
              <div class="slot-empty">
                <span class="slot-friday-badge free">🕒 ${friDef.label}</span>
                <div class="slot-empty-icon">+</div>
                <span class="slot-empty-label">Disponible</span>
              </div>
            `;
            slotCell.addEventListener('click', () => {
              if (!Auth.isTeacher && !Auth.isAdmin) {
                Auth.openAdminLoginModal();
              } else if (typeof Reservations !== 'undefined') {
                Reservations.openAddModal(this.currentWeek, 'fri', actualSlot);
              }
            });
          }

          grid.appendChild(slotCell);
          return;
        }

        // Tratamiento para LUNES, MARTES, MIÉRCOLES y JUEVES
        const reservation = w.reservations[day]?.[ts.id];
        const isDefaultBlocked = this.DEFAULT_BLOCKED_SLOTS[day]?.includes(ts.id);

        if (reservation) {
          if (reservation.curso === 'Sin Bloque' || reservation.isSinBloque) {
            slotCell.className = 'cal-slot slot-no-class';
            if (Auth.isAdmin) {
              slotCell.style.cursor = 'pointer';
              slotCell.setAttribute('title', `Administrador: Clic para ver detalle o modificar (${ts.label})`);
              slotCell.addEventListener('click', () => {
                Reservations.showDetail(reservation, day, ts.id, this.currentWeek);
              });
            }
            slotCell.innerHTML = `
              <div class="slot-no-class-inner">
                <span class="no-class-text">— Sin bloque —</span>
                <span class="no-class-sub">Configurado por admin</span>
              </div>
            `;
            grid.appendChild(slotCell);
            return;
          }

          if (reservation.curso === 'DISPONIBLE') {
            slotCell.className = 'cal-slot free-slot';
            slotCell.setAttribute('title', `Disponible: ${this.DAY_NAMES[day]} ${ts.label}`);
            slotCell.innerHTML = `<div class="slot-empty"><div class="slot-empty-icon">+</div><span class="slot-empty-label">Disponible</span></div>`;
            slotCell.addEventListener('click', () => {
              if (!Auth.isTeacher && !Auth.isAdmin) {
                Auth.openAdminLoginModal();
              } else if (typeof Reservations !== 'undefined') {
                Reservations.openAddModal(this.currentWeek, day, ts.id);
              }
            });
            grid.appendChild(slotCell);
            return;
          }

          slotCell.className = 'cal-slot occupied-slot';
          const card = document.createElement('div');

          if (reservation.isBlocked) {
            card.className = 'reservation-card blocked-card';
            card.setAttribute('title', `Bloqueado por Administración: ${reservation.curso || 'Mantenimiento'}`);
            card.innerHTML = `<span class="card-teacher">🔒 NO DISPONIBLE</span><span class="card-course">${reservation.curso || 'No disponible'}</span>`;
          } else {
            card.className = `reservation-card ${this.DAY_CLASSES[day]}`;
            card.setAttribute('title', `${reservation.docente} — ${reservation.curso}`);
            let html = `<span class="card-teacher">${reservation.docente}</span>`;
            html += `<span class="card-course">${reservation.curso}</span>`;
            if (reservation.nota) html += `<span class="card-note">${reservation.nota}</span>`;
            card.innerHTML = html;
          }

          card.setAttribute('role', 'button');
          card.setAttribute('tabindex', '0');
          card.addEventListener('click', () => {
            if (typeof Reservations !== 'undefined') {
              Reservations.showDetail(reservation, day, ts.id, this.currentWeek);
            }
          });
          slotCell.appendChild(card);
        } else if (isDefaultBlocked) {
          slotCell.className = 'cal-slot blocked-slot-cell';
          const card = document.createElement('div');
          card.className = 'reservation-card blocked-card default-blocked';
          card.setAttribute('title', `${this.DAY_NAMES[day]} ${ts.label}: Horario no disponible según jornada institucional`);
          card.innerHTML = `
            <span class="card-teacher">🔒 NO DISPONIBLE</span>
            <span class="card-course">Horario institucional</span>
          `;
          card.addEventListener('click', () => {
            if (Auth.isAdmin) {
              Reservations.openAddModal(this.currentWeek, day, ts.id);
            } else {
              if (typeof showToast === 'function') {
                showToast('ℹ️ Este bloque no está disponible según la jornada institucional.');
              } else {
                alert('Este bloque no está disponible según la jornada institucional.');
              }
            }
          });
          slotCell.appendChild(card);
        } else {
          slotCell.className = 'cal-slot free-slot';
          slotCell.setAttribute('title', `Disponible: ${this.DAY_NAMES[day]} ${ts.label}`);
          slotCell.innerHTML = `<div class="slot-empty"><div class="slot-empty-icon">+</div><span class="slot-empty-label">Disponible</span></div>`;
          slotCell.addEventListener('click', () => {
            if (!Auth.isTeacher && !Auth.isAdmin) {
              Auth.openAdminLoginModal();
            } else if (typeof Reservations !== 'undefined') {
              Reservations.openAddModal(this.currentWeek, day, ts.id);
            }
          });
        }

        grid.appendChild(slotCell);
      });
    });
  },

  setMobileDay(day, animClass = null) {
    this.selectedMobileDay = day || 'all';
    const grid = document.getElementById('calendar-grid');
    if (grid) {
      grid.classList.remove('filter-mon', 'filter-tue', 'filter-wed', 'filter-thu', 'filter-fri', 'anim-slide-left', 'anim-slide-right');
      if (this.selectedMobileDay !== 'all') {
        grid.classList.add(`filter-${this.selectedMobileDay}`);
      }
      if (animClass) {
        void grid.offsetWidth;
        grid.classList.add(animClass);
      }
    }
    const wrapper = document.getElementById('calendar-wrapper');
    if (wrapper) wrapper.scrollLeft = 0;

    // Sincronizar estado visual de la barra de días móviles
    const mobileDayNav = document.getElementById('mobile-day-nav');
    if (mobileDayNav) {
      mobileDayNav.querySelectorAll('.m-day-tab').forEach(tab => {
        const isActive = (tab.dataset.day || 'all') === this.selectedMobileDay;
        tab.classList.toggle('active', isActive);
        if (isActive) {
          tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });
    }
  },

  goToNextWeek(fromUserGesture = false) {
    if (this.currentWeek < this.activeWeeks.length - 1) {
      this.currentWeek++;
      this.renderWithAnimation('anim-slide-left');
      return true;
    } else if (fromUserGesture && typeof showToast === 'function') {
      showToast('ℹ️ Ya estás en la última semana del mes', 'info');
    }
    return false;
  },

  goToPrevWeek(fromUserGesture = false) {
    if (this.currentWeek > 0) {
      this.currentWeek--;
      this.renderWithAnimation('anim-slide-right');
      return true;
    } else if (fromUserGesture && typeof showToast === 'function') {
      showToast('ℹ️ Ya estás en la primera semana del mes', 'info');
    }
    return false;
  },

  goToNextMobileDay(fromUserGesture = false) {
    if (this.selectedMobileDay === 'all') {
      return this.goToNextWeek(fromUserGesture);
    }
    const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const idx = dayOrder.indexOf(this.selectedMobileDay);
    if (idx < dayOrder.length - 1) {
      this.setMobileDay(dayOrder[idx + 1], 'anim-slide-left');
      return true;
    } else {
      // Viernes -> Avanza a la siguiente semana y muestra Lunes
      if (this.goToNextWeek(fromUserGesture)) {
        this.setMobileDay('mon', 'anim-slide-left');
        return true;
      }
    }
    return false;
  },

  goToPrevMobileDay(fromUserGesture = false) {
    if (this.selectedMobileDay === 'all') {
      return this.goToPrevWeek(fromUserGesture);
    }
    const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const idx = dayOrder.indexOf(this.selectedMobileDay);
    if (idx > 0) {
      this.setMobileDay(dayOrder[idx - 1], 'anim-slide-right');
      return true;
    } else {
      // Lunes -> Retrocede a la semana anterior y muestra Viernes
      if (this.goToPrevWeek(fromUserGesture)) {
        this.setMobileDay('fri', 'anim-slide-right');
        return true;
      }
    }
    return false;
  },

  renderWithAnimation(animClass = null) {
    this.render();
    if (animClass) {
      const grid = document.getElementById('calendar-grid');
      if (grid) {
        grid.classList.remove('anim-slide-left', 'anim-slide-right');
        void grid.offsetWidth; // Forzar reflujo de layout para reiniciar animación
        grid.classList.add(animClass);
      }
    }
  },

  render() {
    this.renderWeekTabs();
    this.renderWeekBanner();
    this.renderCalendarGrid();
  },

  async fetchMonth(ym, forceRefresh = false) {
    const syncBtn = document.getElementById('btn-sync-calendar');
    const syncText = document.getElementById('sync-status-text');

    // 1. Si tenemos datos en caché válidos y no es refresco forzado: render inmediato (0ms de latencia)
    const cached = this.cache[ym];
    const now = Date.now();
    const isCacheFresh = cached && (now - cached.timestamp < 120000); // 2 minutos fresca

    if (cached && !forceRefresh) {
      this.db[ym] = cached.data;
      this.activeWeeks = this.buildMonthStructure(ym);
      this.render();
      if (syncText) this.updateSyncUI();
      if (!isCacheFresh) {
        // Revalidar silenciosamente en segundo plano (Stale-While-Revalidate)
        this.revalidateInBackground(ym);
      }
      return;
    }

    if (syncBtn) syncBtn.classList.add('syncing');
    if (syncText) syncText.textContent = 'Actualizando...';

    try {
      const res = await API.getReservas(ym);
      if (res.success && Array.isArray(res.data)) {
        this.cache[ym] = { data: res.data, timestamp: Date.now() };
        this.db[ym] = res.data;
        this.activeWeeks = this.buildMonthStructure(ym);
        this.render();
      }
      this.lastSyncTime = Date.now();
      this.updateSyncUI();
      this.updateNeonBadge(res.source === 'neon');
    } catch (err) {
      console.warn('Cargando calendario localmente:', err.message);
      this.updateNeonBadge(false);
      if (syncText) syncText.textContent = 'Sin conexión';
    } finally {
      if (syncBtn) syncBtn.classList.remove('syncing');
    }
  },

  async revalidateInBackground(ym) {
    try {
      const res = await API.getReservas(ym);
      if (res.success && Array.isArray(res.data)) {
        this.cache[ym] = { data: res.data, timestamp: Date.now() };
        this.db[ym] = res.data;
        this.activeWeeks = this.buildMonthStructure(ym);
        this.render();
        this.lastSyncTime = Date.now();
        this.updateSyncUI();
      }
    } catch (err) {
      console.warn('Error en revalidación background:', err.message);
    }
  },

  updateSyncUI() {
    const syncText = document.getElementById('sync-status-text');
    if (!syncText || !this.lastSyncTime) return;

    const diffSec = Math.floor((Date.now() - this.lastSyncTime) / 1000);
    if (diffSec < 45) {
      syncText.textContent = 'Al día';
    } else if (diffSec < 120) {
      syncText.textContent = 'Hace 1 min';
    } else {
      const min = Math.floor(diffSec / 60);
      syncText.textContent = `Hace ${min} min`;
    }
  },

  initSyncTimer() {
    if (this.syncIntervalId) clearInterval(this.syncIntervalId);
    this.syncIntervalId = setInterval(() => {
      this.updateSyncUI();
    }, 30000);
  },

  invalidateCache(ym) {
    if (ym) delete this.cache[ym];
    else this.cache = {};
  },

  async loadMonth(ym) {
    this.currentYearMonth = ym;
    this.invalidateCache(ym);
    return await this.fetchMonth(ym, true);
  },

  async checkHealth() {
    try {
      const res = await API.checkHealth();
      this.updateNeonBadge(Boolean(res.neonConnected));
    } catch {
      this.updateNeonBadge(false);
    }
  },

  updateNeonBadge(isNeon) {
    const badge = document.getElementById('neon-badge');
    const text = document.getElementById('neon-status-text');
    if (!badge || !text) return;

    if (isNeon) {
      badge.className = 'neon-badge';
      text.textContent = 'Neon DB Conectado';
      badge.setAttribute('title', 'Base de datos PostgreSQL en Neon sincronizada en tiempo real');
    } else {
      badge.className = 'neon-badge offline';
      text.textContent = 'Almacenamiento Local';
      badge.setAttribute('title', 'Operando con almacenamiento local');
    }
  },

  bindEvents() {
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');

    const handleChange = () => {
      this.currentYearMonth = `${yearSelect.value}-${monthSelect.value}`;
      this.activeWeeks = this.buildMonthStructure(this.currentYearMonth);

      const now = new Date();
      const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (this.currentYearMonth === currentYM) {
        this.currentWeek = this.getTodayWeekIndex();
      } else {
        this.currentWeek = 0;
      }

      this.render();
      this.fetchMonth(this.currentYearMonth);
    };

    if (monthSelect) monthSelect.addEventListener('change', handleChange);
    if (yearSelect) yearSelect.addEventListener('change', handleChange);

    // Botón de sincronización manual rápida
    const btnSync = document.getElementById('btn-sync-calendar');
    if (btnSync) {
      btnSync.addEventListener('click', () => {
        this.fetchMonth(this.currentYearMonth, true);
        if (typeof showToast === 'function') {
          showToast('🔄 Calendario sincronizado con el servidor.', 'info');
        }
      });
    }

    document.getElementById('btn-prev')?.addEventListener('click', () => {
      this.goToPrevWeek(true);
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
      this.goToNextWeek(true);
    });

    // Selector de día en móvil (Lunes a Viernes o Semana Completa)
    const mobileDayNav = document.getElementById('mobile-day-nav');
    if (mobileDayNav) {
      mobileDayNav.addEventListener('click', (e) => {
        const tab = e.target.closest('.m-day-tab');
        if (!tab) return;
        this.setMobileDay(tab.dataset.day || 'all');
      });
    }
  },

  initSwipeGestures() {
    const targets = [
      document.getElementById('calendar-wrapper'),
      document.getElementById('week-banner'),
      document.getElementById('week-tabs')
    ].filter(Boolean);

    targets.forEach(el => {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let isSwiping = false;

      el.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        isSwiping = true;
      }, { passive: true });

      el.addEventListener('touchmove', (e) => {
        if (!isSwiping || !e.touches || e.touches.length !== 1) return;
      }, { passive: true });

      el.addEventListener('touchend', (e) => {
        if (!isSwiping) return;
        isSwiping = false;
        if (!e.changedTouches || e.changedTouches.length !== 1) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        const elapsed = Date.now() - touchStartTime;

        // Validaciones:
        // 1. Debe completarse en menos de 750ms
        if (elapsed > 750) return;

        // 2. Desplazamiento horizontal mínimo de 45px
        if (Math.abs(diffX) < 45) return;

        // 3. Predominancia horizontal clara sobre vertical (|diffX| > |diffY| * 1.25)
        if (Math.abs(diffX) <= Math.abs(diffY) * 1.25) return;

        // 4. Si es calendar-wrapper y estamos en vista completa 'all' con scroll horizontal disponible:
        if (el.id === 'calendar-wrapper' && this.selectedMobileDay === 'all') {
          const maxScroll = el.scrollWidth - el.clientWidth;
          if (maxScroll > 15) {
            const atLeftEdge = el.scrollLeft <= 15;
            const atRightEdge = el.scrollLeft >= maxScroll - 15;

            // Si desliza a la derecha (retroceder) pero no está en el borde izquierdo,
            // permitimos el desplazamiento horizontal nativo
            if (diffX > 0 && !atLeftEdge) return;
            // Si desliza a la izquierda (avanzar) pero no está en el borde derecho,
            // permitimos el desplazamiento horizontal nativo
            if (diffX < 0 && !atRightEdge) return;
          }
        }

        // diffX < 0: el usuario deslizó hacia la izquierda (Avanzar)
        // diffX > 0: el usuario deslizó hacia la derecha (Retroceder)
        if (diffX < 0) {
          if (this.selectedMobileDay !== 'all') {
            this.goToNextMobileDay(true);
          } else {
            this.goToNextWeek(true);
          }
        } else {
          if (this.selectedMobileDay !== 'all') {
            this.goToPrevMobileDay(true);
          } else {
            this.goToPrevWeek(true);
          }
        }
      }, { passive: true });

      el.addEventListener('touchcancel', () => {
        isSwiping = false;
      }, { passive: true });
    });
  }
};
