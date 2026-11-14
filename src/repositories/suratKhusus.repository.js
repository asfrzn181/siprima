import { one, query, withTransaction } from '../config/db.js';
import { STATUS_NOMOR } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';
import { keTanggal, bagianJakarta } from '../utils/tanggal.js';
import {
  alokasikanDalamTransaksi,
  bangunNomor,
  pastikanCounter,
  siapkanKonteks
} from './numbering.repository.js';
import { voidNomor } from './numberingLanjutan.repository.js';

const JENIS_VALID = new Set(['SK', 'SE']);

const pastikanJenis = (jenis) => {
  const nilai = String(jenis || '').toUpperCase();
  if (!JENIS_VALID.has(nilai)) throw new Error(`Jenis surat khusus tidak dikenal: ${jenis}`);
  return nilai;
};

const peta = (row) => ({
  id: row.id,
  jenis: row.jenis,
  jenisId: row.jenis_id,
  tentang: row.tentang,
  nomor: row.nomor,
  letterNumberId: row.letter_number_id,
  tanggal: row.tanggal,
  keterangan: row.keterangan,
  status: row.status,
  alasanBatal: row.alasan_batal,
  dibatalkanPada: row.dibatalkan_pada,
  dibatalkanOleh: row.dibatalkan_oleh_id
    ? { uid: row.dibatalkan_oleh_id, nama: row.dibatalkan_oleh_nama }
    : null,
  dibuatOleh: { uid: row.dibuat_oleh_id, nama: row.dibuat_oleh_nama },
  dibuatPada: row.dibuat_pada,
  diubahPada: row.diubah_pada
});

const filterDaftar = (jenis, { search = '', status = '', bidang = '' } = {}) => {
  const kunci = String(search || '').trim();
  const pola = `%${kunci}%`;
  const params = [pastikanJenis(jenis)];
  let filter = 'jenis = ?';
  if (kunci) {
    filter += ' AND (tentang LIKE ? OR nomor LIKE ? OR keterangan LIKE ?)';
    params.push(pola, pola, pola);
  }
  if (status) {
    filter += ' AND status = ?';
    params.push(String(status));
  }
  if (bidang) {
    filter += ' AND letter_number_id IN (SELECT id FROM letter_numbers WHERE kode_bidang = ?)';
    params.push(String(bidang));
  }
  return { filter, params };
};

export const daftarSuratKhusus = async (
  jenis,
  { search = '', status = '', bidang = '', limit = 20, offset = 0 } = {}
) => {
  const { filter, params } = filterDaftar(jenis, { search, status, bidang });
  const rows = await query(
    `SELECT * FROM surat_khusus WHERE ${filter}
      ORDER BY tanggal DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return rows.map(peta);
};

export const hitungSuratKhusus = async (jenis, { search = '', status = '', bidang = '' } = {}) => {
  const { filter, params } = filterDaftar(jenis, { search, status, bidang });
  const row = await one(`SELECT COUNT(*) AS jumlah FROM surat_khusus WHERE ${filter}`, params);
  return Number(row?.jumlah || 0);
};

export const bidangSuratKhusus = async (letterNumberId) => {
  if (!letterNumberId) return '';
  const row = await one('SELECT kode_bidang FROM letter_numbers WHERE id = ?', [letterNumberId]);
  return row?.kode_bidang || '';
};

export const cariSuratKhusus = async (jenis, id) => {
  const row = await one('SELECT * FROM surat_khusus WHERE id = ? AND jenis = ?', [
    Number(id),
    pastikanJenis(jenis)
  ]);
  return row ? peta(row) : null;
};

export const buatSuratKhusus = async (jenis, data, aktor = {}) => {
  const menu = pastikanJenis(jenis);
  const konteks = await siapkanKonteks({ menu, jenisId: data.jenisId, bidangKode: null });
  const tanggal = keTanggal(data.tanggal);
  if (!tanggal) throw new AppError(400, 'TANGGAL_TIDAK_VALID', `Tanggal ${menu} tidak valid.`);
  await pastikanCounter(bagianJakarta(tanggal).year, menu);

  const id = await withTransaction(async (koneksi) => {
    const alokasi = await alokasikanDalamTransaksi(koneksi, {
      menu,
      master: konteks.master,
      bidangKode: null,
      tanggal,
      aktor,
      metadata: { perihal: data.tentang || '' },
      status: STATUS_NOMOR.ISSUED
    });
    const [hasil] = await koneksi.query(
      `INSERT INTO surat_khusus
         (jenis, jenis_id, tentang, nomor, letter_number_id, tanggal, keterangan,
          status, dibuat_oleh_id, dibuat_oleh_nama, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Aktif', ?, ?, UTC_TIMESTAMP(3))`,
      [
        menu,
        konteks.master ? konteks.master.id : null,
        data.tentang,
        alokasi.nomor.full_number,
        alokasi.id,
        tanggal,
        String(data.keterangan || ''),
        aktor.uid || null,
        aktor.nama || ''
      ]
    );
    return hasil.insertId;
  });
  return cariSuratKhusus(menu, id);
};

