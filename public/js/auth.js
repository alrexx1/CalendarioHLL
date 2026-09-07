/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Módulo de Autenticación, Sesiones y Cambio Obligatorio de Contraseña
 * ══════════════════════════════════════════════════════════════════════════════
 */

const Auth = {
  currentUser: null,
  isAdmin: false,
  isTeacher: false,
  pendingSlot: null,

  init() {
    this.bindEvents();
    this.restoreSession();
  },

  restoreSession() {
    const savedUser = API.getUser();
    const token = API.getToken();

    if (savedUser && token) {
      this.setUserSession(savedUser, token);
      this.unlockAccessWall();
    }
  },

  setUserSession(user, token) {
    this.currentUser = user;
    this.isAdmin = (user.role === 'administrator');
    this.isTeacher = (user.role === 'docente' || this.isAdmin);

    API.setUser(user);
    if (token) API.setToken(token);

    this.updateUI();
  },

  clearSession() {
    this.currentUser = null;
    this.isAdmin = false;
    this.isTeacher = false;
    API.clearSession();
    this.updateUI();
  },

  updateUI() {
    // Switch de Modo Admin
    const adminToggle = document.getElementById('admin-toggle');
    if (adminToggle) adminToggle.checked = this.isAdmin;

    // Botones y campos exclusivos de Administrador
    document.querySelectorAll('.admin-only-btn').forEach(btn => {
      btn.style.display = this.isAdmin ? 'inline-flex' : 'none';
    });
    document.querySelectorAll('.admin-only-field').forEach(field => {
      field.style.display = this.isAdmin ? 'block' : 'none';
    });

    // Indicador de sesión de usuario en cabecera
    const info = document.getElementById('teacher-session-info');
    const nameSpan = document.getElementById('teacher-session-name');

    if (this.currentUser) {
      if (info) info.style.display = 'flex';
      if (nameSpan) {
        nameSpan.textContent = this.isAdmin ? `🛡️ ${this.currentUser.name}` : `👤 ${this.currentUser.name}`;
      }
    } else {
      if (info) info.style.display = 'none';
      if (nameSpan) nameSpan.textContent = '';
    }

    if (typeof Calendar !== 'undefined' && Calendar.render) {
      Calendar.render();
    }
  },

  unlockAccessWall() {
    const wall = document.getElementById('access-wall');
    if (wall) {
      wall.style.opacity = '1';
      wall.style.transition = 'opacity 0.25s ease';
      wall.style.opacity = '0';
      setTimeout(() => {
        wall.classList.add('hidden');
        document.body.classList.remove('locked');
      }, 250);
    }
  },

  openChangePasswordModal(isMandatory = true) {
    const overlay = document.getElementById('change-password-overlay');
    const alertBox = document.getElementById('change-password-alert');
    const errorBox = document.getElementById('change-password-error');

    if (errorBox) errorBox.classList.remove('visible');
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';

    if (isMandatory) {
      overlay.dataset.mandatory = 'true';
      if (alertBox) {
        alertBox.textContent = 'Por políticas de seguridad, debe cambiar la contraseña inicial antes de continuar.';
        alertBox.style.display = 'flex';
      }
    } else {
      overlay.dataset.mandatory = 'false';
      if (alertBox) alertBox.style.display = 'none';
    }

    overlay.classList.add('open');
    document.getElementById('new-password').focus();
  },

  closeChangePasswordModal() {
    const overlay = document.getElementById('change-password-overlay');
    if (overlay.dataset.mandatory === 'true') {
      // Bloqueado hasta que se complete el cambio
      return;
    }
    overlay.classList.remove('open');
  },

  bindEvents() {
    // 0. Selector de Pestañas (Login vs Registro Docente)
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const accessForm = document.getElementById('access-form');
    const regForm = document.getElementById('access-register-form');
    const accessTitle = document.querySelector('.access-title');
    const accessSubtitle = document.querySelector('.access-subtitle');

    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => {
        tabLogin.style.background = 'rgba(212,175,55,0.25)';
        tabLogin.style.color = '#D4AF37';
        tabRegister.style.background = 'transparent';
        tabRegister.style.color = 'rgba(255,255,255,0.6)';

        if (accessForm) accessForm.style.display = 'block';
        if (regForm) regForm.style.display = 'none';

        if (accessTitle) accessTitle.textContent = 'Intranet Institucional';
        if (accessSubtitle) accessSubtitle.textContent = 'Ingrese con sus credenciales institucionales para gestionar y reservar la Sala de Computación.';
      });

      tabRegister.addEventListener('click', () => {
        tabRegister.style.background = 'rgba(212,175,55,0.25)';
        tabRegister.style.color = '#D4AF37';
        tabLogin.style.background = 'transparent';
        tabLogin.style.color = 'rgba(255,255,255,0.6)';

        if (accessForm) accessForm.style.display = 'none';
        if (regForm) regForm.style.display = 'block';

        if (accessTitle) accessTitle.textContent = 'Registro de Docente';
        if (accessSubtitle) accessSubtitle.textContent = 'Cree su cuenta con su correo oficial @colegiohll.cl para agendar bloques horarios.';
      });
    }

    // 1. Acceso Principal (Login)
    const accessErr = document.getElementById('access-error');
    const accessBtn = document.getElementById('access-submit');

    if (accessForm) {
      accessForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        accessErr.textContent = '';

        const email = document.getElementById('access-user').value.trim();
        const password = document.getElementById('access-pass').value;

        if (!email || !password) {
          accessErr.textContent = 'Ingrese su correo y contraseña.';
          return;
        }

        const origText = accessBtn.textContent;
        accessBtn.disabled = true;
        accessBtn.textContent = 'Verificando...';

        try {
          const res = await API.login(email, password);
          this.setUserSession(res.user, res.token);

          if (res.mustChangePassword) {
            this.unlockAccessWall();
            this.openChangePasswordModal(true);
          } else {
            this.unlockAccessWall();
            showToast(`Bienvenido/a, ${res.user.name}`);
          }
        } catch (err) {
          accessErr.textContent = err.message || 'Credenciales incorrectas.';
        } finally {
          accessBtn.disabled = false;
          accessBtn.textContent = origText;
        }
      });
    }

    // 1.1 Registro de Docentes (@colegiohll.cl)
    const regErr = document.getElementById('reg-error');
    const regBtn = document.getElementById('reg-submit');

    if (regForm) {
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (regErr) regErr.textContent = '';

        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const pass = document.getElementById('reg-pass').value;
        const confirm = document.getElementById('reg-confirm').value;

        if (!name || !email || !pass) {
          if (regErr) regErr.textContent = 'Por favor complete todos los campos.';
          return;
        }

        if (!email.toLowerCase().endsWith('@colegiohll.cl')) {
          if (regErr) regErr.textContent = 'El correo debe ser institucional (@colegiohll.cl).';
          return;
        }

        if (pass.length < 8) {
          if (regErr) regErr.textContent = 'La contraseña debe tener mínimo 8 caracteres.';
          return;
        }

        if (pass !== confirm) {
          if (regErr) regErr.textContent = 'Las contraseñas no coinciden.';
          return;
        }

        const origText = regBtn.textContent;
        regBtn.disabled = true;
        regBtn.textContent = 'Creando cuenta...';

        try {
          const res = await API.registerTeacher(name, email, pass);
          this.setUserSession(res.user, res.token);
          this.unlockAccessWall();
          showToast(`✓ Cuenta creada exitosamente. Bienvenido/a, ${res.user.name}`);
        } catch (err) {
          if (regErr) regErr.textContent = err.message || 'Error al registrar docente.';
        } finally {
          regBtn.disabled = false;
          regBtn.textContent = origText;
        }
      });
    }

    // 2. Cambio Obligatorio de Contraseña Formulario
    const changePassForm = document.getElementById('change-password-form');
    const changePassErr = document.getElementById('change-password-error');
    const changePassBtn = document.getElementById('change-password-submit');

    if (changePassForm) {
      changePassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        changePassErr.classList.remove('visible');

        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (!newPass || newPass.length < 8) {
          changePassErr.textContent = 'La contraseña debe tener mínimo 8 caracteres.';
          changePassErr.classList.add('visible');
          return;
        }

        if (newPass !== confirmPass) {
          changePassErr.textContent = 'Las contraseñas no coinciden.';
          changePassErr.classList.add('visible');
          return;
        }

        const origText = changePassBtn.textContent;
        changePassBtn.disabled = true;
        changePassBtn.textContent = 'Guardando...';

        try {
          const res = await API.changePassword(newPass, confirmPass);
          this.setUserSession(res.user, res.token);

          const overlay = document.getElementById('change-password-overlay');
          overlay.dataset.mandatory = 'false';
          overlay.classList.remove('open');

          showToast('🔒 Contraseña actualizada exitosamente');
        } catch (err) {
          changePassErr.textContent = err.message || 'Error al actualizar contraseña.';
          changePassErr.classList.add('visible');
        } finally {
          changePassBtn.disabled = false;
          changePassBtn.textContent = origText;
        }
      });
    }

    // 3. Switch de Modo Admin en Cabecera
    const adminToggle = document.getElementById('admin-toggle');
    if (adminToggle) {
      adminToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          e.target.checked = false;
          if (this.isAdmin) {
            e.target.checked = true;
          } else {
            this.openAdminLoginModal();
          }
        } else {
          this.clearSession();
          showToast('Sesión cerrada');
        }
      });
    }

    // 4. Modal de Login Admin
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLoginOverlay = document.getElementById('admin-login-overlay');
    const adminLoginErr = document.getElementById('admin-login-error');

    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        adminLoginErr.classList.remove('visible');

        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;
        const submitBtn = adminLoginForm.querySelector('button[type="submit"]');

        if (!email || !password) {
          adminLoginErr.textContent = 'Ingrese correo y contraseña.';
          adminLoginErr.classList.add('visible');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando...';

        try {
          const res = await API.login(email, password);

          if (res.user.role !== 'administrator') {
            throw new Error('Esta cuenta no posee privilegios de Administrador.');
          }

          this.setUserSession(res.user, res.token);
          adminLoginOverlay.classList.remove('open');

          if (res.mustChangePassword) {
            this.openChangePasswordModal(true);
          } else {
            showToast(`🛡️ Modo Administrador Activado — ${res.user.name}`);
          }
        } catch (err) {
          adminLoginErr.textContent = err.message;
          adminLoginErr.classList.add('visible');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ingresar como Admin';
        }
      });

      document.getElementById('admin-login-close')?.addEventListener('click', () => adminLoginOverlay.classList.remove('open'));
      document.getElementById('admin-login-cancel')?.addEventListener('click', () => adminLoginOverlay.classList.remove('open'));
    }

    // 5. Botón Salir en Cabecera
    document.getElementById('btn-teacher-logout')?.addEventListener('click', () => {
      this.clearSession();
      showToast('Sesión cerrada');
    });
  },

  openAdminLoginModal() {
    const overlay = document.getElementById('admin-login-overlay');
    document.getElementById('admin-email').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-login-error').classList.remove('visible');
    overlay.classList.add('open');
    document.getElementById('admin-email').focus();
  }
};
