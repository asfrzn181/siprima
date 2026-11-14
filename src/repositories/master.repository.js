import { one, query, withTransaction } from '../config/db.js';

const petaBidang = (row) => ({
  id: row.id,
  kode: row.kode,
  nama: row.nama,
  aksesData: row.akses_data === 'SEMUA' ? 'SEMUA' : 'SENDIRI',
  aktif: row.aktif === 1
});

const petaNomor = (row) => ({
  id: row.id,
  nama: row.nama,
  golongan: row.golongan,
  kode: row.kode,
  resetTahunan: row.reset_tahunan === 1,
  urutanPerBidang: row.urutan_per_bidang === 1,
  aktif: row.aktif === 1
});

const petaAsalTujuan = (row) => ({
  id: row.id,
  kode: row.kode,
  nama: row.nama,
  aktif: row.aktif === 1
});

export const daftarBidang = async ({ hanyaAktif = false } = {}) => {
  const rows = await query(
    `SELECT id, kode, nama, akses_data, aktif FROM master_bidang
     ${hanyaAktif ? 'WHERE aktif = 1' : ''} ORDER BY nama ASC`
  );
  return rows.map(petaBidang);
};

export const cariBidangByKode = async (kode) => {
  const row = await one(
    'SELECT id, kode, nama, akses_data, aktif FROM master_bidang WHERE kode = ? LIMIT 1',
    [String(kode || '').trim()]
  );
  return row ? petaBidang(row) : null;
};

export const cariBidangById = async (id) => {
  const row = await one('SELECT id, kode, nama, akses_data, aktif FROM master_bidang WHERE id = ?', [
    id
  ]);
  return row ? petaBidang(row) : null;
};

export const simpanBidang = async (id, data) => {
  const aksesData = data.aksesData === 'SEMUA' ? 'SEMUA' : 'SENDIRI';
  if (id) {
    await query('UPDATE master_bidang SET kode = ?, nama = ?, akses_data = ?, aktif = ? WHERE id = ?', [
      data.kode,
      data.nama,
      aksesData,
      data.aktif ? 1 : 0,
      id
    ]);
  } else {
    await query(
      `INSERT INTO master_bidang (kode, nama, akses_data, aktif) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nama = VALUES(nama), akses_data = VALUES(akses_data), aktif = VALUES(aktif)`,
      [data.kode, data.nama, aksesData, data.aktif ? 1 : 0]
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
  if (kunci.length < 2) return [];
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
    data.kode,
    data.resetTahunan ? 1 : 0,
    data.urutanPerBidang ? 1 : 0,
    data.aktif ? 1 : 0
  ];
  if (id) {
    await query(
      `UPDATE master_nomor
          SET nama = ?, golongan = ?, kode = ?, reset_tahunan = ?,
              urutan_per_bidang = ?, aktif = ?
        WHERE id = ?`,
      [...nilai, id]
    );
    return cariNomor(id);
  }
  const hasil = await query(
    `INSERT INTO master_nomor
       (nama, golongan, kode, reset_tahunan, urutan_per_bidang, aktif)
     VALUES (?, ?, ?, ?, ?, ?)`,
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
        data.kode,
        data.resetTahunan ? 1 : 0,
        data.urutanPerBidang ? 1 : 0,
        data.aktif ? 1 : 0
      ];
      const idNumerik = Number(item.id);
      if (Number.isInteger(idNumerik) && idNumerik > 0) {
        await koneksi.query(
          `UPDATE master_nomor
              SET nama = ?, golongan = ?, kode = ?, reset_tahunan = ?,
                  urutan_per_bidang = ?, aktif = ?
            WHERE id = ?`,
          [...nilai, idNumerik]
        );
        continue;
      }
      const [ada] = await koneksi.query('SELECT id FROM master_nomor WHERE kode = ? LIMIT 1', [data.kode]);
      if (ada.length) {
        await koneksi.query(
          `UPDATE master_nomor
              SET nama = ?, golongan = ?, reset_tahunan = ?, urutan_per_bidang = ?, aktif = ?
            WHERE id = ?`,
          [data.nama, data.golongan, data.resetTahunan ? 1 : 0, data.urutanPerBidang ? 1 : 0, data.aktif ? 1 : 0, ada[0].id]
        );
      } else {
        await koneksi.query(
          `INSERT INTO master_nomor
             (nama, golongan, kode, reset_tahunan, urutan_per_bidang, aktif)
           VALUES (?, ?, ?, ?, ?, ?)`,
          nilai
        );
      }
    }
  });
  return baris.length;
};

export const hapusNomor = (id) => query('DELETE FROM master_nomor WHERE id = ?', [id]);

export const daftarAsalTujuan = async ({ hanyaAktif = false } = {}) => {
  const rows = await query(
    `SELECT id, kode, nama, aktif FROM master_asal_tujuan
     ${hanyaAktif ? 'WHERE aktif = 1' : ''} ORDER BY nama ASC`
  );
  return rows.map(petaAsalTujuan);
};

export const cariAsalTujuanById = async (id) => {
  const row = await one('SELECT id, kode, nama, aktif FROM master_asal_tujuan WHERE id = ?', [id]);
  return row ? petaAsalTujuan(row) : null;
};

export const cariAsalTujuanByKode = async (kode) => {
  const row = await one('SELECT id, kode, nama, aktif FROM master_asal_tujuan WHERE kode = ? LIMIT 1', [
    String(kode || '').trim()
  ]);
  return row ? petaAsalTujuan(row) : null;
};

export const kodeAsalTujuanTerakhir = async () => {
  const row = await one(
    `SELECT kode FROM master_asal_tujuan
      WHERE kode LIKE 'TUJUAN-%'
      ORDER BY CAST(SUBSTRING(kode, 8) AS UNSIGNED) DESC
      LIMIT 1`
  );
  return row ? row.kode : null;
};

export const cariAsalTujuanByKodeAtauNama = async (kataKunci, maksimal = 5) => {
  const kunci = String(kataKunci || '').trim();
  if (kunci.length < 2) return [];
  const pola = `%${kunci}%`;
  const rows = await query(
    `SELECT id, kode, nama, aktif FROM master_asal_tujuan
      WHERE aktif = 1 AND (kode LIKE ? OR nama LIKE ?)
      ORDER BY nama ASC LIMIT ?`,
    [pola, pola, Number(maksimal) || 5]
  );
  return rows.map(petaAsalTujuan);
};

export const simpanAsalTujuan = async (id, data) => {
  const nilai = [data.kode, data.nama, data.aktif ? 1 : 0];
  if (id) {
    await query('UPDATE master_asal_tujuan SET kode = ?, nama = ?, aktif = ? WHERE id = ?', [...nilai, id]);
    return cariAsalTujuanById(id);
  }
  const hasil = await query(
    `INSERT INTO master_asal_tujuan (kode, nama, aktif) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE nama = VALUES(nama), aktif = VALUES(aktif)`,
    nilai
  );
  if (hasil.insertId) return cariAsalTujuanById(hasil.insertId);
  return cariAsalTujuanByKode(data.kode);
};
