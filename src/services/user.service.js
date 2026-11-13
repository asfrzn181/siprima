import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { AKSI_AUDIT, PERAN } from '../constants/index.js';
import { catatAudit } from '../repositories/audit.repository.js';
import {
  cariUser,
  cariUserByEmail,
  daftarUser,
  simpanUser,
  ubahUser
} from '../repositories/user.repository.js';
import { AppError, galatKonflik, galatTidakDitemukan } from '../utils/AppError.js';
import { potongHalaman } from '../utils/pagination.js';
import { serialisasi } from '../utils/serialisasi.js';

const validasiBidang = (data) => {
  if (data.role === PERAN.BIDANG && !String(data.bidang || '').trim()) {
    throw new AppError(400, 'VALIDASI_GAGAL', 'Kode bidang wajib diisi untuk peran bidang.', [
      { field: 'bidang', message: 'Kode bidang wajib diisi.' }
    ]);
  }
};

export const daftarPengguna = async (pagination) => {
  const semua = (await daftarUser()).map((item) => serialisasi(item));
  return potongHalaman(semua, pagination);
};

export const buatPengguna = async (data, aktor) => {
  validasiBidang(data);
  const email = String(data.email || '').trim().toLowerCase();
  if (await cariUserByEmail(email)) throw galatKonflik('Email sudah dipakai.');

  const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);
  const hasil = await simpanUser({
    email,
    passwordHash,
    nama: data.nama,
    role: data.role,
    bidang: data.role === PERAN.BIDANG ? data.bidang : '',
    aktif: data.aktif
  });

  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.TAMBAH_USER,
    koleksi: 'users',
    docId: hasil.id,
    sesudah: hasil
  });
  return serialisasi(hasil);
};

export const ubahPengguna = async (id, data, aktor) => {
  validasiBidang(data);
  const lama = await cariUser(id);
  if (!lama) throw galatTidakDitemukan('Pengguna tidak ditemukan.');

  const hasil = await ubahUser(id, {
    nama: data.nama,
    role: data.role,
    bidang: data.role === PERAN.BIDANG ? data.bidang : '',
    aktif: data.aktif
  });

  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_USER,
    koleksi: 'users',
    docId: id,
    sebelum: lama,
    sesudah: hasil
  });
  return serialisasi(hasil);
};
