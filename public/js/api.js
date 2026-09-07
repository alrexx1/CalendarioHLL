/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Módulo de API — Cliente HTTP Centralizado
 * ══════════════════════════════════════════════════════════════════════════════
 */

const API = {
  TOKEN_KEY: 'hll_auth_token',
  USER_KEY: 'hll_auth_user',

  getToken() {
    return sessionStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    if (token) sessionStorage.setItem(this.TOKEN_KEY, token);
    else sessionStorage.removeItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      const raw = sessionStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(this.USER_KEY);
  },

  clearSession() {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Error del servidor (${response.status})`);
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  // Autenticación
  login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  changePassword(newPassword, confirmPassword) {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, confirmPassword })
    });
  },

  registerTeacher(name, email, password) {
    return this.request('/api/auth/register-teacher', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  forgotPassword(email) {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  resetPassword({ email, resetCode, newPassword, confirmPassword }) {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, resetCode, newPassword, confirmPassword })
    });
  },

  getProfile() {
    return this.request('/api/auth/me');
  },

  // Gestión de Usuarios (Exclusivo Administrador)
  getUsers() {
    return this.request('/api/auth/users');
  },

  updateUserRole(userId, role) {
    return this.request(`/api/auth/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  },

  adminResetPassword(userId, payload = {}) {
    return this.request(`/api/auth/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  deleteUser(userId) {
    return this.request(`/api/auth/users/${userId}`, {
      method: 'DELETE'
    });
  },

  // Reservas
  getReservas(month) {
    return this.request(`/api/reservas?month=${encodeURIComponent(month)}`);
  },

  saveReserva(payload) {
    return this.request('/api/reservas', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  deleteReserva(payload) {
    return this.request('/api/reservas', {
      method: 'DELETE',
      body: JSON.stringify(payload)
    });
  },

  // Monitoreo de salud
  checkHealth() {
    return this.request('/api/health');
  }
};
