import { PERAN } from '../constants/index.js';
import { MENU_NOMOR } from '../utils/nomor.js';
import { cariSuratKeluar } from '../repositories/suratKeluar.repository.js';
import { reservasiNomor, terbitkanNomor } from '../repositories/numbering.repository.js';
import {
  kedaluwarsakanReservasi,
  perbaruiMetadataNomor,
  voidNomor,
  gunakanUlangNomor
} from '../repositories/numberingLanjutan.repository.js';
import {
  cariNomorByFullNumber,
  cariRegisterNomor,
  pratinjauNomor,
  verifikasiUrutan
} from '../repositories/numberingQuery.repository.js';
import { tersediaNomor } from '../repositories/numbering.repository.js';
import { AppError, galatAkses, galatTidakDitemukan } from '../utils/AppError.js';
import { adalahAdmin, adalahPengelola } from '../utils/akses.js';
import { serialisasi } from '../utils/serialisasi.js';

const aktorDari = (profil) => ({ uid: profil.uid, nama: profil.nama, profile: profil });

const bidangPayload = (payload, profil) =>
  profil.role === PERAN.BIDANG ? profil.bidang : payload.bidangKode || profil.bidang;

export const pratinjau = (payload, profil) =>
  pratinjauNomor({
    menu: payload.menu || MENU_NOMOR.SURAT_KELUAR,
    jenisId: payload.jenisId,
    bidangKode: bidangPayload(payload, profil),
    tanggal: payload.tanggal
  });

export const daftarTersedia = (payload, profil) =>
  tersediaNomor({
    menu: payload.menu || MENU_NOMOR.SURAT_KELUAR,
    jenisId: payload.jenisId,
    bidangKode: bidangPayload(payload, profil),
    tanggal: payload.tanggal
  });

export const reservasi = (payload, profil) =>
  reservasiNomor({
    menu: payload.menu || MENU_NOMOR.SURAT_KELUAR,
    jenisId: payload.jenisId,
    bidangKode: bidangPayload(payload, profil),
    tanggal: payload.tanggal,
    aktor: aktorDari(profil),
    idempotencyKey: payload.idempotencyKey,
    reservationIdLama: payload.reservationIdLama,
    metadata: { perihal: payload.perihal || '', tujuan: payload.tujuan || '' }
  });

export const terbitkan = async (payload, profil) => {
  if (payload.reservationId && !adalahAdmin(profil)) {
    const register = await cariRegisterNomor(payload.reservationId);
    if (!register || register.created_by?.uid !== profil.uid) {
      throw galatAkses('Reservasi nomor bukan milik Anda.');
    }
  }
  return terbitkanNomor({ reservationId: payload.reservationId, payload, aktor: aktorDari(profil) });
};

export const batalkanNomor = ({ letterNumberId, alasan, profil, suratId }) =>
  voidNomor({
    letterNumberId,
    reason: alasan,
    aktor: aktorDari(profil),
    suratId
  });

export const kedaluwarsa = (profil) => {
  if (!adalahPengelola(profil)) throw galatAkses();
  return kedaluwarsakanReservasi(aktorDari(profil));
};

export const pakaiUlang = async ({ suratId, payload, profil }) => {
  if (!adalahAdmin(profil)) throw galatAkses('Penggunaan kembali nomor hanya untuk admin.');
  const surat = await cariSuratKeluar(suratId);
  if (!surat) throw galatTidakDitemukan('Surat tidak ditemukan.');
  if (!surat.letterNumberId) {
    throw new AppError(400, 'TANPA_REGISTER_NOMOR', 'Surat ini tidak memiliki register nomor.');
  }
  return gunakanUlangNomor({
    letterNumberId: surat.letterNumberId,
    payload,
    aktor: aktorDari(profil)
  });
};

export const koreksi = async ({ suratId, payload, reason, profil }) => {
  if (!adalahPengelola(profil)) throw galatAkses('Koreksi nomor hanya untuk admin atau pimpinan.');
  const lama = await cariSuratKeluar(suratId);
  if (!lama) throw galatTidakDitemukan('Surat lama tidak ditemukan.');
  if (lama.status === 'Dibatalkan') {
    throw new AppError(409, 'SURAT_DIBATALKAN', 'Surat lama sudah dibatalkan.');
  }
  if (!lama.letterNumberId) {
    throw new AppError(400, 'TANPA_REGISTER_NOMOR', 'Surat lama tidak memiliki register nomor.');
  }
  const reservasiBaru = await reservasiNomor({
    menu: MENU_NOMOR.SURAT_KELUAR,
    jenisId: payload.jenisId,
    bidangKode: payload.bidangPembuat || lama.bidangPembuat,
    tanggal: payload.tglSurat,
    aktor: aktorDari(profil),
    idempotencyKey: payload.idempotencyKey,
    metadata: { perihal: payload.hal, tujuan: payload.tujuan }
  });
  await voidNomor({
    letterNumberId: lama.letterNumberId,
    reason,
    aktor: aktorDari(profil),
    replacedById: reservasiBaru.id,
    suratId
  });
  return terbitkanNomor({ reservationId: reservasiBaru.id, payload, aktor: aktorDari(profil) });
};

export const perbaruiMetadata = ({ surat, changes, profil }) =>
  perbaruiMetadataNomor({
    letterNumberId: surat.letterNumberId,
    suratId: surat.id,
    changes,
    expectedVersion: Number(surat.letterRowVersion || 1),
    aktor: aktorDari(profil)
  });

export const verifikasi = (tahun, scope) => verifikasiUrutan(tahun, scope);

export const cariNomorLengkap = async (nomor) => {
  const hasil = await cariNomorByFullNumber(nomor);
  return hasil ? serialisasi(hasil) : null;
};
