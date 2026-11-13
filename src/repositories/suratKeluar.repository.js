import { FieldValue } from 'firebase-admin/firestore';
import { KOLEKSI } from '../constants/index.js';
import { ambilDokumen, queryKoleksi, refDokumen, ubahDokumen } from './base.repository.js';

export const cariSuratKeluar = (id) => ambilDokumen(KOLEKSI.SURAT_KELUAR, id);

export const daftarSuratKeluar = ({ where = [], limit = null, field = 'tglSurat', arah = 'desc' } = {}) =>
  queryKoleksi(KOLEKSI.SURAT_KELUAR, { where, orderBy: { field, arah }, limit });

export const ubahSuratKeluar = (id, data) =>
  ubahDokumen(KOLEKSI.SURAT_KELUAR, id, { ...data, diubahPada: FieldValue.serverTimestamp() });

export const setBerkasSuratKeluar = (id, { fileId, fileUrl = '' }) =>
  ubahDokumen(KOLEKSI.SURAT_KELUAR, id, {
    fileId: String(fileId || ''),
    fileUrl: String(fileUrl || ''),
    diubahPada: FieldValue.serverTimestamp()
  });

export const setPengiriman = (id, dikirim) => ubahSuratKeluar(id, { dikirimKeLuar: dikirim === true });

export const cariSuratKeluarByNomor = async (nomor) => {
  const hasil = await queryKoleksi(KOLEKSI.SURAT_KELUAR, {
    where: [['noSurat', '==', String(nomor || '').trim()]],
    limit: 1
  });
  return hasil[0] || null;
};

export const tandaiDibatalkan = (id, alasan, tambahan = {}) =>
  ubahSuratKeluar(id, { status: 'Dibatalkan', alasanBatal: String(alasan || ''), ...tambahan });

export { refDokumen };
