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

  currentYearMonth: '',
  currentWeek: 0,
  activeWeeks: [],
  db: {},

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
        this.currentWeek = i;
        this.render();
      });
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
      this.TIME_SLOTS.filter(ts => !ts.break).forEach(ts => {
        total++;
        const res = w.reservations[day]?.[ts.id];
        if (res) {
          if (res.isBlocked) blocked++;
          else occupied++;
        }
      });
    });
    const free = total - (occupied + blocked);

    const statsEl = document.getElementById('week-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-pill occupied">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
          ${occupied} reservados
        </div>
        ${blocked > 0 ? `<div class="stat-pill" style="background:#475569; color:#FFF; border:1px solid #334155;">🔒 ${blocked} bloqueados</div>` : ''}
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

    const w = this.activeWeeks[this.currentWeek] || this.activeWeeks[0];
    if (!w) return;

    // Encabezado de Horas
    const timeHeader = document.createElement('div');
    timeHeader.className = 'cal-header-cell time-col';
    timeHeader.textContent = 'Horario';
    grid.appendChild(timeHeader);

    // Encabezados de Días
    this.DAYS.forEach((day, idx) => {
      const date = this.getDayDate(this.currentWeek, idx);
      const cell = document.createElement('div');
      cell.className = `cal-header-cell day-${day}${this.isToday(date) ? ' day-today' : ''}`;
      cell.innerHTML = `${this.DAY_NAMES[day]}<span class="day-date">${this.formatDate(date)}</span>`;
      grid.appendChild(cell);
    });

    // Filas de Horario
    this.TIME_SLOTS.forEach(ts => {
      if (ts.break) {
        const breakTime = document.createElement('div');
        breakTime.className = 'cal-break-cell';
        breakTime.textContent = ts.label;
        grid.appendChild(breakTime);

        this.DAYS.forEach(() => {
          const cell = document.createElement('div');
          cell.className = 'cal-slot break-row';
          grid.appendChild(cell);
        });
        return;
      }

      const timeCell = document.createElement('div');
      timeCell.className = 'cal-time-cell';
      timeCell.textContent = ts.label;
      grid.appendChild(timeCell);

      this.DAYS.forEach(day => {
        const slotCell = document.createElement('div');
        const reservation = w.reservations[day]?.[ts.id];

        if (reservation) {
          slotCell.className = 'cal-slot occupied-slot';
          const card = document.createElement('div');

          if (reservation.isBlocked) {
            card.className = 'reservation-card blocked-card';
            card.setAttribute('title', `Bloqueado por Administración: ${reservation.curso || 'Mantenimiento'}`);
            card.innerHTML = `<span class="card-teacher">🔒 BLOQUEADO</span><span class="card-course">${reservation.curso || 'No disponible'}</span>`;
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
        } else {
          slotCell.className = 'cal-slot free-slot';
          slotCell.setAttribute('title', `Disponible: ${this.DAY_NAMES[day]} ${ts.label}`);
          slotCell.innerHTML = `<div class="slot-empty"><div class="slot-empty-icon">+</div></div>`;
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

  render() {
    this.renderWeekTabs();
    this.renderWeekBanner();
    this.renderCalendarGrid();
  },

  async fetchMonth(ym) {
    try {
      const res = await API.getReservas(ym);
      if (res.success && Array.isArray(res.data)) {
        this.db[ym] = res.data;
        this.activeWeeks = this.buildMonthStructure(ym);
        this.render();
      }
      this.updateNeonBadge(res.source === 'neon');
    } catch (err) {
      console.warn('Cargando calendario localmente:', err.message);
      this.updateNeonBadge(false);
    }
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

    document.getElementById('btn-prev')?.addEventListener('click', () => {
      if (this.currentWeek > 0) {
        this.currentWeek--;
        this.render();
      }
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
      if (this.currentWeek < this.activeWeeks.length - 1) {
        this.currentWeek++;
        this.render();
      }
    });
  }
};
