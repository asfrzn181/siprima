import { query, withTransaction } from '../config/db.js';
import { STATUS_NOMOR } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';
import { tanggalMurni, tahunTanggal } from '../utils/tanggal.js';
import { bolehPakaiUlangNomor, normalizeGolongan } from '../utils/nomor.js';
import { bacaAuditHead, tulisAuditDalamTransaksi } from './numberingAudit.repository.js';
import { petaNomor } from './numbering.repository.js';
import { petaKeluar } from './suratKeluar.repository.js';

const dataAktor = (aktor = {}) => ({
  uid: aktor.uid || null,
  nama: aktor.nama || aktor.email || '',
  role: aktor.profile?.role || aktor.role || ''
});

export const voidNomor = async ({ letterNumberId, reason, aktor, replacedById = null, suratId = null }) => {
  const alasan = String(reason || '').trim();
  if (!alasan) {
    throw new AppError(400, 'ALASAN_WAJIB', 'Keterangan pembatalan wajib diisi.');
  }
  return withTransaction(async (koneksi) => {
    const [rows] = await koneksi.query('SELECT * FROM letter_numbers WHERE id = ? FOR UPDATE', [
      letterNumberId
    ]);
    if (!rows.length) {
      throw new AppError(404, 'NOMOR_TIDAK_DITEMUKAN', 'Nomor surat tidak ditemukan.');
    }
    const before = rows[0];
    if (![STATUS_NOMOR.RESERVED, STATUS_NOMOR.ISSUED].includes(before.status)) {
      throw new AppError(409, 'NOMOR_SUDAH_DIBATALKAN', 'Nomor sudah dibatalkan.');
    }

    const menu = before.menu || 'SURAT_KELUAR';
    const suratTertaut = suratId || (menu === 'SURAT_KELUAR' ? before.letter_id : null);
    let suratRow = null;
    if (suratTertaut) {
      const [surat] = await koneksi.query('SELECT * FROM surat_keluar WHERE id = ? FOR UPDATE', [
        suratTertaut
      ]);
      suratRow = surat[0] || null;
    }

    const auditHead = await bacaAuditHead(koneksi);
    const aktorData = dataAktor(aktor);
    const pengganti = replacedById || before.replaced_by_id || null;
    const versi = Number(before.row_version || 1) + 1;

    await koneksi.query(
      `UPDATE letter_numbers
          SET status = 'VOID', voided_at = UTC_TIMESTAMP(3), voided_by_id = ?, voided_by_nama = ?,
              void_reason = ?, replaced_by_id = ?, row_version = ?
        WHERE id = ?`,
      [aktorData.uid, aktorData.nama, alasan, pengganti, versi, letterNumberId]
    );
    if (menu !== 'SURAT_KELUAR') {
      await koneksi.query(
        `UPDATE surat_khusus
            SET status = 'Dibatalkan', alasan_batal = ?, dibatalkan_pada = UTC_TIMESTAMP(3),
                dibatalkan_oleh_id = ?, dibatalkan_oleh_nama = ?, diubah_pada = UTC_TIMESTAMP(3)
          WHERE letter_number_id = ? AND status = 'Aktif'`,
        [alasan, aktorData.uid, aktorData.nama, letterNumberId]
      );
    }
    if (suratRow) {
      await koneksi.query(
        `UPDATE surat_keluar
            SET status = 'Dibatalkan', alasan_batal = ?, letter_row_version = ?, diubah_pada = UTC_TIMESTAMP(3)
          WHERE id = ?`,
        [alasan, versi, suratRow.id]
      );
    }

    const after = {
      ...petaNomor(before),
      status: STATUS_NOMOR.VOID,
      voided_at: new Date(),
      voided_by: { uid: aktorData.uid, nama: aktorData.nama },
      void_reason: alasan,
      replaced_by_id: pengganti,
      row_version: versi
    };
    await tulisAuditDalamTransaksi(koneksi, {
      letterId: letterNumberId,
      action: 'VOID',
      actor: aktor,
      before: petaNomor(before),
      after,
      previousHash: auditHead
    });
    return after;
  });
};

