import { DEFAULT_GOLONGAN, GOLONGAN } from '../constants/index.js';

const BULAN_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const monthRoman = (bulan) => BULAN_ROMAWI[Number(bulan) - 1] || '';

export const formatSequence = (seq, lebar = 3) => String(Math.max(0, Number(seq) || 0)).padStart(lebar, '0');

export const normalizeGolongan = (nilai) => {
  const teks = String(nilai || '')
    .trim()
    .toUpperCase();
  if (['SK', 'SURAT KEPUTUSAN', 'KEPUTUSAN'].includes(teks)) return 'SK';
  if (['SE', 'SURAT EDARAN', 'EDARAN'].includes(teks)) return 'SE';
  return DEFAULT_GOLONGAN;
};

export const golonganUsesKode = (golongan) => normalizeGolongan(golongan) !== 'SE';

export const defaultFormatGolongan = (golongan) => {
  if (normalizeGolongan(golongan) === 'SK') return '{KODE}/{URUT:3}/BKPSDMD/{BULAN_ROMAWI}/{TAHUN}';
  if (normalizeGolongan(golongan) === 'SE') return '{URUT:3} Tahun {TAHUN}';
  return '{KODE}/{URUT:3}/BKPSDMD/{BULAN_ROMAWI}/{TAHUN}';
};

export const stripKodeToken = (format) =>
  String(format || '')
    .replace(/\{KODE\}/g, '')
    .replace(/\/{2,}/g, '/')
    .replace(/^[/\-\s]+/, '')
    .replace(/[/\-\s]+$/, '')
    .trim();

export const normalizeFormatGolongan = (format, golongan) => {
  let nilai = String(format || '').trim();
  if (nilai === '{KODE}/{URUT:3}/{UNIT}/BKPSDMD/{TAHUN}') {
    nilai = '{KODE}/{URUT:3}/BKPSDMD/{UNIT}/{TAHUN}';
  }
  if (!nilai) return defaultFormatGolongan(golongan);
  return golonganUsesKode(golongan) ? nilai : stripKodeToken(nilai);
};

export const scopeKeyFor = ({ golongan, kode, scope }) => {
  const kunciGolongan = normalizeGolongan(golongan);
  return scope === 'PER_KLASIFIKASI' && kode && golonganUsesKode(kunciGolongan)
    ? `${kunciGolongan}_${kode}`
    : kunciGolongan;
};

export const renderNomor = (format, values) =>
  normalizeFormatGolongan(format, values.GOLONGAN).replace(
    /\{(KODE|UNIT|TAHUN|BULAN|BULAN_ROMAWI|BIDANG|GOLONGAN)\}|\{URUT:(\d+)\}/g,
    (_, nama, lebar) =>
      nama
        ? String(values[nama] ?? '')
        : `${String(values.URUT ?? '').padStart(Number(lebar), '0')}${values.URUT_SUFFIX || ''}`
  );

export const golonganValid = (nilai) => GOLONGAN.includes(normalizeGolongan(nilai));
