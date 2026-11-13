import { FieldValue } from 'firebase-admin/firestore';
import { KOLEKSI } from '../constants/index.js';
import { queryKoleksi, refKoleksi } from './base.repository.js';

export const catatAudit = async ({ uid, nama, aksi, koleksi, docId, sebelum = null, sesudah = null }) => {
  const ref = refKoleksi(KOLEKSI.AUDIT_LOG).doc();
  await ref.set({
    uid: String(uid || ''),
    nama: String(nama || ''),
    aksi: String(aksi || ''),
    koleksi: String(koleksi || ''),
    docId: String(docId || ''),
    sebelum: sebelum ?? null,
    sesudah: sesudah ?? null,
    waktu: FieldValue.serverTimestamp()
  });
  return ref.id;
};

export const daftarAudit = ({ limit = 200 } = {}) =>
  queryKoleksi(KOLEKSI.AUDIT_LOG, {
    orderBy: { field: 'waktu', arah: 'desc' },
    limit
  });
