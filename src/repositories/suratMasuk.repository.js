import { query, one, withTransaction } from '../config/db.js';
import { tahunJakarta } from '../utils/tanggal.js';
import { arahUrut, batasLimit, kolomUrut, terjemahWhere } from './helpers.js';

const PETA_WHERE = {
  status: 'surat_masuk.status',
  sifat: 'surat_masuk.sifat',
  tglTerima: 'surat_masuk.tgl_terima',
  dibuatPada: 'surat_masuk.dibuat_pada',
  noSurat: 'surat_masuk.no_surat',
  hal: 'surat_masuk.hal',
  asal: 'surat_masuk.asal',
  aksesBidang: {
    tabel: 'surat_masuk_akses_bidang',
    fk: 'surat_masuk_id',
    kolom: 'bidang_kode',
    induk: 'surat_masuk.id'
  }
};

const PETA_URUT = {
  dibuatPada: 'surat_masuk.dibuat_pada',
  tglTerima: 'surat_masuk.tgl_terima',
  noSurat: 'surat_masuk.no_surat',
  hal: 'surat_masuk.hal',
  asal: 'surat_masuk.asal'
};

const KOLOM = {
  tglTerima: 'tgl_terima',
  tglSurat: 'tgl_surat',
  noSurat: 'no_surat',
  asal: 'asal',
  hal: 'hal',
  isiRingkas: 'isi_ringkas',
  sifat: 'sifat',
  fileId: 'file_id',
  fileUrl: 'file_url',
  status: 'status',
  dibuatPada: 'dibuat_pada',
  diubahPada: 'diubah_pada'
};

const petaMasuk = (row) => ({
  id: row.id,
  noAgenda: row.no_agenda,
  tglTerima: row.tgl_terima,
  tglSurat: row.tgl_surat,
  noSurat: row.no_surat,
  asal: row.asal,
  hal: row.hal,
  isiRingkas: row.isi_ringkas,
  sifat: row.sifat,
  fileId: row.file_id,
  fileUrl: row.file_url,
  status: row.status,
  dibuatOleh: { uid: row.dibuat_oleh_id, nama: row.dibuat_oleh_nama },
  disposisi: {
    kepada: [],
    diputuskanOleh: row.disposisi_diputuskan_oleh,
    dicatatOleh: {
      uid: row.disposisi_dicatat_oleh_id,
      nama: row.disposisi_dicatat_oleh_nama
    },
    tanggal: row.disposisi_tanggal,
    catatan: row.disposisi_catatan
  },
  aksesBidang: [],
  tindakLanjut: {},
  dibuatPada: row.dibuat_pada,
  diubahPada: row.diubah_pada
});

const lampirkanRelasi = async (rows) => {
  if (!rows.length) return rows;
  const ids = rows.map((row) => row.id);
  const [akses, tindakLanjut] = await Promise.all([
    query(
      'SELECT surat_masuk_id, bidang_kode FROM surat_masuk_akses_bidang WHERE surat_masuk_id IN (?)',
      [ids]
    ),
    query(
      `SELECT surat_masuk_id, bidang_kode, status, tanggal, catatan
         FROM surat_masuk_tindak_lanjut WHERE surat_masuk_id IN (?)`,
      [ids]
    )
  ]);

  const petaAkses = new Map();
  akses.forEach((item) => {
    if (!petaAkses.has(item.surat_masuk_id)) petaAkses.set(item.surat_masuk_id, []);
    petaAkses.get(item.surat_masuk_id).push(item.bidang_kode);
  });

  const petaTindak = new Map();
  tindakLanjut.forEach((item) => {
    if (!petaTindak.has(item.surat_masuk_id)) petaTindak.set(item.surat_masuk_id, {});
    petaTindak.get(item.surat_masuk_id)[item.bidang_kode] = {
      status: item.status,
      tanggal: item.tanggal,
      catatan: item.catatan
    };
  });

  rows.forEach((row) => {
    row.aksesBidang = petaAkses.get(row.id) || [];
    row.disposisi.kepada = [...row.aksesBidang];
    row.tindakLanjut = petaTindak.get(row.id) || {};
  });
  return rows;
};

export const cariSuratMasuk = async (id) => {
  const row = await one('SELECT * FROM surat_masuk WHERE id = ?', [id]);
  if (!row) return null;
  const [hasil] = await lampirkanRelasi([petaMasuk(row)]);
  return hasil;
};

export const daftarSuratMasuk = async ({
  where = [],
  limit = null,
  field = 'dibuatPada',
  arah = 'desc'
} = {}) => {
  const filter = terjemahWhere(where, PETA_WHERE);
  const urut = kolomUrut(field, PETA_URUT, 'dibuatPada');
  const sql = `SELECT surat_masuk.* FROM surat_masuk ${filter.sql} ORDER BY ${urut} ${arahUrut(arah)} LIMIT ?`;
  const rows = await query(sql, [...filter.params, batasLimit(limit, 2000)]);
  return lampirkanRelasi(rows.map(petaMasuk));
};

