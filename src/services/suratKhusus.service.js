import { AKSI_AUDIT } from '../constants/index.js';
import { catatAudit } from '../repositories/audit.repository.js';
import {
  batalkanSuratKhusus,
  buatSuratKhusus,
  cariSuratKhusus,
  daftarSuratKhusus,
  hitungSuratKhusus,
  ubahSuratKhusus
} from '../repositories/suratKhusus.repository.js';
import { daftarTersedia } from './numbering.service.js';
import { bacaPagination } from '../utils/pagination.js';
import { AppError, galatTidakDitemukan } from '../utils/AppError.js';
import { serialisasi } from '../utils/serialisasi.js';

const AKSI = {
  SK: { tambah: AKSI_AUDIT.TAMBAH_SK, ubah: AKSI_AUDIT.UBAH_SK, batal: AKSI_AUDIT.BATAL_SK },
  SE: { tambah: AKSI_AUDIT.TAMBAH_SE, ubah: AKSI_AUDIT.UBAH_SE, batal: AKSI_AUDIT.BATAL_SE }
};

const KOLEKSI = { SK: 'suratSk', SE: 'suratSe' };

const paginationUntuk = ({ page, limit, total }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages };
};

export const daftar = async (jenis, filter = {}) => {
  const { page, limit, offset } = bacaPagination(filter);
  const kueri = { search: filter.search, status: filter.status || '' };
  const [items, total] = await Promise.all([
    daftarSuratKhusus(jenis, { ...kueri, limit, offset }),
    hitungSuratKhusus(jenis, kueri)
  ]);
  return {
    items: items.map((item) => serialisasi(item)),
    pagination: paginationUntuk({ page, limit, total })
  };
};

export const ambil = async (jenis, id) => {
  const data = await cariSuratKhusus(jenis, id);
  if (!data) throw galatTidakDitemukan(`Surat ${jenis} tidak ditemukan.`);
  return serialisasi(data);
};

export const nomorTersedia = (jenis, filter = {}, profil) =>
  daftarTersedia(
    {
      menu: jenis.toUpperCase(),
      jenisId: filter.jenisId,
      tanggal: filter.tanggal,
      seqPilihan: filter.seqPilihan
    },
    profil
  );

export const tambah = async (jenis, payload, profil) => {
  const hasil = await buatSuratKhusus(jenis, payload, { uid: profil.uid, nama: profil.nama });
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: AKSI[jenis].tambah,
    koleksi: KOLEKSI[jenis],
    docId: hasil.id,
    sesudah: hasil
  });
  return serialisasi(hasil);
};

export const ubah = async (jenis, id, payload, profil) => {
  const lama = await cariSuratKhusus(jenis, id);
  if (!lama) throw galatTidakDitemukan(`Surat ${jenis} tidak ditemukan.`);
  if (lama.status === 'Dibatalkan') {
    throw new AppError(409, 'SURAT_DIBATALKAN', `Surat ${jenis} yang dibatalkan tidak dapat diubah.`);
  }
  const hasil = await ubahSuratKhusus(jenis, id, payload);
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: AKSI[jenis].ubah,
    koleksi: KOLEKSI[jenis],
    docId: id,
    sebelum: lama,
    sesudah: hasil
  });
  return serialisasi(hasil);
};

export const hapus = async (jenis, id, alasan, profil) => {
  const lama = await cariSuratKhusus(jenis, id);
  if (!lama) throw galatTidakDitemukan(`Surat ${jenis} tidak ditemukan.`);
  const hasil = await batalkanSuratKhusus(jenis, id, alasan, { uid: profil.uid, nama: profil.nama });
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: AKSI[jenis].batal,
    koleksi: KOLEKSI[jenis],
    docId: id,
    sebelum: lama,
    sesudah: hasil
  });
  return serialisasi(hasil);
};
