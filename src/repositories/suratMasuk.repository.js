import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { KOLEKSI } from '../constants/index.js';
import { tahunJakarta } from '../utils/tanggal.js';
import {
  ambilDokumen,
  jalankanTransaksi,
  queryKoleksi,
  refDokumen,
  refKoleksi,
  ubahDokumen
} from './base.repository.js';

export const cariSuratMasuk = (id) => ambilDokumen(KOLEKSI.SURAT_MASUK, id);

export const daftarSuratMasuk = ({ where = [], limit = null, field = 'dibuatPada', arah = 'desc' } = {}) =>
  queryKoleksi(KOLEKSI.SURAT_MASUK, { where, orderBy: { field, arah }, limit });

export const daftarSuratMasukTerurut = ({
  where = [],
  field = 'dibuatPada',
  arah = 'desc',
  limit = null
} = {}) => queryKoleksi(KOLEKSI.SURAT_MASUK, { where, orderBy: { field, arah }, limit });

export const buatSuratMasuk = async (payload, { uid, nama }) => {
  const tanggalTerima = payload.tglTerima instanceof Date ? payload.tglTerima : new Date(payload.tglTerima);
  const tahun = tahunJakarta(tanggalTerima);
  const counterRef = refDokumen(KOLEKSI.COUNTERS, `agendaMasuk_${tahun}`);
  const suratRef = refKoleksi(KOLEKSI.SURAT_MASUK).doc();
  const suratId = suratRef.id;

  return jalankanTransaksi(async (transaction) => {
    const counter = await transaction.get(counterRef);
    const berikutnya = counter.exists ? Number(counter.data().last || 0) + 1 : 1;
    const data = {
      ...payload,
      noAgenda: `${tahun}/${String(berikutnya).padStart(3, '0')}`,
      status: 'Baru',
      dibuatOleh: { uid, nama },
      dibuatPada: Timestamp.now(),
      fileId: String(payload.fileId || ''),
      fileUrl: String(payload.fileUrl || '')
    };
    if (counter.exists) {
      transaction.update(counterRef, { last: berikutnya });
    } else {
      transaction.set(counterRef, { last: berikutnya });
    }
    transaction.set(refDokumen(KOLEKSI.SURAT_MASUK, suratId), data);
    return { id: suratId, ...data };
  });
};

export const ubahSuratMasuk = (id, data) =>
  ubahDokumen(KOLEKSI.SURAT_MASUK, id, { ...data, diubahPada: Timestamp.now() });

export const simpanDisposisi = (id, data) =>
  ubahDokumen(KOLEKSI.SURAT_MASUK, id, { ...data, diubahPada: Timestamp.now() });

export const simpanTindakLanjut = (id, data) =>
  ubahDokumen(KOLEKSI.SURAT_MASUK, id, { ...data, diubahPada: Timestamp.now() });

export const setBerkasSuratMasuk = (id, { fileId, fileUrl = '' }) =>
  ubahDokumen(KOLEKSI.SURAT_MASUK, id, {
    fileId: String(fileId || ''),
    fileUrl: String(fileUrl || ''),
    diubahPada: FieldValue.serverTimestamp()
  });
