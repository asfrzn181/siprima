import { KOLEKSI } from '../constants/index.js';
import { ambilDokumen, queryKoleksi, refDokumen, simpanDokumen, ubahDokumen } from './base.repository.js';

export const cariUser = (uid) => ambilDokumen(KOLEKSI.USERS, uid);

export const daftarUser = () => queryKoleksi(KOLEKSI.USERS, { orderBy: { field: 'nama', arah: 'asc' } });

export const simpanUser = async (uid, data) =>
  simpanDokumen(KOLEKSI.USERS, uid, { ...data, uid }, { merge: false });

export const ubahUser = (uid, data) => ubahDokumen(KOLEKSI.USERS, uid, data);

export const pastikanUserAda = async (uid) => {
  const snap = await refDokumen(KOLEKSI.USERS, uid).get();
  return snap.exists;
};
