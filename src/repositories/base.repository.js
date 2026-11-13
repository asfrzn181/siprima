import { dapatkanDb } from '../config/firebase.js';

export const refKoleksi = (nama) => dapatkanDb().collection(nama);

export const refDokumen = (nama, id) => {
  if (!id) throw new Error(`ID dokumen ${nama} wajib diisi.`);
  return dapatkanDb().collection(nama).doc(String(id));
};

export const ambilDokumen = async (nama, id) => {
  const snap = await refDokumen(nama, id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
};

export const tambahDokumen = async (nama, data) => {
  const ref = refKoleksi(nama).doc();
  await ref.set(data);
  return { id: ref.id, ...data };
};

export const simpanDokumen = async (nama, id, data, opsi = { merge: false }) => {
  await refDokumen(nama, id).set(data, opsi);
  return { id: String(id), ...data };
};

export const ubahDokumen = async (nama, id, data) => {
  await refDokumen(nama, id).update(data);
  return { id: String(id), ...data };
};

export const hapusDokumen = async (nama, id) => refDokumen(nama, id).delete();

const terapkanWhere = (query, daftarWhere = []) =>
  daftarWhere.reduce((hasil, [field, operator, nilai]) => hasil.where(field, operator, nilai), query);

export const queryKoleksi = async (
  nama,
  { where = [], orderBy = null, limit = null, offset = null, startAfter = null } = {}
) => {
  let query = terapkanWhere(refKoleksi(nama), where);
  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.arah || 'asc');
  }
  if (startAfter) query = query.startAfter(startAfter);
  if (offset) query = query.offset(offset);
  if (limit) query = query.limit(limit);
  const snap = await query.get();
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
};

export const hitungKoleksi = async (nama, where = []) => {
  const snap = await terapkanWhere(refKoleksi(nama), where).count().get();
  return snap.data().count;
};

export const commitBatch = async (operasi) => {
  const batch = dapatkanDb().batch();
  operasi(batch);
  await batch.commit();
};

export const jalankanTransaksi = (handler) => dapatkanDb().runTransaction(handler);