export const gunakanUlangNomor = async ({ letterNumberId, payload, aktor }) =>
  withTransaction(async (koneksi) => {
    const [rows] = await koneksi.query('SELECT * FROM letter_numbers WHERE id = ? FOR UPDATE', [
      letterNumberId
    ]);
    if (!rows.length) {
      throw new AppError(404, 'NOMOR_TIDAK_DITEMUKAN', 'Register nomor tidak ditemukan.');
    }
    const before = rows[0];
    if ((before.menu || 'SURAT_KELUAR') !== 'SURAT_KELUAR') {
      throw new AppError(409, 'MENU_TIDAK_DIDUKUNG', 'Pemakaian ulang manual hanya untuk surat keluar.');
    }
    if (before.status !== STATUS_NOMOR.VOID) {
      throw new AppError(409, 'NOMOR_BUKAN_VOID', 'Hanya nomor VOID yang dapat digunakan kembali.');
    }

    const tanggal = tanggalMurni(payload.tglSurat);
    const tanggalTerbit = tanggalMurni(before.letter_date);
    if (!tanggal || !tanggalTerbit) {
      throw new AppError(400, 'TANGGAL_TIDAK_VALID', 'Tanggal surat tidak valid.');
    }
    const tahunNomor = Number(before.tahun);
    if (tahunTanggal(tanggal) !== tahunNomor) {
      throw new AppError(
        400,
        'TAHUN_TIDAK_SAMA',
        'Nomor hanya dapat dipakai ulang pada tahun yang sama dengan nomor tersebut.'
      );
    }

    // Pembanding adalah Tanggal Surat yang diinput, bukan tanggal sistem atau
    // tanggal pembatalan. Nomor VOID hanya boleh dipakai pada rentang tanggal
    // yang masih kronologis terhadap tetangga aktifnya.
    const [bawahRows] = await koneksi.query(
      `SELECT letter_date FROM letter_numbers
        WHERE menu = 'SURAT_KELUAR' AND tahun = ? AND status <> 'VOID'
          AND seq < ? AND letter_date IS NOT NULL
        ORDER BY seq DESC LIMIT 1`,
      [tahunNomor, Number(before.seq)]
    );
    const [atasRows] = await koneksi.query(
      `SELECT letter_date FROM letter_numbers
        WHERE menu = 'SURAT_KELUAR' AND tahun = ? AND status <> 'VOID'
          AND seq > ? AND letter_date IS NOT NULL
        ORDER BY seq ASC LIMIT 1`,
      [tahunNomor, Number(before.seq)]
    );
    const boleh = bolehPakaiUlangNomor({
      menu: 'SURAT_KELUAR',
      status: before.status,
      voidedAt: before.voided_at,
      letterDate: before.letter_date,
      tahunNomor,
      tahunAcuan: tahunNomor,
      tanggalAcuan: tanggal,
      batasBawah: bawahRows[0]?.letter_date || null,
      batasAtas: atasRows[0]?.letter_date || null
    });
    if (!boleh) {
      throw new AppError(
        400,
        'TANGGAL_TIDAK_SESUAI',
        'Nomor hanya dapat dipakai pada rentang tanggal yang masih kronologis terhadap nomor sebelum dan sesudahnya.'
      );
    }

    let suratRow = null;
    if (before.letter_id) {
      const [surat] = await koneksi.query('SELECT * FROM surat_keluar WHERE id = ? FOR UPDATE', [
        before.letter_id
      ]);
      suratRow = surat[0] || null;
      if (!suratRow) {
        throw new AppError(409, 'SURAT_TIDAK_DITEMUKAN', 'Surat terkait nomor VOID tidak ditemukan.');
      }
      if (suratRow.dikirim_ke_luar === 1) {
        throw new AppError(
          409,
          'SURAT_SUDAH_DIKIRIM',
          'Nomor tidak dapat digunakan kembali karena surat sudah dikirim ke pihak luar.'
        );
      }
    }

    const auditHead = await bacaAuditHead(koneksi);
    const aktorData = dataAktor(aktor);
    const versiBaru = Number(before.row_version || 1) + 1;
    const akses =
      payload.sifat === 'rahasia' ? [...new Set([...(payload.aksesBidang || []), before.unit])] : [];

    await koneksi.query(
      `UPDATE letter_numbers
          SET status = 'ISSUED', letter_id = ?, letter_date = ?, perihal = ?, tujuan = ?,
              issued_at = UTC_TIMESTAMP(3), reused_at = UTC_TIMESTAMP(3), reused_by_id = ?, reused_by_nama = ?,
              reuse_count = reuse_count + 1, reuse_reason = ?, row_version = ?
        WHERE id = ?`,
      [
        before.letter_id,
        tanggal,
        payload.hal,
        payload.tujuan,
        aktorData.uid,
        aktorData.nama,
        'Nomor VOID digunakan kembali oleh admin pada tanggal yang sama',
        versiBaru,
        letterNumberId
      ]
    );

    let suratId;
    if (suratRow) {
      suratId = suratRow.id;
      await koneksi.query(
        `UPDATE surat_keluar
            SET no_surat = ?, jenis_id = ?, golongan = ?, tgl_surat = ?, tujuan = ?, hal = ?,
                isi_ringkas = ?, sifat = ?, tanda_tangan = ?, file_url = ?, bidang_pembuat_kode = ?,
                status = 'Aktif', alasan_batal = '', dikirim_ke_luar = 0,
                letter_number_id = ?, letter_row_version = ?, diubah_pada = UTC_TIMESTAMP(3)
          WHERE id = ?`,
        [
          before.full_number,
          before.jenis_id,
          normalizeGolongan(before.golongan),
          tanggal,
          payload.tujuan,
          payload.hal,
          payload.isiRingkas,
          payload.sifat,
          payload.tandaTangan || 'BASAH',
          String(payload.fileUrl || suratRow.file_url || '').trim(),
          before.unit,
          letterNumberId,
          versiBaru,
          suratId
        ]
      );
      await koneksi.query('DELETE FROM surat_keluar_akses_bidang WHERE surat_keluar_id = ?', [suratId]);
    } else {
      const [hasil] = await koneksi.query(
        `INSERT INTO surat_keluar
           (no_surat, jenis_id, golongan, tgl_surat, tujuan, hal, isi_ringkas, sifat, tanda_tangan,
            file_id, file_url, bidang_pembuat_kode, dibuat_oleh_id, dibuat_oleh_nama,
            status, alasan_batal, dikirim_ke_luar, letter_number_id, letter_row_version, dibuat_pada)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, 'Aktif', '', 0, ?, ?, UTC_TIMESTAMP(3))`,
        [
          before.full_number,
          before.jenis_id,
          normalizeGolongan(before.golongan),
          tanggal,
          payload.tujuan,
          payload.hal,
          payload.isiRingkas,
          payload.sifat,
          payload.tandaTangan || 'BASAH',
          String(payload.fileUrl || '').trim(),
          before.unit,
          aktorData.uid,
          aktorData.nama,
          letterNumberId,
          versiBaru
        ]
      );
      suratId = hasil.insertId;
      await koneksi.query('UPDATE letter_numbers SET letter_id = ? WHERE id = ?', [suratId, letterNumberId]);
    }

    for (const kode of akses) {
      await koneksi.query(
        'INSERT INTO surat_keluar_akses_bidang (surat_keluar_id, bidang_kode) VALUES (?, ?)',
        [suratId, kode]
      );
    }

    const after = {
      ...petaNomor(before),
      status: STATUS_NOMOR.ISSUED,
      letter_id: suratId,
      letter_date: tanggal,
      perihal: payload.hal,
      tujuan: payload.tujuan,
      issued_at: new Date(),
      reused_at: new Date(),
      reused_by: { uid: aktorData.uid, nama: aktorData.nama },
      reuse_count: Number(before.reuse_count || 0) + 1,
      row_version: versiBaru
    };
    await tulisAuditDalamTransaksi(koneksi, {
      letterId: letterNumberId,
      action: 'REUSE_VOID',
      actor: aktor,
      before: petaNomor(before),
      after,
      previousHash: auditHead
    });

    const [surat] = await koneksi.query('SELECT * FROM surat_keluar WHERE id = ?', [suratId]);
    return { ...petaKeluar(surat[0]), aksesBidang: akses };
  });

