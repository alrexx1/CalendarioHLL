/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Punto de Entrada Principal del Servidor (Modular)
 * ══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./src/db');
const { initSchema } = require('./src/db/schema');
const { seedInitialData } = require('./src/db/seed');

const authRoutes = require('./src/routes/authRoutes');
const reservationsRoutes = require('./src/routes/reservationsRoutes');
const healthRoutes = require('./src/routes/healthRoutes');
const errorHandler = require('./src/middleware/errorHandler');
const { initKeepAlive } = require('./src/services/keepAliveService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Service Worker con cabeceras anti-caché para actualizaciones instantáneas de PWA
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Servir archivos estáticos únicamente desde la carpeta /public
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Rutas de Vistas Principales (Consolidación)
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

app.get(['/', '/index.html', '/sala_computacion.html'], (req, res) => {
  const publicPath = path.join(__dirname, 'public', 'sala_computacion.html');
  res.sendFile(publicPath);
});

// Rutas de API Modular
app.use('/api/auth', authRoutes);
app.use('/api/reservas', reservationsRoutes);
app.use('/api/health', healthRoutes);

// Compatibilidad heredada para llamadas a scripts PHP
app.all(['/reservas_api.php', '/api.php'], (req, res, next) => {
  const action = req.query.action || req.body.action;
  if (action === 'login' || action === 'login_teacher') {
    req.url = '/login';
    return authRoutes(req, res, next);
  }
  if (action === 'get_reservas') {
    req.url = '/';
    return reservationsRoutes(req, res, next);
  }
  return res.json({ status: 'online', service: 'HLL Modular API' });
});

// Manejador centralizado de errores
app.use(errorHandler);

// Inicialización del sistema y conexión a Neon
async function bootstrap() {
  console.log('🚀 [Servidor HLL] Inicializando servicios...');

  try {
    const schemaOk = await initSchema();
    if (schemaOk) {
      await seedInitialData();
    } else {
      console.warn('⚠️ [Servidor HLL] Operando en modo local resiliente.');
    }
  } catch (dbErr) {
    console.warn('⚠️ [Servidor HLL] No fue posible inicializar Neon DB (operando en modo local):', dbErr.message);
  }

  app.listen(PORT, () => {
    console.log(`
══════════════════════════════════════════════════════════════════
🏫 COLEGIO SANTO DOMINGO HELEN LEE LASSEN
🚀 Servidor Modular Activo: http://localhost:${PORT}
💾 PostgreSQL en Neon:      ${db.isNeonConnected() ? '🟢 Conectada (sa-east-1)' : '🟡 Fallback Local'}
🔒 Seguridad:               Autenticación con Hashing & Cambio Obligatorio
══════════════════════════════════════════════════════════════════
    `);

    // Iniciar servicio KeepAlive anti-suspensión
    initKeepAlive(PORT);
  });
}

bootstrap();
