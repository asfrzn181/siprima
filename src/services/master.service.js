import { AKSI_AUDIT, GOLONGAN } from '../constants/index.js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';import { catatAudit } from '../repositories/audit.repository.js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';import {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  cariAsalTujuanByKode,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  cariAsalTujuanByKodeAtauNama,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  cariAsalTujuanById,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  cariBidangById,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  cariBidangByKode,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  cariNomor,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  cariNomorByKodeAtauNama,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  daftarAsalTujuan,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  daftarBidang,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  daftarNomor,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  simpanAsalTujuan,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  simpanBidang,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  simpanNomor,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  simpanNomorBatch
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';} from '../repositories/master.repository.js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';import { AppError, galatTidakDitemukan } from '../utils/AppError.js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';import { potongHalaman } from '../utils/pagination.js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';import { serialisasi } from '../utils/serialisasi.js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const daftarMasterBidang = async ({ hanyaAktif = true } = {}) =>
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  (await daftarBidang({ hanyaAktif })).map((item) => serialisasi(item));
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const daftarMasterBidangHalaman = async (pagination) => {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const semua = (await daftarBidang()).map((item) => serialisasi(item));
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  return potongHalaman(semua, pagination);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';};
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const simpanMasterBidang = async (id, data, aktor) => {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const lama = id ? await cariBidangById(id) : null;
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  if (id && !lama) throw galatTidakDitemukan('Bidang tidak ditemukan.');
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const bentrok = await cariBidangByKode(data.kode);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  if (bentrok && String(bentrok.id) !== String(id || '')) {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    throw new AppError(409, 'KODE_BIDANG_DIPAKAI', 'Kode bidang sudah dipakai.');
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  }
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const hasil = await simpanBidang(id || null, data);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  await catatAudit({
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    uid: aktor.uid,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    nama: aktor.nama,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    aksi: AKSI_AUDIT.UBAH_MASTER_BIDANG,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    koleksi: 'masterBidang',
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    docId: hasil.id,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    sebelum: lama,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    sesudah: hasil
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  });
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  return serialisasi(hasil);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';};
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const daftarMasterNomor = async (pagination) => {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const semua = (await daftarNomor()).map((item) => serialisasi(item));
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  return potongHalaman(semua, pagination);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';};
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const daftarSemuaMasterNomor = async () => (await daftarNomor()).map((item) => serialisasi(item));
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const cariMasterNomor = async (id) => {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const data = await cariNomor(Number(id));
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  if (!data) throw galatTidakDitemukan('Jenis nomor tidak ditemukan.');
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  return serialisasi(data);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';};
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const cariMasterNomorKode = async (kataKunci, maksimal) =>
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  (await cariNomorByKodeAtauNama(kataKunci, maksimal)).map((item) => serialisasi(item));
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const simpanMasterNomor = async (id, data, aktor) => {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const lama = id ? await cariNomor(Number(id)) : null;
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  if (id && !lama) throw galatTidakDitemukan('Jenis nomor tidak ditemukan.');
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  if (!GOLONGAN.includes(data.golongan)) throw new AppError(400, 'VALIDASI_GAGAL', 'Golongan tidak valid.');
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const hasil = await simpanNomor(id ? Number(id) : null, data);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  await catatAudit({
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    uid: aktor.uid,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    nama: aktor.nama,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    aksi: AKSI_AUDIT.UBAH_MASTER_NOMOR,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    koleksi: 'masterNomor',
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    docId: hasil.id,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    sebelum: lama,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    sesudah: hasil
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  });
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  return serialisasi(hasil);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';};
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const imporMasterNomor = async (rows, aktor) => {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const jumlah = await simpanNomorBatch(rows);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  await catatAudit({
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    uid: aktor.uid,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    nama: aktor.nama,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    aksi: AKSI_AUDIT.UBAH_MASTER_NOMOR,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    koleksi: 'masterNomor',
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    docId: 'impor-csv',
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    sesudah: { jumlah }
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  });
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  return { jumlah };
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';};
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const daftarMasterAsalTujuan = async ({ hanyaAktif = true } = {}) =>
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  (await daftarAsalTujuan({ hanyaAktif })).map((item) => serialisasi(item));
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const daftarMasterAsalTujuanHalaman = async (pagination) => {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const semua = (await daftarAsalTujuan()).map((item) => serialisasi(item));
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  return potongHalaman(semua, pagination);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';};
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const cariMasterAsalTujuanKode = async (kataKunci, maksimal) =>
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  (await cariAsalTujuanByKodeAtauNama(kataKunci, maksimal)).map((item) => serialisasi(item));
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';export const simpanMasterAsalTujuan = async (id, data, aktor) => {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const lama = id ? await cariAsalTujuanById(Number(id)) : null;
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  if (id && !lama) throw galatTidakDitemukan('Data asal & tujuan tidak ditemukan.');
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const bentrok = await cariAsalTujuanByKode(data.kode);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  if (bentrok && String(bentrok.id) !== String(id || '')) {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    throw new AppError(409, 'KODE_ASAL_TUJUAN_DIPAKAI', 'Kode asal & tujuan sudah dipakai.');
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  }
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  // Generate kode automatically if creating a new entry and kode is not provided
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  if (!id && !data.kode) {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    const lastKodeResult = await query('SELECT kode FROM master_asal_tujuan ORDER BY CAST(SUBSTRING(kode, 8) AS UNSIGNED) DESC LIMIT 1');
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    let newKode = 'TUJUAN-001'; // Default if no existing codes
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    if (lastKodeResult && lastKodeResult.length > 0) {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';      const lastKode = lastKodeResult[0].kode;
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';      const match = lastKode.match(/TUJUAN-(\d+)/);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';      if (match && match[1]) {
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';        const seq = parseInt(match[1], 10) + 1;
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';        newKode = `TUJUAN-${String(seq).padStart(3, '0')}`;
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';      }
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    }
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    data.kode = newKode;
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  }
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  const hasil = await simpanAsalTujuan(id ? Number(id) : null, data);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  await catatAudit({
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    uid: aktor.uid,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    nama: aktor.nama,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    aksi: AKSI_AUDIT.UBAH_MASTER_ASAL_TUJUAN,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    koleksi: 'masterAsalTujuan',
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    docId: hasil.id,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    sebelum: lama,
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';    sesudah: hasil
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  });
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';  return serialisasi(hasil);
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';};
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';