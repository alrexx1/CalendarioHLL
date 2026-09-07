/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Módulo de Conexión a Base de Datos (Neon PostgreSQL / Fallback)
 * ══════════════════════════════════════════════════════════════════════════════
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const LOCAL_JSON_PATH = path.join(__dirname, '../../reservas.json');

let pool = null;
let isConnected = false;

const DATABASE_URL = process.env.DATABASE_URL;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('⚠️ [Neon DB] Error inesperado en el pool:', err.message);
  });
}

async function query(text, params) {
  if (pool) {
    return pool.query(text, params);
  }
  throw new Error('Base de datos no conectada');
}

function getPool() {
  return pool;
}

function setIsConnected(val) {
  isConnected = val;
}

function isNeonConnected() {
  return isConnected;
}

function getLocalJson() {
  try {
    if (fs.existsSync(LOCAL_JSON_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Error leyendo reservas.json:', err.message);
  }
  return {};
}

function saveLocalJson(data) {
  try {
    fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error escribiendo reservas.json:', err.message);
  }
}

module.exports = {
  query,
  getPool,
  setIsConnected,
  isNeonConnected,
  getLocalJson,
  saveLocalJson
};
