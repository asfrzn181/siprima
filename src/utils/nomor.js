import { DEFAULT_GOLONGAN, GOLONGAN } from '../constants/index.js';
import { bagianJakarta } from './tanggal.js';

const BULAN_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const MENU_NOMOR = Object.freeze({
  SURAT_KELUAR: 'SURAT_KELUAR',
  SK: 'SK',
  SE: 'SE'
});

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

// Pola nomor mengikuti menu, bukan golongan jenis nomor. Nomor urut tidak
// memakai nol di depan (1, 20, 333) dan kode bidang menggantikan bulan.
export const defaultFormatMenu = (menu) => {
  if (menu === MENU_NOMOR.SK) return '{KODE}/{URUT}/BKPSDMD/{TAHUN}';
  if (menu === MENU_NOMOR.SE) return '{URUT} TAHUN {TAHUN}';
  return '{KODE}/{URUT}/BKPSDMD/{BIDANG}/{TAHUN}';
};

export const defaultFormatGolongan = (golongan) => {
  const nilai = normalizeGolongan(golongan);
  if (nilai === 'SK') return defaultFormatMenu(MENU_NOMOR.SK);
  if (nilai === 'SE') return defaultFormatMenu(MENU_NOMOR.SE);
  return defaultFormatMenu(MENU_NOMOR.SURAT_KELUAR);
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
    /\{(KODE|UNIT|TAHUN|BULAN|BULAN_ROMAWI|BIDANG|GOLONGAN)\}|\{URUT(?::(\d+))?\}/g,
    (_, nama, lebar) => {
      if (nama) return String(values[nama] ?? '');
      const urut = String(values.URUT ?? '');
      return lebar ? urut.padStart(Number(lebar), '0') : urut;
    }
  );

export const golonganValid = (nilai) => GOLONGAN.includes(normalizeGolongan(nilai));

// Aturan pemakaian ulang nomor batal:
// - Surat Keluar: pembatalan dan pemakaian ulang harus di hari yang sama
//   dengan tanggal nomor diterbitkan.
// - SK/SE: boleh kapan saja selama masih tahun yang sama.
export const bolehPakaiUlangNomor = ({
  menu,
  status,
  voidedAt,
  letterDate,
  tahunNomor,
  tahunAcuan,
  hariIni = new Date()
}) => {
  if (status !== 'VOID' || !voidedAt || !letterDate) return false;
  if (menu !== MENU_NOMOR.SURAT_KELUAR) {
    return Number(tahunNomor) === Number(tahunAcuan);
  }
  const batal = bagianJakarta(voidedAt);
  const terbit = bagianJakarta(letterDate);
  const hari = bagianJakarta(hariIni);
  return (
    batal.year === terbit.year &&
    batal.month === terbit.month &&
    batal.day === terbit.day &&
    hari.year === terbit.year &&
    hari.month === terbit.month &&
    hari.day === terbit.day
  );
};
