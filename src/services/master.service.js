import { AKSI_AUDIT, GOLONGAN } from '../constants/index.js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
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
  simpanAsalTujuan,
  simpanBidang,
  simpanNomor,
  simpanNomorBatch,
  imporAsalTujuan // Add this import
} from '../repositories/master.repository.js';
import { AppError, galatTidakDitemukan } from '../utils/AppError.js';
import { potongHalaman } from '../utils/pagination.js';
import { serialisasi } from '../utils/serialisasi.js';

export const daftarMasterBidang = async ({ hanyaAktif = true } = {})
  => (await daftarBidang({ hanyaAktif })).map((item) => serialisasi(item));

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

export const cariMasterNomorKode = async (kataKunci, maksimal)
  => (await cariNomorByKodeAtauNama(kataKunci, maksimal)).map((item) => serialisasi(item));

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

export const cariMasterAsalTujuanKode = async (kataKunci, maksimal)
  => (await cariAsalTujuanByKodeAtauNama(kataKunci, maksimal)).map((item) => serialisasi(item));

export const simpanMasterAsalTujuan = async (id, data, aktor) => {
  const lama = id ? await cariAsalTujuanById(Number(id)) : null;
  if (id && !lama) throw galatTidakDitemukan('Data asal & tujuan tidak ditemukan.');
  const bentrok = await cariAsalTujuanByKode(data.kode);
  if (bentrok && String(bentrok.id) !== String(id || '')) {
    throw new AppError(409, 'KODE_ASAL_TUJUAN_DIPAKAI', 'Kode asal & tujuan sudah dipakai.');
  }

  // Generate kode automatically if creating a new entry and kode is not provided
  if (!id && !data.kode) {
    const lastKodeResult = await query('SELECT kode FROM master_asal_tujuan ORDER BY CAST(SUBSTRING(kode, 8) AS UNSIGNED) DESC LIMIT 1');
    let newKode = 'TUJUAN-001'; // Default if no existing codes
    if (lastKodeResult && lastKodeResult.length > 0) {
      const lastKode = lastKodeResult[0].kode;
      const match = lastKode.match(/TUJUAN-(\d+)/);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10) + 1;
        newKode = `TUJUAN-${String(seq).padStart(3, '0')}`;
      }
    }
    data.kode = newKode;
  }

  const hasil = await simpanAsalTujuan(id ? Number(id) : null, data);
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

// New function for importing asal tujuan via CSV
export const imporAsalTujuan = async (rows, aktor) => {
  const data = rows.map(row => ({
    kode: row['KODE'] || row['Kode'],
    nama: row['NAMA TUJUAN'] || row['Nama Tujuan'],
    aktif: row['Status'] === 'Aktif' || row['status'] === 'aktif' || true // Default to active if not specified
  }));

  const hasil = await Promise.all(data.map(async row => {
    try {
      // Use simpanAsalTujuan which now handles automatic kode generation if needed
      return await simpanAsalTujuan(null, row, aktor); // Use null for id to create new
    } catch (error) {
      console.error('Error importing row:', row, error.message);
      return { error: error.message, row };
    }
  }));

  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_MASTER_ASAL_TUJUAN, // Assuming this action is appropriate for import
    koleksi: 'masterAsalTujuan',
    docId: 'impor-csv',
    sesudah: { importedCount: hasil.filter(r => !r.error).length, errors: hasil.filter(r => r.error).length }
  });

  return { importedCount: hasil.filter(r => !r.error).length, errors: hasil.filter(r => r.error).length };
};