export const perbaruiMetadataNomor = async ({
  letterNumberId,
  changes,
  aktor,
  expectedVersion,
  suratId = null
}) =>
  withTransaction(async (koneksi) => {
    const [rows] = await koneksi.query('SELECT * FROM letter_numbers WHERE id = ? FOR UPDATE', [
      letterNumberId
    ]);
    if (!rows.length) {
      throw new AppError(404, 'NOMOR_TIDAK_DITEMUKAN', 'Register nomor tidak ditemukan.');
    }
    const before = rows[0];
    if (Number(before.row_version || 1) !== Number(expectedVersion)) {
      throw new AppError(409, 'VERSI_BERUBAH', 'Data sudah berubah. Muat ulang sebelum menyimpan.');
    }
    if (
      changes.letter_date &&
      before.letter_date &&
      tahunTanggal(changes.letter_date) !== tahunTanggal(before.letter_date)
    ) {
      throw new AppError(
        409,
        'TAHUN_TIDAK_DAPAT_DIUBAH',
        'Tahun surat tidak dapat diubah karena nomor sudah terbit. Buat surat baru untuk tahun tersebut.'
      );
    }

    const suratTertaut = suratId || before.letter_id;
    let suratRow = null;
    if (suratTertaut) {
      const [surat] = await koneksi.query('SELECT * FROM surat_keluar WHERE id = ? FOR UPDATE', [
        suratTertaut
      ]);
      suratRow = surat[0] || null;
    }

    const auditHead = await bacaAuditHead(koneksi);
    const versi = Number(before.row_version || 1) + 1;
    const perihal = changes.perihal ?? before.perihal;
    const tujuan = changes.tujuan ?? before.tujuan;
    const letterDate = changes.letter_date ?? before.letter_date;

    await koneksi.query(
      `UPDATE letter_numbers
          SET perihal = ?, tujuan = ?, letter_date = ?, row_version = ?
        WHERE id = ?`,
      [perihal, tujuan, letterDate, versi, letterNumberId]
    );
    if (suratRow) {
      await koneksi.query(
        `UPDATE surat_keluar
            SET tujuan = ?, hal = ?, tgl_surat = ?, letter_row_version = ?, diubah_pada = UTC_TIMESTAMP(3)
          WHERE id = ?`,
        [tujuan, perihal, letterDate, versi, suratRow.id]
      );
    }

    const after = { ...petaNomor(before), perihal, tujuan, letter_date: letterDate, row_version: versi };
    await tulisAuditDalamTransaksi(koneksi, {
      letterId: letterNumberId,
      action: 'EDIT_METADATA',
      actor: aktor,
      before: petaNomor(before),
      after,
      previousHash: auditHead
    });
    return after;
  });

export { voidNomor as voidLetterNumber, gunakanUlangNomor as reuseVoidedLetterNumber };

export const kedaluwarsakanReservasi = async (aktor) => {
  const rows = await query(
    `SELECT id FROM letter_numbers
      WHERE status = 'RESERVED' AND reservation_expires_at <= UTC_TIMESTAMP(3)
      ORDER BY reservation_expires_at ASC LIMIT 100`
  );
  const hasil = [];
  for (const item of rows) {
    hasil.push(
      await voidNomor({
        letterNumberId: item.id,
        reason: 'Reservasi kedaluwarsa otomatis',
        aktor
      })
    );
  }
  return hasil;
};
