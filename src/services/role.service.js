import { AKSI_AUDIT } from '../constants/index.js';
import { catatAudit } from '../repositories/audit.repository.js';
import {
  cariPeran,
  daftarIzin,
  daftarPeran,
  simpanIzinPeran
} from '../repositories/role.repository.js';
import { galatTidakDitemukan } from '../utils/AppError.js';

export const daftarPeranDanIzin = async () => ({
  peran: await daftarPeran(),
  izin: await daftarIzin()
});

export const ubahIzinPeran = async (nama, izin, aktor) => {
  if (!(await cariPeran(nama))) throw galatTidakDitemukan('Peran tidak ditemukan.');
  await simpanIzinPeran(nama, izin);
  const hasil = (await daftarPeran()).find((item) => item.nama === nama);
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_PERAN,
    koleksi: 'roles',
    docId: nama,
    sesudah: hasil
  });
  return hasil;
};
