import { AKSI_AUDIT, GOLONGAN } from '../constants/index.js';
import { catatAudit } from '../repositories/audit.repository.js';
import {
  cariAsalTujuanByKode,
  cariAsalTujuanByKodeAtauNama,
  cariAsalTujuanById,
  cariBidangById,
  cariBidangByKode,
  cariNomor,
  cariNomorByKodeAtauNama,
  daftarAsalTujuan,
  daftarBidang,
  daftarNomor,
  kodeAsalTujuanTerakhir,
  simpanAsalTujuan,
  simpanBidang,
  simpanNomor,
  simpanNomorBatch
} from '../repositories/master.repository.js';
import { AppError, galatTidakDitemukan } from '../utils/AppError.js';
import { potongHalaman } from '../utils/pagination.js';
import { serialisasi } from '../utils/serialisasi.js';

const kodeAsalTujuanBerikutnya = async () => {
  const terakhir = await kodeAsalTujuanTerakhir();
  const cocok = String(terakhir || '').match(/TUJUAN-(\d+)/);
  const urutan = cocok ? Number(cocok[1]) + 1 : 1;
  return `TUJUAN-${String(urutan).padStart(3, '0')}`;
};

export const daftarMasterBidang = async ({ hanyaAktif = true } = {}) =>
  (await daftarBidang({ hanyaAktif })).map((item) => serialisasi(item));

export const daftarMasterBidangHalaman = async (pagination) => {
  const semua = (await daftarBidang()).map((item) => serialisasi(item));
  return potongHalaman(semua, pagination);
};

export const simpanMasterBidang = async (id, data, aktor) => {
  const lama = id ? await cariBidangById(id) : null;
  if (id && !lama) throw galatTidakDitemukan('Bidang tidak ditemukan.');
  const bentrok = await cariBidangByKode(data.kode);
  if (bentrok && String(bentrok.id) !== String(id || '')) {
    throw new AppError(409, 'KODE_BIDANG_DIPAKAI', 'Kode bidang sudah dipakai.');
  }
  const hasil = await simpanBidang(id || null, data);
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_MASTER_BIDANG,
    koleksi: 'masterBidang',
    docId: hasil.id,
    sebelum: lama,
    sesudah: hasil
  });
  return serialisasi(hasil);
};

export const daftarMasterNomor = async (pagination) => {
  const semua = (await daftarNomor()).map((item) => serialisasi(item));
  return potongHalaman(semua, pagination);
};

export const daftarSemuaMasterNomor = async () => (await daftarNomor()).map((item) => serialisasi(item));

export const cariMasterNomor = async (id) => {
  const data = await cariNomor(Number(id));
  if (!data) throw galatTidakDitemukan('Jenis nomor tidak ditemukan.');
  return serialisasi(data);
};

export const cariMasterNomorKode = async (kataKunci, maksimal) =>
  (await cariNomorByKodeAtauNama(kataKunci, maksimal)).map((item) => serialisasi(item));

export const simpanMasterNomor = async (id, data, aktor) => {
  const lama = id ? await cariNomor(Number(id)) : null;
  if (id && !lama) throw galatTidakDitemukan('Jenis nomor tidak ditemukan.');
  if (!GOLONGAN.includes(data.golongan)) throw new AppError(400, 'VALIDASI_GAGAL', 'Golongan tidak valid.');
  const hasil = await simpanNomor(id ? Number(id) : null, data);
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_MASTER_NOMOR,
    koleksi: 'masterNomor',
    docId: hasil.id,
    sebelum: lama,
    sesudah: hasil
  });
  return serialisasi(hasil);
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

export const daftarMasterAsalTujuan = async ({ hanyaAktif = true } = {}) =>
  (await daftarAsalTujuan({ hanyaAktif })).map((item) => serialisasi(item));

export const daftarMasterAsalTujuanHalaman = async (pagination) => {
  const semua = (await daftarAsalTujuan()).map((item) => serialisasi(item));
  return potongHalaman(semua, pagination);
};

export const cariMasterAsalTujuanKode = async (kataKunci, maksimal) =>
  (await cariAsalTujuanByKodeAtauNama(kataKunci, maksimal)).map((item) => serialisasi(item));

export const simpanMasterAsalTujuan = async (id, data, aktor) => {
  const lama = id ? await cariAsalTujuanById(Number(id)) : null;
  if (id && !lama) throw galatTidakDitemukan('Data asal & tujuan tidak ditemukan.');

  const kode = String(data.kode || '').trim() || (id ? lama.kode : await kodeAsalTujuanBerikutnya());
  const bentrok = await cariAsalTujuanByKode(kode);
  if (bentrok && String(bentrok.id) !== String(id || '')) {
    throw new AppError(409, 'KODE_ASAL_TUJUAN_DIPAKAI', 'Kode asal & tujuan sudah dipakai.');
  }

  const hasil = await simpanAsalTujuan(id ? Number(id) : null, { ...data, kode });
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_MASTER_ASAL_TUJUAN,
    koleksi: 'masterAsalTujuan',
    docId: hasil.id,
    sebelum: lama,
    sesudah: hasil
  });
  return serialisasi(hasil);
};

export const imporMasterAsalTujuan = async (rows, aktor) => {
  let jumlah = 0;
  let gagal = 0;

  for (const row of rows) {
    const kode = String(row.kode || '').trim();
    const nama = String(row.nama || '').trim();
    if (!nama) {
      gagal += 1;
      continue;
    }
    try {
      const ada = kode ? await cariAsalTujuanByKode(kode) : null;
      await simpanMasterAsalTujuan(
        ada ? ada.id : null,
        { kode, nama, aktif: row.aktif !== false },
        aktor
      );
      jumlah += 1;
    } catch {
      gagal += 1;
    }
  }

  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_MASTER_ASAL_TUJUAN,
    koleksi: 'masterAsalTujuan',
    docId: 'impor-csv',
    sesudah: { jumlah, gagal }
  });

  return { jumlah, gagal };
};
