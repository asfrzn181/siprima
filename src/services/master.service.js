import { AKSI_AUDIT, GOLONGAN } from '../constants/index.js';
import { catatAudit } from '../repositories/audit.repository.js';
import {
  cariBidangByKode,
  cariNomor,
  cariNomorByKodeAtauNama,
  daftarBidang,
  daftarNomor,
  simpanBidang,
  simpanNomor,
  simpanNomorBatch
} from '../repositories/master.repository.js';
import { AppError, galatTidakDitemukan } from '../utils/AppError.js';
import { potongHalaman } from '../utils/pagination.js';
import { serialisasi } from '../utils/serialisasi.js';

export const daftarMasterBidang = async ({ hanyaAktif = true } = {}) =>
  (await daftarBidang({ hanyaAktif })).map((item) => serialisasi(item));

export const daftarMasterBidangHalaman = async (pagination) => {
  const semua = (await daftarBidang()).map((item) => serialisasi(item));
  return potongHalaman(semua, pagination);
};

export const simpanMasterBidang = async (id, data, aktor) => {
  const lama = id ? await cariBidangByKode(data.kode) : null;
  const docId = String(id || data.kode).trim();
  if (!docId) throw new AppError(400, 'VALIDASI_GAGAL', 'Kode bidang wajib diisi.');
  await simpanBidang(docId, data);
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_MASTER_BIDANG,
    koleksi: 'masterBidang',
    docId,
    sebelum: lama,
    sesudah: { id: docId, ...data }
  });
  return { id: docId, ...data };
};

export const daftarMasterNomor = async (pagination) => {
  const semua = (await daftarNomor()).map((item) => serialisasi(item));
  return potongHalaman(semua, pagination);
};

export const daftarSemuaMasterNomor = async () => (await daftarNomor()).map((item) => serialisasi(item));

export const cariMasterNomor = async (id) => {
  const data = await cariNomor(id);
  if (!data) throw galatTidakDitemukan('Jenis nomor tidak ditemukan.');
  return serialisasi(data);
};

export const cariMasterNomorKode = async (kataKunci, maksimal) =>
  (await cariNomorByKodeAtauNama(kataKunci, maksimal)).map((item) => serialisasi(item));

export const simpanMasterNomor = async (id, data, aktor) => {
  const lama = id ? await cariNomor(id) : null;
  const golongan = data.golongan;
  if (!GOLONGAN.includes(golongan)) throw new AppError(400, 'VALIDASI_GAGAL', 'Golongan tidak valid.');
  const docId = String(id || `${golongan.toLowerCase()}-${Date.now()}`).trim();
  await simpanNomor(docId, data);
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_MASTER_NOMOR,
    koleksi: 'masterNomor',
    docId,
    sebelum: lama,
    sesudah: { id: docId, ...data }
  });
  return { id: docId, ...data };
};

export const imporMasterNomor = async (rows, aktor) => {
  const jumlah = await simpanNomorBatch(rows);
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_MASTER_NOMOR,
    koleksi: 'masterNomor',
    docId: 'impor-csv',
    sesudah: { jumlah }
  });
  return { jumlah };
};
