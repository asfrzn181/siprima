import { query } from '../config/db.js';
import { jsonAtauNull, parseJson } from './helpers.js';

const petaAudit = (row) => ({
  id: row.id,
  uid: row.user_id,
  nama: row.nama,
  aksi: row.aksi,
  koleksi: row.koleksi,
  docId: row.doc_id,
  sebelum: parseJson(row.sebelum),
  sesudah: parseJson(row.sesudah),
  waktu: row.waktu
});

export const catatAudit = async ({ uid, nama, aksi, koleksi, docId, sebelum = null, sesudah = null }) => {
  const hasil = await query(
    `INSERT INTO audit_log (user_id, nama, aksi, koleksi, doc_id, sebelum, sesudah, waktu)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3))`,
    [
      uid || null,
      String(nama || ''),
      String(aksi || ''),
      String(koleksi || ''),
      String(docId || ''),
      jsonAtauNull(sebelum),
      jsonAtauNull(sesudah)
    ]
  );
  return hasil.insertId;
};

export const daftarAudit = async ({ limit = 200 } = {}) => {
  const rows = await query('SELECT * FROM audit_log ORDER BY waktu DESC LIMIT ?', [Number(limit) || 200]);
  return rows.map(petaAudit);
};
