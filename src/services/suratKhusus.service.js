import { AKSI_AUDIT } from '../constants/index.js';
import { catatAudit } from '../repositories/audit.repository.js';
import {
  buatSuratKhusus,
  cariSuratKhusus,
  daftarSuratKhusus,
  hapusSuratKhusus,
  hitungSuratKhusus,
  ubahSuratKhusus
} from '../repositories/suratKhusus.repository.js';
import { bacaPagination } from '../utils/pagination.js';
import { galatTidakDitemukan } from '../utils/AppError.js';
import { serialisasi } from '../utils/serialisasi.js';

const AKSI = {
  SK: { tambah: AKSI_AUDIT.TAMBAH_SK, ubah: AKSI_AUDIT.UBAH_SK, hapus: AKSI_AUDIT.HAPUS_SK },
  SE: { tambah: AKSI_AUDIT.TAMBAH_SE, ubah: AKSI_AUDIT.UBAH_SE, hapus: AKSI_AUDIT.HAPUS_SE }
};

const KOLEKSI = { SK: 'suratSk', SE: 'suratSe' };

const paginationUntuk = ({ page, limit, total }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages };
};

export const daftar = async (jenis, filter = {}) => {
  const { page, limit, offset } = bacaPagination(filter);
  const [items, total] = await Promise.all([
    daftarSuratKhusus(jenis, { search: filter.search, limit, offset }),
    hitungSuratKhusus(jenis, filter.search)
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

export const hapus = async (jenis, id, profil) => {
  const lama = await cariSuratKhusus(jenis, id);
  if (!lama) throw galatTidakDitemukan(`Surat ${jenis} tidak ditemukan.`);
  await hapusSuratKhusus(jenis, id);
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: AKSI[jenis].hapus,
    koleksi: KOLEKSI[jenis],
    docId: id,
    sebelum: lama
  });
  return { id: Number(id) };
};
