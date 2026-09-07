/**
 * ══════════════════════════════════════════════════════════════════════════════
 * COLEGIO SANTO DOMINGO HELEN LEE LASSEN (HLL)
 * Configuración de Constantes del Sistema
 * ══════════════════════════════════════════════════════════════════════════════
 */

const TIME_SLOTS = [
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
];

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

const DAY_NAMES = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes'
};

const DEFAULT_ADMIN = {
  email: process.env.INITIAL_ADMIN_EMAIL || 'admin@colegiohll.cl',
  initialPassword: process.env.INITIAL_ADMIN_PASSWORD || 'ColegioHLL2026!',
  name: 'Administrador HLL',
  role: 'administrator'
};

const AUGUST_2026_DEFAULT = [
  { // Semana 1
    mon: {
      '09:30 - 10:15': { docente: 'Yelena R.',  curso: 'EDUTEN 6B' },
      '10:30 - 11:15': { docente: 'M. Bozzo',   curso: '4B DIA MATEMATICA' },
      '11:15 - 12:00': { docente: 'M. Bozzo',   curso: '4B DIA MATEMATICA' },
      '12:15 - 13:00': { docente: 'N. Navarro', curso: '2M DIA LENGUAJE' },
      '13:00 - 13:45': { docente: 'N. Navarro', curso: '2M DIA LENGUAJE' },
    },
    tue: {
      '08:00 - 08:45': { docente: 'N. Navarro', curso: '1M DIA LENGUAJE' },
      '08:45 - 09:30': { docente: 'N. Navarro', curso: '1M DIA LENGUAJE' },
      '12:15 - 13:00': { docente: 'Melissa Bozzo', curso: 'EDUTEN 4B' },
      '15:15 - 16:00': { docente: 'Melissa Bozzo', curso: 'EDUTEN 6B' },
    },
    wed: {
      '08:00 - 08:45': { docente: 'D. Jerez',   curso: '2M DIA MATEMATICA' },
      '08:45 - 09:30': { docente: 'D. Jerez',   curso: '2M DIA MATEMATICA' },
      '09:30 - 10:15': { docente: 'P. Pérez',   curso: '2B EDUTEN' },
      '10:30 - 11:15': { docente: 'M. Bozzo',   curso: '3B DIA MATEMATICA' },
      '11:15 - 12:00': { docente: 'M. Bozzo',   curso: '3B DIA MATEMATICA' },
      '12:15 - 13:00': { docente: 'P. Jerez',   curso: '4B DIA LENGUAJE' },
      '13:00 - 13:45': { docente: 'P. Jerez',   curso: '4B DIA LENGUAJE' },
      '14:30 - 15:15': { docente: 'C. Hernández', curso: '3B BEEVERSO' },
    },
    thu: {
      '08:45 - 09:30': { docente: '—',           curso: 'EDUTEN 5B' },
      '10:30 - 11:15': { docente: 'C. Hernández', curso: '3B DIA LENGUAJE' },
      '11:15 - 12:00': { docente: 'C. Hernández', curso: '3B DIA LENGUAJE' },
      '14:30 - 15:15': { docente: 'C. Hernández', curso: '5B BEEVERSO' },
    },
    fri: {
      '10:30 - 11:15': { docente: 'C. Hernández', curso: '4B BEEVERSO' },
      '11:15 - 12:00': { docente: 'C. Hernández', curso: '4B BEEVERSO' },
      '12:15 - 13:00': { docente: 'P. Arriagada', curso: '6B BEEVERSO' },
    },
  },
  { // Semana 2
    mon: {
      '09:30 - 10:15': { docente: 'Yelena R.',  curso: 'EDUTEN 6B' },
      '10:30 - 11:15': { docente: 'P. Jerez',   curso: '2B DIA LENGUAJE' },
      '11:15 - 12:00': { docente: 'P. Jerez',   curso: '2B DIA LENGUAJE' },
    },
    tue: {
      '10:30 - 11:15': { docente: 'M. Bozzo',   curso: '3B DIA MATEMATICA' },
      '11:15 - 12:00': { docente: 'M. Bozzo',   curso: '3B DIA MATEMATICA' },
      '12:15 - 13:00': { docente: 'Melissa Bozzo', curso: 'EDUTEN 4B' },
      '15:15 - 16:00': { docente: 'Melissa Bozzo', curso: 'EDUTEN 6B' },
    },
    wed: {
      '08:00 - 08:45': { docente: 'Melissa Bozzo', curso: 'EDUTEN 5B' },
      '09:30 - 10:15': { docente: 'P. Pérez',   curso: '2B EDUTEN' },
      '10:30 - 11:15': { docente: 'D. Jerez',   curso: '1M DIA MATEMATICA' },
      '11:15 - 12:00': { docente: 'D. Jerez',   curso: '1M DIA MATEMATICA' },
      '12:15 - 13:00': { docente: 'A. Vásquez', curso: '2M SENDA' },
      '13:00 - 13:45': { docente: 'A. Vásquez', curso: '2M SENDA' },
      '14:30 - 15:15': { docente: 'C. Hernández', curso: '3B BEEVERSO' },
    },
    thu: {
      '08:45 - 09:30': { docente: '—',           curso: 'EDUTEN 5B' },
      '14:30 - 15:15': { docente: 'C. Hernández', curso: '5B BEEVERSO' },
    },
    fri: {
      '10:30 - 11:15': { docente: 'C. Hernández', curso: '4B BEEVERSO' },
      '11:15 - 12:00': { docente: 'C. Hernández', curso: '4B BEEVERSO' },
      '12:15 - 13:00': { docente: 'P. Arriagada', curso: '6B BEEVERSO' },
    },
  },
  { // Semana 3
    mon: {
      '09:30 - 10:15': { docente: 'Yelena R.',  curso: 'EDUTEN 6B' },
      '11:15 - 12:00': { docente: 'Francisco',  curso: 'EDUTEN 7B' },
    },
    tue: {
      '12:15 - 13:00': { docente: 'Melissa Bozzo', curso: 'EDUTEN 4B' },
      '15:15 - 16:00': { docente: 'Melissa Bozzo', curso: 'EDUTEN 6B' },
    },
    wed: {
      '08:00 - 08:45': { docente: 'Melissa Bozzo', curso: 'EDUTEN 5B' },
      '09:30 - 10:15': { docente: 'P. Pérez',   curso: '2B EDUTEN' },
      '11:15 - 12:00': { docente: 'Melissa Bozzo', curso: 'EDUTEN 3B' },
      '14:30 - 15:15': { docente: 'C. Hernández', curso: '3B BEEVERSO' },
    },
    thu: {
      '08:45 - 09:30': { docente: '—',           curso: 'EDUTEN 5B' },
      '14:30 - 15:15': { docente: 'C. Hernández', curso: '5B BEEVERSO' },
    },
    fri: {
      '10:30 - 11:15': { docente: 'C. Hernández', curso: '4B BEEVERSO' },
      '11:15 - 12:00': { docente: 'C. Hernández', curso: '4B BEEVERSO' },
      '12:15 - 13:00': { docente: 'P. Arriagada', curso: '6B BEEVERSO' },
    },
  },
  { // Semana 4
    mon: {
      '09:30 - 10:15': { docente: 'Yelena R.',  curso: 'EDUTEN 6B' },
      '11:15 - 12:00': { docente: 'Francisco',  curso: 'EDUTEN 7B' },
    },
    tue: {
      '12:15 - 13:00': { docente: 'Melissa Bozzo', curso: 'EDUTEN 4B' },
      '15:15 - 16:00': { docente: 'Melissa Bozzo', curso: 'EDUTEN 6B' },
    },
    wed: {
      '08:00 - 08:45': { docente: 'Melissa Bozzo', curso: 'EDUTEN 5B' },
      '09:30 - 10:15': { docente: 'P. Pérez',   curso: '2B EDUTEN' },
      '11:15 - 12:00': { docente: 'Melissa Bozzo', curso: 'EDUTEN 3B' },
      '14:30 - 15:15': { docente: 'C. Hernández', curso: '3B BEEVERSO' },
    },
    thu: {
      '08:45 - 09:30': { docente: '—',           curso: 'EDUTEN 5B' },
      '14:30 - 15:15': { docente: 'C. Hernández', curso: '5B BEEVERSO' },
    },
    fri: {
      '10:30 - 11:15': { docente: 'C. Hernández', curso: '4B BEEVERSO' },
      '11:15 - 12:00': { docente: 'C. Hernández', curso: '4B BEEVERSO' },
      '12:15 - 13:00': { docente: 'P. Arriagada', curso: '6B BEEVERSO' },
    },
  },
];

module.exports = {
  TIME_SLOTS,
  DAYS,
  DAY_NAMES,
  DEFAULT_ADMIN,
  AUGUST_2026_DEFAULT
};
