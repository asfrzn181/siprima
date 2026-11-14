import { PERAN, SIFAT, STATUS_MASUK, STATUS_KELUAR } from '../constants/index.js';

export const adalahAdmin = (profil) => profil?.role === PERAN.ADMIN;
export const adalahOperator = (profil) => profil?.role === PERAN.OPERATOR;
export const adalahPengelola = (profil) => [PERAN.ADMIN, PERAN.PIMPINAN].includes(profil?.role);
export const adalahBidang = (profil) => profil?.role === PERAN.BIDANG;

export const AKSES_DATA = Object.freeze({ SEMUA: 'SEMUA', SENDIRI: 'SENDIRI' });

// Cakupan data yang boleh dilihat pengguna. Peran non-bidang (admin, operator,
// pimpinan) selalu melihat seluruh bidang. Pengguna bidang mengikuti pengaturan
// akses_data pada master bidang tempat ia terdaftar, dengan default aman SENDIRI.
export const lingkupData = (profil) => {
  if (!profil) return { semua: false, bidang: '' };
  if (profil.role !== PERAN.BIDANG) return { semua: true, bidang: profil.bidang || '' };
  const semua = profil.aksesData === AKSES_DATA.SEMUA;
  return { semua, bidang: profil.bidang || '' };
};

export const bolehAksesBidang = (profil, kodeBidang) => {
  const lingkup = lingkupData(profil);
  if (lingkup.semua) return true;
  return Boolean(lingkup.bidang) && String(kodeBidang || '') === lingkup.bidang;
};

export const bolehAksesDaftarBidang = (profil, daftarBidang) => {
  const lingkup = lingkupData(profil);
  if (lingkup.semua) return true;
  return Array.isArray(daftarBidang) && daftarBidang.includes(lingkup.bidang);
};

export const bolehBacaSurat = (profil, surat) => {
  if (!profil || profil.aktif !== true) return false;
  if ((surat?.sifat || SIFAT.BIASA) === SIFAT.BIASA) return true;
  if (adalahPengelola(profil) || adalahOperator(profil)) return true;
  if (!adalahBidang(profil)) return false;
  return Array.isArray(surat.aksesBidang) && surat.aksesBidang.includes(profil.bidang);
};

export const bolehBuatSuratMasuk = (profil) => [PERAN.ADMIN, PERAN.OPERATOR].includes(profil?.role);

export const bolehUbahSuratMasuk = (profil) =>
  [PERAN.ADMIN, PERAN.OPERATOR, PERAN.PIMPINAN].includes(profil?.role);

export const bolehTindakLanjut = (profil, surat) =>
  adalahBidang(profil) && Array.isArray(surat?.aksesBidang) && surat.aksesBidang.includes(profil.bidang);

export const bolehBuatSuratKeluar = (profil) =>
  [PERAN.ADMIN, PERAN.OPERATOR, PERAN.BIDANG].includes(profil?.role);

export const bolehUbahSuratKeluar = (profil, surat) => {
  if (adalahAdmin(profil) || adalahOperator(profil)) return true;
  if (adalahBidang(profil)) {
    return surat?.bidangPembuat === profil.bidang && surat?.status === STATUS_KELUAR.AKTIF;
  }
  return false;
};

export const bolehKoreksiNomor = (profil) => adalahPengelola(profil);

export const statusMasukValid = (status) =>
  [STATUS_MASUK.BARU, STATUS_MASUK.DIDISPOSISIKAN, STATUS_MASUK.SELESAI].includes(status);
