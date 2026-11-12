const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const GOLONGAN = ['SK', 'SE', 'LAINNYA'];
export const DEFAULT_GOLONGAN = 'LAINNYA';

export const GOLONGAN_LABEL = {
  SK: 'Surat Keputusan',
  SE: 'Surat Edaran',
  LAINNYA: 'Surat lainnya'
};

export const GOLONGAN_KETERANGAN = {
  SK: 'Nomor memuat kode klasifikasi tetap. Urutan SK terpisah.',
  SE: 'Nomor tanpa kode klasifikasi. Urutan SE terpisah.',
  LAINNYA: 'Nomor memuat kode klasifikasi pilihan. Urutan terpisah.'
};

export const monthRoman = (month) => ROMAN_MONTHS[Number(month) - 1] || '';
export const formatSequence = (seq, minimumWidth = 3) => String(Math.max(0, Number(seq) || 0)).padStart(minimumWidth, '0');

export const normalizeGolongan = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (['SK', 'SURAT KEPUTUSAN', 'KEPUTUSAN'].includes(normalized)) return 'SK';
  if (['SE', 'SURAT EDARAN', 'EDARAN'].includes(normalized)) return 'SE';
  return DEFAULT_GOLONGAN;
};

export const golonganUsesKode = (golongan) => normalizeGolongan(golongan) !== 'SE';

export const defaultFormatGolongan = (golongan) => {
  if (normalizeGolongan(golongan) === 'SK') return '{KODE}/SK/{URUT:3}/{UNIT}/{TAHUN}';
  if (normalizeGolongan(golongan) === 'SE') return 'SE/{URUT:3}/{UNIT}/{TAHUN}';
  return '{KODE}/{URUT:3}/{UNIT}/{TAHUN}';
};

/** Buang token {KODE} tanpa menyisakan pemisah ganda di awal nomor. */
export const stripKodeToken = (format) => String(format || '')
  .replace(/\{KODE\}/g, '')
  .replace(/\/{2,}/g, '/')
  .replace(/^[\/\-\s]+/, '')
  .replace(/[\/\-\s]+$/, '')
  .trim();

export const normalizeFormatGolongan = (format, golongan) => {
  let value = String(format || '').trim();
  if (value === '{KODE}/{URUT:3}/{UNIT}/BKPSDMD/{TAHUN}') value = '{KODE}/{URUT:3}/BKPSDMD/{UNIT}/{TAHUN}';
  if (!value) return defaultFormatGolongan(golongan);
  return golonganUsesKode(golongan) ? value : stripKodeToken(value);
};

/** SK, SE, dan surat lainnya memakai counter sendiri agar urutannya tidak bercampur. SE tidak memakai kode. */
export const scopeKeyFor = ({ golongan, kode, scope }) => {
  const golonganKey = normalizeGolongan(golongan);
  return scope === 'PER_KLASIFIKASI' && kode && golonganUsesKode(golonganKey) ? `${golonganKey}_${kode}` : golonganKey;
};

export const renderNomor = (format, values) => normalizeFormatGolongan(format, values.GOLONGAN).replace(
  /\{(KODE|UNIT|TAHUN|BULAN|BULAN_ROMAWI|BIDANG|GOLONGAN)\}|\{URUT:(\d+)\}/g,
  (_, name, width) => (name ? String(values[name] ?? '') : `${String(values.URUT ?? '').padStart(Number(width), '0')}${values.URUT_SUFFIX || ''}`)
);