export const daftarSuratMasukTerurut = daftarSuratMasuk;

export const hitungSuratMasuk = async (where = []) => {
  const filter = terjemahWhere(where, PETA_WHERE);
  const row = await one(`SELECT COUNT(*) AS jumlah FROM surat_masuk ${filter.sql}`, filter.params);
  return Number(row?.jumlah || 0);
};

const simpanAkses = async (koneksi, id, daftar) => {
  await koneksi.query('DELETE FROM surat_masuk_akses_bidang WHERE surat_masuk_id = ?', [id]);
  const unik = [...new Set((daftar || []).map((kode) => String(kode || '').trim()).filter(Boolean))];
  for (const kode of unik) {
    await koneksi.query(
      'INSERT INTO surat_masuk_akses_bidang (surat_masuk_id, bidang_kode) VALUES (?, ?)',
      [id, kode]
    );
  }
};

const tulisTindakLanjut = async (koneksi, id, peta) => {
  for (const [kode, isi] of Object.entries(peta || {})) {
    await koneksi.query(
      `INSERT INTO surat_masuk_tindak_lanjut
         (surat_masuk_id, bidang_kode, status, tanggal, catatan)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), tanggal = VALUES(tanggal), catatan = VALUES(catatan)`,
      [id, kode, isi?.status === 'Sudah' ? 'Sudah' : 'Belum', isi?.tanggal || null, isi?.catatan || '']
    );
  }
};

export const buatSuratMasuk = async (payload, { uid, nama }) => {
  const tanggalTerima = payload.tglTerima instanceof Date ? payload.tglTerima : new Date(payload.tglTerima);
  const tahun = tahunJakarta(tanggalTerima);
  const namaCounter = `agendaMasuk_${tahun}`;

  const id = await withTransaction(async (koneksi) => {
    const [counter] = await koneksi.query('SELECT last_value FROM counters WHERE name = ? FOR UPDATE', [
      namaCounter
    ]);
    let berikutnya;
    if (counter.length) {
      berikutnya = Number(counter[0].last_value) + 1;
      await koneksi.query('UPDATE counters SET last_value = ? WHERE name = ?', [berikutnya, namaCounter]);
    } else {
      berikutnya = 1;
      await koneksi.query('INSERT INTO counters (name, last_value) VALUES (?, 1)', [namaCounter]);
    }

    const [hasil] = await koneksi.query(
      `INSERT INTO surat_masuk
         (no_agenda, tgl_terima, tgl_surat, no_surat, asal, hal, isi_ringkas, sifat,
          file_id, file_url, status, dibuat_oleh_id, dibuat_oleh_nama, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Baru', ?, ?, NOW(3))`,
      [
        `${tahun}/${String(berikutnya).padStart(3, '0')}`,
        tanggalTerima,
        payload.tglSurat,
        payload.noSurat,
        payload.asal,
        payload.hal,
        payload.isiRingkas,
        payload.sifat,
        String(payload.fileId || ''),
        String(payload.fileUrl || ''),
        uid || null,
        nama || ''
      ]
    );
    await simpanAkses(koneksi, hasil.insertId, payload.aksesBidang);
    return hasil.insertId;
  });

  return cariSuratMasuk(id);
};

export const ubahSuratMasuk = async (id, data) => {
  await withTransaction(async (koneksi) => {
    const bagian = [];
    const params = [];
    for (const [kunci, kolom] of Object.entries(KOLOM)) {
      if (data[kunci] === undefined) continue;
      bagian.push(`${kolom} = ?`);
      params.push(data[kunci]);
    }
    if (data.disposisi) {
      const d = data.disposisi;
      bagian.push(
        'disposisi_diputuskan_oleh = ?',
        'disposisi_dicatat_oleh_id = ?',
        'disposisi_dicatat_oleh_nama = ?',
        'disposisi_tanggal = ?',
        'disposisi_catatan = ?'
      );
      params.push(
        d.diputuskanOleh || '',
        d.dicatatOleh?.uid || null,
        d.dicatatOleh?.nama || '',
        d.tanggal || null,
        d.catatan || ''
      );
    }
    bagian.push('diubah_pada = NOW(3)');
    params.push(id);
    await koneksi.query(`UPDATE surat_masuk SET ${bagian.join(', ')} WHERE id = ?`, params);

    if (data.aksesBidang !== undefined) await simpanAkses(koneksi, id, data.aksesBidang);
    if (data.tindakLanjut !== undefined) await tulisTindakLanjut(koneksi, id, data.tindakLanjut);
  });
  return cariSuratMasuk(id);
};

export const simpanDisposisi = (id, data) => ubahSuratMasuk(id, data);

export const simpanTindakLanjut = (id, data) => ubahSuratMasuk(id, data);

export const setBerkasSuratMasuk = (id, { fileId, fileUrl = '' }) =>
  ubahSuratMasuk(id, { fileId: String(fileId || ''), fileUrl: String(fileUrl || '') });
