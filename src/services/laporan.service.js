import { PAGINATION, PERAN } from '../constants/index.js';
import { daftarSuratKhusus } from '../repositories/suratKhusus.repository.js';
import { serialisasi } from '../utils/serialisasi.js';
import { daftarKeluar } from './suratKeluar.service.js';
import { daftarMasuk } from './suratMasuk.service.js';
import { galatAkses } from '../utils/AppError.js';

const filterDasar = {
  search: '',
  page: 1,
  limit: PAGINATION.MAX_EXPORT,
  tglMulai: null,
  tglSelesai: null,
  bidang: ''
};

const filterMasuk = (filter) => ({
  ...filterDasar,
  sifat: filter.sifat || 'semua',
  status: filter.status && filter.status !== 'semua' ? filter.status : 'semua',
  bidang: filter.bidang || ''
});

const filterKeluar = (filter) => ({
  ...filterDasar,
  sifat: filter.sifat || 'semua',
  status: filter.status && filter.status !== 'semua' ? filter.status : 'semua',
  bidang: filter.bidang || ''
});

export const laporanSuratMasuk = async (filter, profil) => {
  if (profil.role === PERAN.BIDANG) throw galatAkses('Laporan hanya untuk admin atau pimpinan.');
  const hasil = await daftarMasuk(profil, filterMasuk(filter));
  return { items: hasil.items, total: hasil.items.length };
};

export const laporanSuratKeluar = async (filter, profil) => {
  if (profil.role === PERAN.BIDANG) throw galatAkses('Laporan hanya untuk admin atau pimpinan.');
  const hasil = await daftarKeluar(profil, filterKeluar(filter));
  return { items: hasil.items, total: hasil.items.length };
};

// SK dan SE memakai tabel surat_khusus dengan filter tanggal/status/bidang.
const laporanSuratKhusus = async (jenis, filter, profil) => {
  if (profil.role === PERAN.BIDANG) throw galatAkses('Laporan hanya untuk admin atau pimpinan.');
  const items = await daftarSuratKhusus(jenis, {
    status: filter.status && filter.status !== 'semua' ? filter.status : '',
    bidang: filter.bidang && filter.bidang !== 'semua' ? filter.bidang : '',
    tglMulai: filter.tglMulai,
    tglSelesai: filter.tglSelesai,
    limit: PAGINATION.MAX_EXPORT,
    offset: 0
  });
  return { items: items.map(serialisasi), total: items.length };
};

export const laporanSuratSk = (filter, profil) => laporanSuratKhusus('SK', filter, profil);

export const laporanSuratSe = (filter, profil) => laporanSuratKhusus('SE', filter, profil);
