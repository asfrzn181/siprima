import { one, query } from '../config/db.js';

const JENIS_VALID = new Set(['SK', 'SE']);

const pastikanJenis = (jenis) => {
  const nilai = String(jenis || '').toUpperCase();
  if (!JENIS_VALID.has(nilai)) throw new Error(`Jenis surat khusus tidak dikenal: ${jenis}`);
  return nilai;
};

const peta = (row) => ({
  id: row.id,
  jenis: row.jenis,
  tentang: row.tentang,
  nomor: row.nomor,
  tanggal: row.tanggal,
  keterangan: row.keterangan,
  dibuatOleh: { uid: row.dibuat_oleh_id, nama: row.dibuat_oleh_nama },
  dibuatPada: row.dibuat_pada,
  diubahPada: row.diubah_pada
});

export const daftarSuratKhusus = async (jenis, { search = '', limit = 20, offset = 0 } = {}) => {
  const kunci = String(search || '').trim();
  const pola = `%${kunci}%`;
  const params = [pastikanJenis(jenis)];
  let filter = 'jenis = ?';
  if (kunci) {
    filter += ' AND (tentang LIKE ? OR nomor LIKE ? OR keterangan LIKE ?)';
    params.push(pola, pola, pola);
  }
  const rows = await query(
    `SELECT * FROM surat_khusus WHERE ${filter}
      ORDER BY tanggal DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return rows.map(peta);
};

export const hitungSuratKhusus = async (jenis, search = '') => {
  const kunci = String(search || '').trim();
  const pola = `%${kunci}%`;
  const params = [pastikanJenis(jenis)];
  let filter = 'jenis = ?';
  if (kunci) {
    filter += ' AND (tentang LIKE ? OR nomor LIKE ? OR keterangan LIKE ?)';
    params.push(pola, pola, pola);
  }
  const row = await one(`SELECT COUNT(*) AS jumlah FROM surat_khusus WHERE ${filter}`, params);
  return Number(row?.jumlah || 0);
};

export const cariSuratKhusus = async (jenis, id) => {
  const row = await one('SELECT * FROM surat_khusus WHERE id = ? AND jenis = ?', [
    Number(id),
    pastikanJenis(jenis)
  ]);
  return row ? peta(row) : null;
};

export const buatSuratKhusus = async (jenis, data, { uid, nama } = {}) => {
  const hasil = await query(
    `INSERT INTO surat_khusus
       (jenis, tentang, nomor, tanggal, keterangan, dibuat_oleh_id, dibuat_oleh_nama, dibuat_pada)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3))`,
    [
      pastikanJenis(jenis),
      data.tentang,
      data.nomor,
      data.tanggal,
      String(data.keterangan || ''),
      uid || null,
      nama || ''
    ]
  );
  return cariSuratKhusus(jenis, hasil.insertId);
};

export const ubahSuratKhusus = async (jenis, id, data) => {
  await query(
    `UPDATE surat_khusus
        SET tentang = ?, nomor = ?, tanggal = ?, keterangan = ?, diubah_pada = NOW(3)
      WHERE id = ? AND jenis = ?`,
    [data.tentang, data.nomor, data.tanggal, String(data.keterangan || ''), Number(id), pastikanJenis(jenis)]
  );
  return cariSuratKhusus(jenis, id);
};

export const hapusSuratKhusus = async (jenis, id) => {
  await query('DELETE FROM surat_khusus WHERE id = ? AND jenis = ?', [Number(id), pastikanJenis(jenis)]);
};
