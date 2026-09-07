/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Módulo de Gestión de Docentes y Usuarios (Exclusivo Administrador)
 * ══════════════════════════════════════════════════════════════════════════════
 */

const Users = {
  list: [],
  selectedUser: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Abrir modal de gestión desde el botón en el header
    const btnManage = document.getElementById('btn-manage-users');
    if (btnManage) {
      btnManage.addEventListener('click', () => this.openModal());
    }

    // Cerrar modal principal
    const closeBtn = document.getElementById('users-modal-close');
    const overlay = document.getElementById('users-modal-overlay');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal();
      });
    }

    // Buscador en tiempo real
    const searchInput = document.getElementById('users-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.render(e.target.value.trim().toLowerCase());
      });
    }

    // Modal de acción (Reset de Contraseña)
    const actionClose = document.getElementById('user-action-close');
    const actionCancel = document.getElementById('user-action-cancel');
    const actionOverlay = document.getElementById('user-action-overlay');
    if (actionClose) actionClose.addEventListener('click', () => this.closeActionModal());
    if (actionCancel) actionCancel.addEventListener('click', () => this.closeActionModal());
    if (actionOverlay) {
      actionOverlay.addEventListener('click', (e) => {
        if (e.target === actionOverlay) this.closeActionModal();
      });
    }

    // Toggle de radio button para contraseña temporal
    const radioEmail = document.querySelector('input[name="reset-option"][value="email"]');
    const radioTemp = document.querySelector('input[name="reset-option"][value="temporary"]');
    const tempField = document.getElementById('temp-pass-field');

    if (radioEmail && radioTemp && tempField) {
      radioEmail.addEventListener('change', () => {
        if (radioEmail.checked) tempField.style.display = 'none';
      });
      radioTemp.addEventListener('change', () => {
        if (radioTemp.checked) {
          tempField.style.display = 'block';
          const passInput = document.getElementById('action-temp-pass');
          if (passInput) passInput.focus();
        }
      });
    }

    // Envío del formulario de reset de contraseña
    const resetForm = document.getElementById('user-reset-form');
    if (resetForm) {
      resetForm.addEventListener('submit', (e) => this.handleResetSubmit(e));
    }
  },

  async openModal() {
    if (!Auth.isAdmin) {
      showToast('Acceso restringido a Administradores.', 'error');
      return;
    }

    const overlay = document.getElementById('users-modal-overlay');
    const searchInput = document.getElementById('users-search-input');
    if (searchInput) searchInput.value = '';

    if (overlay) overlay.classList.add('open');
    await this.fetchUsers();
  },

  closeModal() {
    const overlay = document.getElementById('users-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  },

  async fetchUsers() {
    const loading = document.getElementById('users-loading');
    const listWrapper = document.getElementById('users-list');
    const emptyState = document.getElementById('users-empty');

    if (loading) loading.style.display = 'block';
    if (listWrapper) listWrapper.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';

    try {
      const res = await API.getUsers();
      this.list = res.users || [];
      this.updateStats();
      this.render();
    } catch (err) {
      showToast(err.message || 'Error al cargar usuarios.', 'error');
      if (loading) loading.style.display = 'none';
    }
  },

  updateStats() {
    const total = this.list.length;
    const admins = this.list.filter(u => u.role === 'administrator').length;
    const teachers = this.list.filter(u => u.role !== 'administrator').length;

    const bTotal = document.getElementById('badge-total-users');
    const bAdmins = document.getElementById('badge-total-admins');
    const bTeachers = document.getElementById('badge-total-teachers');

    if (bTotal) bTotal.textContent = `Total: ${total}`;
    if (bAdmins) bAdmins.textContent = `Admins: ${admins}`;
    if (bTeachers) bTeachers.textContent = `Docentes: ${teachers}`;
  },

  render(filterText = '') {
    const loading = document.getElementById('users-loading');
    const listWrapper = document.getElementById('users-list');
    const emptyState = document.getElementById('users-empty');

    if (loading) loading.style.display = 'none';

    const filtered = this.list.filter(u => {
      if (!filterText) return true;
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(filterText) || email.includes(filterText);
    });

    if (filtered.length === 0) {
      if (listWrapper) listWrapper.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (listWrapper) {
      listWrapper.style.display = 'flex';
      listWrapper.innerHTML = '';

      const currentUserId = Auth.currentUser?.userId;

      filtered.forEach(u => {
        const isSelf = (u.id === currentUserId);
        const isAdmin = (u.role === 'administrator');
        const initials = (u.name || 'U')
          .split(' ')
          .map(w => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

        const card = document.createElement('div');
        card.className = 'user-card-item';
        card.innerHTML = `
          <div class="user-card-left">
            <div class="user-avatar ${isAdmin ? 'avatar-admin' : 'avatar-teacher'}">
              ${initials}
            </div>
            <div class="user-info">
              <div class="user-name-line">
                <span class="user-name">${this.escapeHtml(u.name)}</span>
                ${isSelf ? '<span class="user-tag-you">Tú</span>' : ''}
              </div>
              <span class="user-email">${this.escapeHtml(u.email)}</span>
              <div class="user-badges-line">
                <span class="u-badge ${isAdmin ? 'badge-role-admin' : 'badge-role-teacher'}">
                  ${isAdmin ? '🛡️ Administrador' : '👨‍🏫 Docente'}
                </span>
                ${u.must_change_password ? '<span class="u-badge badge-warning" title="Debe cambiar su contraseña">⚠️ Clave Temporal</span>' : '<span class="u-badge badge-active">✓ Activo</span>'}
                <span class="u-badge badge-reservas" title="Total de reservas efectuadas">
                  📅 ${u.total_reservas || 0} ${u.total_reservas === 1 ? 'reserva' : 'reservas'}
                </span>
              </div>
            </div>
          </div>

          <div class="user-card-actions">
            <!-- Botón Cambiar Rol -->
            <button class="btn-u-action btn-u-role" data-id="${u.id}" data-role="${u.role}" ${isSelf ? 'disabled title="No puedes cambiar tu propio rol"' : 'title="Cambiar rol entre Docente y Administrador"'}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 014-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 01-4 4H3" />
              </svg>
              ${isAdmin ? 'Hacer Docente' : 'Hacer Admin'}
            </button>

            <!-- Botón Restablecer Contraseña -->
            <button class="btn-u-action btn-u-reset" data-id="${u.id}" title="Restablecer o asignar contraseña">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Contraseña
            </button>

            <!-- Botón Eliminar Usuario -->
            <button class="btn-u-action btn-u-delete" data-id="${u.id}" data-name="${this.escapeHtml(u.name)}" ${isSelf ? 'disabled title="No puedes eliminar tu propia cuenta"' : 'title="Dar de baja usuario"'}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        `;

        // Eventos en botones de la tarjeta
        const btnRole = card.querySelector('.btn-u-role');
        if (btnRole && !isSelf) {
          btnRole.addEventListener('click', () => this.toggleUserRole(u));
        }

        const btnReset = card.querySelector('.btn-u-reset');
        if (btnReset) {
          btnReset.addEventListener('click', () => this.openActionModal(u));
        }

        const btnDelete = card.querySelector('.btn-u-delete');
        if (btnDelete && !isSelf) {
          btnDelete.addEventListener('click', () => this.confirmDeleteUser(u));
        }

        listWrapper.appendChild(card);
      });
    }
  },

  async toggleUserRole(user) {
    const newRole = (user.role === 'administrator') ? 'docente' : 'administrator';
    const newRoleName = (newRole === 'administrator') ? 'ADMINISTRADOR' : 'DOCENTE';

    const confirmMsg = `¿Desea cambiar el rol de ${user.name} a "${newRoleName}"?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await API.updateUserRole(user.id, newRole);
      showToast(res.message || 'Rol actualizado con éxito.');
      await this.fetchUsers();
    } catch (err) {
      showToast(err.message || 'Error al cambiar rol.', 'error');
    }
  },

  openActionModal(user) {
    this.selectedUser = user;
    const overlay = document.getElementById('user-action-overlay');
    const title = document.getElementById('user-action-title');
    const subtitle = document.getElementById('user-action-subtitle');
    const inputId = document.getElementById('action-user-id');
    const errBox = document.getElementById('user-action-error');
    const tempField = document.getElementById('temp-pass-field');
    const tempInput = document.getElementById('action-temp-pass');
    const radioEmail = document.querySelector('input[name="reset-option"][value="email"]');

    if (errBox) {
      errBox.textContent = '';
      errBox.classList.remove('visible');
    }
    if (radioEmail) radioEmail.checked = true;
    if (tempField) tempField.style.display = 'none';
    if (tempInput) tempInput.value = '';

    if (title) title.textContent = `Restablecer: ${user.name}`;
    if (subtitle) subtitle.textContent = user.email;
    if (inputId) inputId.value = user.id;

    if (overlay) overlay.classList.add('open');
  },

  closeActionModal() {
    const overlay = document.getElementById('user-action-overlay');
    if (overlay) overlay.classList.remove('open');
    this.selectedUser = null;
  },

  async handleResetSubmit(e) {
    e.preventDefault();
    if (!this.selectedUser) return;

    const errBox = document.getElementById('user-action-error');
    const submitBtn = document.getElementById('user-action-submit');
    const selectedMode = document.querySelector('input[name="reset-option"]:checked')?.value || 'email';
    const tempPass = document.getElementById('action-temp-pass')?.value.trim();

    if (errBox) {
      errBox.textContent = '';
      errBox.classList.remove('visible');
    }

    if (selectedMode === 'temporary' && tempPass && tempPass.length < 8) {
      if (errBox) {
        errBox.textContent = 'La contraseña temporal debe tener al menos 8 caracteres.';
        errBox.classList.add('visible');
      }
      return;
    }

    const origText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Procesando...';

    try {
      const payload = {
        mode: selectedMode,
        temporaryPassword: tempPass || undefined
      };

      const res = await API.adminResetPassword(this.selectedUser.id, payload);
      this.closeActionModal();

      if (res.temporaryPassword) {
        alert(`✓ Contraseña temporal establecida con éxito para ${this.selectedUser.name}:\n\n${res.temporaryPassword}\n\nPor favor facilítele esta clave al docente. Al ingresar se le exigirá cambiarla.`);
      } else {
        showToast(res.message || 'Código enviado al correo del docente.');
      }

      await this.fetchUsers();
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message || 'Error al restablecer contraseña.';
        errBox.classList.add('visible');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
    }
  },

  async confirmDeleteUser(user) {
    const msg = `⚠️ ATENCIÓN:\n¿Está seguro de eliminar definitivamente la cuenta de:\n\n${user.name} (${user.email})?\n\nEsta acción no se puede deshacer.`;
    if (!confirm(msg)) return;

    try {
      const res = await API.deleteUser(user.id);
      showToast(res.message || 'Usuario eliminado correctamente.');
      await this.fetchUsers();
    } catch (err) {
      showToast(err.message || 'Error al eliminar usuario.', 'error');
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

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  Users.init();
});
