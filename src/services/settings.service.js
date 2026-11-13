import { AKSI_AUDIT } from '../constants/index.js';
import { catatAudit } from '../repositories/audit.repository.js';
import { ambilPengaturan, simpanPengaturan } from '../repositories/settings.repository.js';
import { serialisasi } from '../utils/serialisasi.js';

export const bacaPengaturan = async () => serialisasi(await ambilPengaturan());

export const ubahPengaturan = async (data, aktor) => {
  const lama = await ambilPengaturan();
  await simpanPengaturan(data);
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_PENGATURAN,
    koleksi: 'pengaturan',
    docId: 'umum',
    sebelum: lama,
    sesudah: data
  });
  return data;
};
