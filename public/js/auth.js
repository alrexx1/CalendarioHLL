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
  recoveryEmail: '',

  init() {
    this.bindEvents();
    this.restoreSession();
    this.checkUrlAction();
  },

  async restoreSession() {
    const savedUser = API.getUser();
    const token = API.getToken();

    if (savedUser && token) {
      this.setUserSession(savedUser, token);
      this.unlockAccessWall();

      // Validar silenciosamente la sesión en segundo plano
      try {
        const res = await API.getProfile();
        if (!res || !res.success) {
          this.clearSession();
        }
      } catch (err) {
        // En caso de 401 o token expirado, API.request o este bloque limpian la sesión
        console.warn('⚠️ Sesión expirada o no válida al restaurar:', err.message);
      }
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
    this.lockAccessWall();
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

  lockAccessWall() {
    const wall = document.getElementById('access-wall');
    if (wall) {
      wall.classList.remove('hidden');
      wall.style.opacity = '1';
    }
    document.body.classList.add('locked');

    const passInput = document.getElementById('access-pass');
    if (passInput) passInput.value = '';
    const errorBox = document.getElementById('access-error');
    if (errorBox) errorBox.textContent = '';
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
          // Si el usuario autenticado tiene rol de Administrador
          if (this.currentUser && this.currentUser.role === 'administrator') {
            this.isAdmin = true;
            this.updateUI();
            showToast('🛡️ Modo Administrador activado');
          } else {
            // Usuario docente solicitando acceso como administrador
            e.target.checked = false;
            this.openAdminLoginModal();
          }
        } else {
          // Cambiar a vista de Profesor sin cerrar la sesión
          this.isAdmin = false;
          this.updateUI();
          showToast('👤 Modo Profesor activado');
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
      showToast('✓ Sesión cerrada exitosamente');
    });

    // 6. Recuperación de Contraseña (Paso 1 y Paso 2)
    const forgotOverlay = document.getElementById('forgot-password-overlay');
    const linkForgot = document.getElementById('link-forgot-password');
    const adminLinkForgot = document.getElementById('admin-link-forgot');
    const forgotClose = document.getElementById('forgot-password-close');
    const forgotCancel = document.getElementById('forgot-cancel-btn');
    const forgotBack = document.getElementById('forgot-back-btn');
    const requestForm = document.getElementById('forgot-request-form');
    const resetForm = document.getElementById('forgot-reset-form');
    const requestErr = document.getElementById('forgot-request-error');
    const resetErr = document.getElementById('forgot-reset-error');
    const sendBtn = document.getElementById('forgot-send-btn');
    const resetSubmitBtn = document.getElementById('forgot-submit-btn');

    let recoveryEmail = '';

    linkForgot?.addEventListener('click', () => {
      const email = document.getElementById('access-user')?.value.trim() || '';
      this.openForgotPasswordModal(email);
    });

    adminLinkForgot?.addEventListener('click', () => {
      adminLoginOverlay?.classList.remove('open');
      const email = document.getElementById('admin-email')?.value.trim() || '';
      this.openForgotPasswordModal(email);
    });

    forgotClose?.addEventListener('click', () => this.closeForgotPasswordModal());
    forgotCancel?.addEventListener('click', () => this.closeForgotPasswordModal());

    forgotBack?.addEventListener('click', () => {
      document.getElementById('forgot-step-1').style.display = 'block';
      document.getElementById('forgot-step-2').style.display = 'none';
      if (resetErr) resetErr.classList.remove('visible');
    });

    if (requestForm) {
      requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (requestErr) requestErr.classList.remove('visible');

        const email = document.getElementById('forgot-email').value.trim();
        if (!email) {
          requestErr.textContent = 'Por favor ingrese su correo institucional.';
          requestErr.classList.add('visible');
          return;
        }

        recoveryEmail = email;
        this.recoveryEmail = email;
        const origText = sendBtn.textContent;
        sendBtn.disabled = true;
        sendBtn.textContent = 'Enviando código...';

        try {
          const res = await API.forgotPassword(email);
          document.getElementById('forgot-step-1').style.display = 'none';
          document.getElementById('forgot-step-2').style.display = 'block';

          const sentMsg = document.getElementById('forgot-code-sent-msg');
          if (sentMsg) {
            sentMsg.textContent = res.message || `Código enviado a ${email}. Revise su bandeja de entrada.`;
          }

          document.getElementById('forgot-code').value = '';
          document.getElementById('forgot-new-pass').value = '';
          document.getElementById('forgot-confirm-pass').value = '';
          document.getElementById('forgot-code').focus();
        } catch (err) {
          requestErr.textContent = err.message || 'Error al procesar la solicitud.';
          requestErr.classList.add('visible');
        } finally {
          sendBtn.disabled = false;
          sendBtn.textContent = origText;
        }
      });
    }

    if (resetForm) {
      resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (resetErr) resetErr.classList.remove('visible');

        const code = document.getElementById('forgot-code').value.trim();
        const newPassword = document.getElementById('forgot-new-pass').value;
        const confirmPassword = document.getElementById('forgot-confirm-pass').value;

        if (!code || code.length < 6) {
          resetErr.textContent = 'Ingrese el código de verificación de 6 dígitos.';
          resetErr.classList.add('visible');
          return;
        }

        if (!newPassword || newPassword.length < 8) {
          resetErr.textContent = 'La nueva contraseña debe tener mínimo 8 caracteres.';
          resetErr.classList.add('visible');
          return;
        }

        if (newPassword !== confirmPassword) {
          resetErr.textContent = 'Las contraseñas no coinciden.';
          resetErr.classList.add('visible');
          return;
        }

        const origText = resetSubmitBtn.textContent;
        resetSubmitBtn.disabled = true;
        resetSubmitBtn.textContent = 'Restableciendo...';

        try {
          const targetEmail = this.recoveryEmail || recoveryEmail || document.getElementById('forgot-email')?.value.trim();
          const res = await API.resetPassword({
            email: targetEmail,
            resetCode: code,
            newPassword,
            confirmPassword
          });

          this.closeForgotPasswordModal();
          this.setUserSession(res.user, res.token);
          this.unlockAccessWall();

          showToast(`✓ Contraseña establecida. Bienvenido/a, ${res.user.name}`);
        } catch (err) {
          resetErr.textContent = err.message || 'Error al restablecer la contraseña.';
          resetErr.classList.add('visible');
        } finally {
          resetSubmitBtn.disabled = false;
          resetSubmitBtn.textContent = origText;
        }
      });
    }
  },

  openForgotPasswordModal(prefilledEmail = '') {
    const overlay = document.getElementById('forgot-password-overlay');
    if (!overlay) return;

    this.recoveryEmail = prefilledEmail;

    document.getElementById('forgot-step-1').style.display = 'block';
    document.getElementById('forgot-step-2').style.display = 'none';

    const emailInput = document.getElementById('forgot-email');
    if (emailInput) {
      emailInput.value = prefilledEmail;
    }

    document.getElementById('forgot-request-error')?.classList.remove('visible');
    document.getElementById('forgot-reset-error')?.classList.remove('visible');

    overlay.classList.add('open');
    if (emailInput) {
      if (prefilledEmail) emailInput.select();
      else emailInput.focus();
    }
  },

  closeForgotPasswordModal() {
    const overlay = document.getElementById('forgot-password-overlay');
    if (overlay) overlay.classList.remove('open');
  },

  checkUrlAction() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');
      const email = (urlParams.get('email') || '').trim();
      const code = (urlParams.get('code') || '').trim();

      if (action === 'reset' && (email || code)) {
        this.openForgotPasswordModal(email);
        const step1 = document.getElementById('forgot-step-1');
        const step2 = document.getElementById('forgot-step-2');
        if (step1 && step2) {
          step1.style.display = 'none';
          step2.style.display = 'block';
        }

        this.recoveryEmail = email;

        const codeInput = document.getElementById('forgot-code');
        if (codeInput && code) {
          codeInput.value = code;
        }

        const msgBox = document.getElementById('forgot-code-sent-msg');
        if (msgBox) {
          msgBox.textContent = `Activación de cuenta para ${email}. Ingrese su nueva contraseña a continuación:`;
        }

        const newPassInput = document.getElementById('forgot-new-pass');
        if (newPassInput) {
          setTimeout(() => newPassInput.focus(), 300);
        }

        // Limpiar URL sin refrescar la página
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.warn('Error al procesar parámetros de activación:', e);
    }
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
