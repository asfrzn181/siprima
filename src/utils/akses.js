import { PERAN, SIFAT, STATUS_MASUK, STATUS_KELUAR } from '../constants/index.js';

export const adalahAdmin = (profil) => profil?.role === PERAN.ADMIN;
export const adalahPengelola = (profil) => [PERAN.ADMIN, PERAN.PIMPINAN].includes(profil?.role);
export const adalahBidang = (profil) => profil?.role === PERAN.BIDANG;

export const bolehBacaSurat = (profil, surat) => {
  if (!profil || profil.aktif !== true) return false;
  if ((surat?.sifat || SIFAT.BIASA) === SIFAT.BIASA) return true;
  if (adalahPengelola(profil)) return true;
  if (!adalahBidang(profil)) return false;
  return Array.isArray(surat.aksesBidang) && surat.aksesBidang.includes(profil.bidang);
};

export const bolehUbahSuratMasuk = (profil) => adalahPengelola(profil);

export const bolehTindakLanjut = (profil, surat) =>
  adalahBidang(profil) && Array.isArray(surat?.aksesBidang) && surat.aksesBidang.includes(profil.bidang);

export const bolehBuatSuratKeluar = (profil) => [PERAN.ADMIN, PERAN.BIDANG].includes(profil?.role);

export const bolehUbahSuratKeluar = (profil, surat) => {
  if (adalahAdmin(profil)) return true;
  if (adalahBidang(profil)) {
    return surat?.bidangPembuat === profil.bidang && surat?.status === STATUS_KELUAR.AKTIF;
  }
  return false;
};

export const bolehKoreksiNomor = (profil) => adalahPengelola(profil);

export const statusMasukValid = (status) =>
  [STATUS_MASUK.BARU, STATUS_MASUK.DIDISPOSISIKAN, STATUS_MASUK.SELESAI].includes(status);
