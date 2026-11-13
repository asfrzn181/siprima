import { dapatkanAuth } from '../config/firebase.js';
import { PERAN } from '../constants/index.js';
import { daftarUser, simpanUser, ubahUser, cariUser } from '../repositories/user.repository.js';
import { AppError, galatKonflik, galatTidakDitemukan } from '../utils/AppError.js';
import { potongHalaman } from '../utils/pagination.js';
import { serialisasi } from '../utils/serialisasi.js';
import { AKSI_AUDIT } from '../constants/index.js';
import { catatAudit } from '../repositories/audit.repository.js';

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
  let userRecord;
  try {
    userRecord = await dapatkanAuth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.nama,
      disabled: !data.aktif
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') throw galatKonflik('Email sudah dipakai.');
    throw error;
  }

  const profil = {
    email: data.email,
    nama: data.nama,
    role: data.role,
    bidang: data.role === PERAN.BIDANG ? data.bidang : '',
    aktif: data.aktif
  };
  try {
    await simpanUser(userRecord.uid, profil);
  } catch (error) {
    await dapatkanAuth()
      .deleteUser(userRecord.uid)
      .catch(() => {});
    throw error;
  }
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.TAMBAH_USER,
    koleksi: 'users',
    docId: userRecord.uid,
    sesudah: { ...profil, uid: userRecord.uid }
  });
  return { uid: userRecord.uid, ...profil };
};

export const ubahPengguna = async (uid, data, aktor) => {
  validasiBidang(data);
  const lama = await cariUser(uid);
  if (!lama) throw galatTidakDitemukan('Pengguna tidak ditemukan.');
  const perubahan = {
    nama: data.nama,
    role: data.role,
    bidang: data.role === PERAN.BIDANG ? data.bidang : '',
    aktif: data.aktif
  };
  await ubahUser(uid, perubahan);
  await dapatkanAuth().updateUser(uid, {
    displayName: data.nama,
    disabled: !data.aktif
  });
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_USER,
    koleksi: 'users',
    docId: uid,
    sebelum: lama,
    sesudah: { ...lama, ...perubahan }
  });
  return { uid, ...lama, ...perubahan };
};
