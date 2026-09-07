/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Orquestador Principal de la Aplicación Frontend
 * ══════════════════════════════════════════════════════════════════════════════
 */

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 28px; right: 28px; z-index: 99999;
    background: linear-gradient(135deg, #0B2545, #133A68);
    border: 1px solid #D4AF37;
    color: white; padding: 11px 22px; border-radius: 10px;
    font-size: .88rem; font-weight: 700; font-family: var(--font);
    box-shadow: 0 8px 24px rgba(11,37,69,0.4);
    animation: slideInRight .14s cubic-bezier(0, 0, 0.2, 1) forwards;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight .14s ease forwards';
    setTimeout(() => toast.remove(), 140);
  }, 2500);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const changePassOverlay = document.getElementById('change-password-overlay');
    if (changePassOverlay && changePassOverlay.classList.contains('open') && changePassOverlay.dataset.mandatory === 'true') {
      // No permitir cerrar el modal obligatorio con Escape
      return;
    }

    document.querySelectorAll('.modal-overlay.open').forEach(overlay => {
      if (overlay.id !== 'change-password-overlay' || overlay.dataset.mandatory !== 'true') {
        overlay.classList.remove('open');
      }
    });
  }
});

// Cerrar modales al hacer clic en el backdrop (excepto el obligatorio)
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('open')) {
    if (e.target.id === 'change-password-overlay' && e.target.dataset.mandatory === 'true') {
      return;
    }
    e.target.classList.remove('open');
  }
});

// Inicialización de módulos al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('🏫 Inicializando Sistema de Reservas HLL...');
  Auth.init();
  Calendar.init();
  Reservations.init();
  ExcelExport.init();

  // Registro de Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('📱 [PWA] Service Worker activo:', reg.scope))
      .catch((err) => console.warn('⚠️ [PWA] Service Worker no disponible:', err.message));
  }
});

// Manejador de Instalación de la Aplicación (PWA)
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installBtn = document.getElementById('btn-install-pwa');
  if (installBtn) {
    installBtn.style.display = 'inline-flex';
    installBtn.addEventListener('click', async () => {
      installBtn.style.display = 'none';
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('📲 ¡Aplicación instalada en tu dispositivo!');
        }
        deferredPrompt = null;
      }
    });
  }
});

window.addEventListener('appinstalled', () => {
  console.log('📱 [PWA] Aplicación instalada correctamente.');
  const installBtn = document.getElementById('btn-install-pwa');
  if (installBtn) installBtn.style.display = 'none';
});
