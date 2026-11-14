import { DEFAULT_GOLONGAN, GOLONGAN } from '../constants/index.js';
import { tanggalDalamRentang, tanggalMurni, tahunTanggal } from './tanggal.js';

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
// - Surat Keluar: nomor N hanya boleh dipakai bila Tanggal Surat yang diinput
//   berada di antara tanggal nomor aktif sebelumnya dan sesudahnya (atau sama
//   dengan tanggal nomor itu sendiri). Void tidak dihitung sebagai tetangga.
//   Bila tidak ada batas atas (nomor terakhir), nomor tetap tersedia untuk
//   tanggal berikutnya. Tanggal sistem (created_at/hari ini) tidak dipakai.
// - SK/SE: boleh kapan saja selama masih tahun yang sama; tahun acuan diambil
//   dari Tanggal SK / Tanggal SE yang diinput.
export const bolehPakaiUlangNomor = ({
  menu,
  status,
  voidedAt,
  letterDate,
  tahunNomor,
  tahunAcuan,
  tanggalAcuan,
  batasBawah = null,
  batasAtas = null
}) => {
  if (status !== 'VOID' || !voidedAt || !letterDate) return false;
  const tanggalNomor = tanggalMurni(letterDate);
  if (!tanggalNomor) return false;
  const tahunDasar = tahunNomor ?? tahunTanggal(tanggalNomor);
  if (menu !== MENU_NOMOR.SURAT_KELUAR) {
    return Number(tahunDasar) === Number(tahunAcuan);
  }
  const acuan = tanggalMurni(tanggalAcuan);
  if (!acuan) return false;
  if (Number(tahunDasar) !== tahunTanggal(acuan)) return false;
  if (acuan === tanggalNomor) return true;
  return tanggalDalamRentang(acuan, batasBawah, batasAtas);
};
