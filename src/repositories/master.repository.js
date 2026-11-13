import { query, one, withTransaction } from '../config/db.js';

const petaBidang = (row) => ({
  id: row.id,
  kode: row.kode,
  nama: row.nama,
  aktif: row.aktif === 1
});

const petaNomor = (row) => ({
  id: row.id,
  nama: row.nama,
  golongan: row.golongan,
  format: row.format,
  kode: row.kode,
  resetTahunan: row.reset_tahunan === 1,
  urutanPerBidang: row.urutan_per_bidang === 1,
  aktif: row.aktif === 1
});

export const daftarBidang = async ({ hanyaAktif = false } = {}) => {
  const rows = await query(
    `SELECT id, kode, nama, aktif FROM master_bidang
     ${hanyaAktif ? 'WHERE aktif = 1' : ''} ORDER BY nama ASC`
  );
  return rows.map(petaBidang);
};

export const cariBidangByKode = async (kode) => {
  const row = await one('SELECT id, kode, nama, aktif FROM master_bidang WHERE kode = ? LIMIT 1', [
    String(kode || '').trim()
  ]);
  return row ? petaBidang(row) : null;
};

export const cariBidangById = async (id) => {
  const row = await one('SELECT id, kode, nama, aktif FROM master_bidang WHERE id = ?', [id]);
  return row ? petaBidang(row) : null;
};

export const simpanBidang = async (id, data) => {
  if (id) {
    await query('UPDATE master_bidang SET kode = ?, nama = ?, aktif = ? WHERE id = ?', [
      data.kode,
      data.nama,
      data.aktif ? 1 : 0,
      id
    ]);
  } else {
    await query(
      `INSERT INTO master_bidang (kode, nama, aktif) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE nama = VALUES(nama), aktif = VALUES(aktif)`,
      [data.kode, data.nama, data.aktif ? 1 : 0]
    );
  }
  return cariBidangByKode(data.kode);
};

export const daftarNomor = async () => {
  const rows = await query('SELECT * FROM master_nomor ORDER BY nama ASC');
  return rows.map(petaNomor);
};

export const cariNomor = async (id) => {
  const row = await one('SELECT * FROM master_nomor WHERE id = ?', [id]);
  return row ? petaNomor(row) : null;
};

export const cariNomorByKodeAtauNama = async (kataKunci, maksimal = 5) => {
  const kunci = String(kataKunci || '').trim();
  if (kunci.length < 3) return [];
  const pola = `%${kunci}%`;
  const rows = await query(
    `SELECT * FROM master_nomor
      WHERE aktif = 1 AND (kode LIKE ? OR nama LIKE ?)
      ORDER BY kode ASC, nama ASC LIMIT ?`,
    [pola, pola, Number(maksimal) || 5]
  );
  return rows.map(petaNomor);
};

export const simpanNomor = async (id, data) => {
  const nilai = [
    data.nama,
    data.golongan,
    data.format,
    data.kode,
    data.resetTahunan ? 1 : 0,
    data.urutanPerBidang ? 1 : 0,
    data.aktif ? 1 : 0
  ];
  if (id) {
    await query(
      `UPDATE master_nomor
          SET nama = ?, golongan = ?, format = ?, kode = ?, reset_tahunan = ?,
              urutan_per_bidang = ?, aktif = ?
        WHERE id = ?`,
      [...nilai, id]
    );
    return cariNomor(id);
  }
  const hasil = await query(
    `INSERT INTO master_nomor
       (nama, golongan, format, kode, reset_tahunan, urutan_per_bidang, aktif)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    nilai
  );
  return cariNomor(hasil.insertId);
};

export const simpanNomorBatch = async (baris) => {
  await withTransaction(async (koneksi) => {
    for (const item of baris) {
      const data = item.data;
      const nilai = [
        data.nama,
        data.golongan,
        data.format,
        data.kode,
        data.resetTahunan ? 1 : 0,
        data.urutanPerBidang ? 1 : 0,
        data.aktif ? 1 : 0
      ];
      const idNumerik = Number(item.id);
      if (Number.isInteger(idNumerik) && idNumerik > 0) {
        await koneksi.query(
          `UPDATE master_nomor
              SET nama = ?, golongan = ?, format = ?, kode = ?, reset_tahunan = ?,
                  urutan_per_bidang = ?, aktif = ?
            WHERE id = ?`,
          [...nilai, idNumerik]
        );
        continue;
      }
      const [ada] = await koneksi.query(
        'SELECT id FROM master_nomor WHERE kode = ? AND golongan = ? LIMIT 1',
        [data.kode, data.golongan]
      );
      if (ada.length) {
        await koneksi.query(
          `UPDATE master_nomor
              SET nama = ?, format = ?, reset_tahunan = ?, urutan_per_bidang = ?, aktif = ?
            WHERE id = ?`,
          [data.nama, data.format, data.resetTahunan ? 1 : 0, data.urutanPerBidang ? 1 : 0, data.aktif ? 1 : 0, ada[0].id]
        );
      } else {
        await koneksi.query(
          `INSERT INTO master_nomor
             (nama, golongan, format, kode, reset_tahunan, urutan_per_bidang, aktif)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          nilai
        );
      }
    }
  });
  return baris.length;
};

export const hapusNomor = (id) => query('DELETE FROM master_nomor WHERE id = ?', [id]);
