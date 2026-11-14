import { query, one, withTransaction } from '../config/db.js';
import { arahUrut, batasLimit, kolomUrut, terjemahWhere } from './helpers.js';

const PETA_WHERE = {
  status: 'surat_keluar.status',
  sifat: 'surat_keluar.sifat',
  tglSurat: 'surat_keluar.tgl_surat',
  dibuatPada: 'surat_keluar.dibuat_pada',
  noSurat: 'surat_keluar.no_surat',
  hal: 'surat_keluar.hal',
  tujuan: 'surat_keluar.tujuan',
  bidangPembuat: 'surat_keluar.bidang_pembuat_kode',
  aksesBidang: {
    tabel: 'surat_keluar_akses_bidang',
    fk: 'surat_keluar_id',
    kolom: 'bidang_kode',
    induk: 'surat_keluar.id'
  }
};

const PETA_URUT = {
  tglSurat: 'surat_keluar.tgl_surat',
  dibuatPada: 'surat_keluar.dibuat_pada',
  noSurat: 'surat_keluar.no_surat',
  hal: 'surat_keluar.hal',
  tujuan: 'surat_keluar.tujuan'
};

const KOLOM = {
  noSurat: 'no_surat',
  jenisId: 'jenis_id',
  golongan: 'golongan',
  tglSurat: 'tgl_surat',
  tujuan: 'tujuan',
  hal: 'hal',
  isiRingkas: 'isi_ringkas',
  sifat: 'sifat',
  tandaTangan: 'tanda_tangan',
  fileId: 'file_id',
  fileUrl: 'file_url',
  bidangPembuat: 'bidang_pembuat_kode',
  status: 'status',
  alasanBatal: 'alasan_batal',
  letterNumberId: 'letter_number_id',
  letterRowVersion: 'letter_row_version',
  dibuatPada: 'dibuat_pada',
  diubahPada: 'diubah_pada'
};

export const petaKeluar = (row) => ({
  id: row.id,
  noSurat: row.no_surat,
  jenisId: row.jenis_id,
  golongan: row.golongan,
  tglSurat: row.tgl_surat,
  tujuan: row.tujuan,
  hal: row.hal,
  isiRingkas: row.isi_ringkas,
  sifat: row.sifat,
  tandaTangan: row.tanda_tangan,
  fileId: row.file_id,
  fileUrl: row.file_url,
  bidangPembuat: row.bidang_pembuat_kode,
  dibuatOleh: { uid: row.dibuat_oleh_id, nama: row.dibuat_oleh_nama },
  status: row.status,
  alasanBatal: row.alasan_batal,
  aksesBidang: [],
  letterNumberId: row.letter_number_id,
  letterRowVersion: row.letter_row_version,
  dibuatPada: row.dibuat_pada,
  diubahPada: row.diubah_pada
});

export const lampirkanAksesKeluar = async (rows) => {
  if (!rows.length) return rows;
  const ids = rows.map((row) => row.id);
  const akses = await query(
    'SELECT surat_keluar_id, bidang_kode FROM surat_keluar_akses_bidang WHERE surat_keluar_id IN (?)',
    [ids]
  );
  const peta = new Map();
  akses.forEach((item) => {
    if (!peta.has(item.surat_keluar_id)) peta.set(item.surat_keluar_id, []);
    peta.get(item.surat_keluar_id).push(item.bidang_kode);
  });
  rows.forEach((row) => {
    row.aksesBidang = peta.get(row.id) || [];
  });
  return rows;
};

export const cariSuratKeluar = async (id) => {
  const row = await one('SELECT * FROM surat_keluar WHERE id = ?', [id]);
  if (!row) return null;
  const [hasil] = await lampirkanAksesKeluar([petaKeluar(row)]);
  return hasil;
};

export const daftarSuratKeluar = async ({
  where = [],
  limit = null,
  field = 'tglSurat',
  arah = 'desc'
} = {}) => {
  const filter = terjemahWhere(where, PETA_WHERE);
  const urut = kolomUrut(field, PETA_URUT, 'tglSurat');
  const sql = `SELECT surat_keluar.* FROM surat_keluar ${filter.sql} ORDER BY ${urut} ${arahUrut(arah)} LIMIT ?`;
  const rows = await query(sql, [...filter.params, batasLimit(limit, 2000)]);
  return lampirkanAksesKeluar(rows.map(petaKeluar));
};

export const hitungSuratKeluar = async (where = []) => {
  const filter = terjemahWhere(where, PETA_WHERE);
  const row = await one(`SELECT COUNT(*) AS jumlah FROM surat_keluar ${filter.sql}`, filter.params);
  return Number(row?.jumlah || 0);
};

const simpanAkses = async (koneksi, id, daftar) => {
  await koneksi.query('DELETE FROM surat_keluar_akses_bidang WHERE surat_keluar_id = ?', [id]);
  const unik = [...new Set((daftar || []).map((kode) => String(kode || '').trim()).filter(Boolean))];
  for (const kode of unik) {
    await koneksi.query(
      'INSERT INTO surat_keluar_akses_bidang (surat_keluar_id, bidang_kode) VALUES (?, ?)',
      [id, kode]
    );
  }
};

export const ubahSuratKeluar = async (id, data) => {
  await withTransaction(async (koneksi) => {
    const bagian = [];
    const params = [];
    for (const [kunci, kolom] of Object.entries(KOLOM)) {
      if (data[kunci] === undefined) continue;
      bagian.push(`${kolom} = ?`);
      params.push(data[kunci]);
    }
    bagian.push('diubah_pada = NOW(3)');
    params.push(id);
    await koneksi.query(`UPDATE surat_keluar SET ${bagian.join(', ')} WHERE id = ?`, params);
    if (data.aksesBidang !== undefined) await simpanAkses(koneksi, id, data.aksesBidang);
  });
  return cariSuratKeluar(id);
};

export const cariSuratKeluarByNomor = async (nomor) => {
  const row = await one('SELECT * FROM surat_keluar WHERE no_surat = ? LIMIT 1', [
    String(nomor || '').trim()
  ]);
  if (!row) return null;
  const [hasil] = await lampirkanAksesKeluar([petaKeluar(row)]);
  return hasil;
};

export const tandaiDibatalkan = (id, alasan, tambahan = {}) =>
  ubahSuratKeluar(id, { status: 'Dibatalkan', alasanBatal: String(alasan || ''), ...tambahan });