export const ubahSuratKhusus = async (jenis, id, data) => {
  const menu = pastikanJenis(jenis);
  const lama = await cariSuratKhusus(menu, id);
  if (!lama) throw new AppError(404, 'TIDAK_DITEMUKAN', `Surat ${menu} tidak ditemukan.`);
  if (lama.status === 'Dibatalkan') {
    throw new AppError(409, 'SURAT_DIBATALKAN', `Surat ${menu} yang dibatalkan tidak dapat diubah.`);
  }

  const gantiJenis =
    menu === 'SK' && data.jenisId && Number(data.jenisId) !== Number(lama.jenisId) && lama.letterNumberId;
  const konteks = gantiJenis
    ? await siapkanKonteks({ menu, jenisId: data.jenisId, bidangKode: null })
    : null;
  const tanggal = data.tanggal ? keTanggal(data.tanggal) : null;
  if (tanggal && lama.tanggal && bagianJakarta(tanggal).year !== bagianJakarta(lama.tanggal).year) {
    throw new AppError(
      409,
      'TAHUN_TIDAK_DAPAT_DIUBAH',
      `Tahun ${menu} tidak dapat diubah karena nomor sudah terbit. Buat ${menu} baru untuk tahun tersebut.`
    );
  }

  await withTransaction(async (koneksi) => {
    await koneksi.query('SELECT id FROM surat_khusus WHERE id = ? FOR UPDATE', [Number(id)]);

    if (gantiJenis) {
      const [rows] = await koneksi.query('SELECT * FROM letter_numbers WHERE id = ? FOR UPDATE', [
        Number(lama.letterNumberId)
      ]);
      if (!rows.length) {
        throw new AppError(409, 'NOMOR_TIDAK_DITEMUKAN', 'Register nomor surat tidak ditemukan.');
      }
      const register = rows[0];
      const nomor = bangunNomor({
        menu,
        master: konteks.master,
        bidangKode: null,
        seq: register.seq,
        date: register.letter_date
      });
      await koneksi.query(
        `UPDATE letter_numbers
            SET klasifikasi = ?, full_number = ?, jenis_id = ?, row_version = row_version + 1
          WHERE id = ?`,
        [nomor.klasifikasi, nomor.full_number, konteks.master.id, register.id]
      );
      await koneksi.query(
        'UPDATE surat_khusus SET nomor = ?, jenis_id = ? WHERE id = ?',
        [nomor.full_number, konteks.master.id, Number(id)]
      );
    }

    await koneksi.query(
      `UPDATE surat_khusus
          SET tentang = ?, tanggal = ?, keterangan = ?, jenis_id = COALESCE(?, jenis_id),
              diubah_pada = UTC_TIMESTAMP(3)
        WHERE id = ? AND jenis = ?`,
      [
        data.tentang,
        tanggal || data.tanggal,
        String(data.keterangan || ''),
        data.jenisId ? Number(data.jenisId) : null,
        Number(id),
        menu
      ]
    );
    if (tanggal && lama.letterNumberId) {
      await koneksi.query('UPDATE letter_numbers SET letter_date = ? WHERE id = ?', [
        tanggal,
        lama.letterNumberId
      ]);
    }
  });
  return cariSuratKhusus(menu, id);
};

export const batalkanSuratKhusus = async (jenis, id, alasan, aktor = {}) => {
  const menu = pastikanJenis(jenis);
  const lama = await cariSuratKhusus(menu, id);
  if (!lama) throw new AppError(404, 'TIDAK_DITEMUKAN', `Surat ${menu} tidak ditemukan.`);
  if (lama.status === 'Dibatalkan') {
    throw new AppError(409, 'SURAT_DIBATALKAN', `Surat ${menu} sudah dibatalkan.`);
  }
  if (!lama.letterNumberId) {
    await query(
      `UPDATE surat_khusus
          SET status = 'Dibatalkan', alasan_batal = ?, dibatalkan_pada = UTC_TIMESTAMP(3),
              dibatalkan_oleh_id = ?, dibatalkan_oleh_nama = ?, diubah_pada = UTC_TIMESTAMP(3)
        WHERE id = ?`,
      [String(alasan).trim(), aktor.uid || null, aktor.nama || '', Number(id)]
    );
    return cariSuratKhusus(menu, id);
  }
  await voidNomor({ letterNumberId: lama.letterNumberId, reason: alasan, aktor });
  return cariSuratKhusus(menu, id);
};
