import { one, withTransaction } from '../config/db.js';
import { SCOPE_NOMOR, STATUS_NOMOR } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';
import { bagianJakarta, keTanggal } from '../utils/tanggal.js';
import {
  normalizeFormatGolongan,
  normalizeGolongan,
  monthRoman,
  renderNomor,
  scopeKeyFor
} from '../utils/nomor.js';
import { cariBidangByKode, cariNomor } from './master.repository.js';
import { ambilPengaturan } from './settings.repository.js';
import { bacaAuditHead, tulisAuditDalamTransaksi } from './numberingAudit.repository.js';
import { petaKeluar } from './suratKeluar.repository.js';

const dataAktor = (aktor = {}) => ({
  uid: aktor.uid || null,
  nama: aktor.nama || aktor.email || '',
  role: aktor.profile?.role || aktor.role || ''
});

export const petaNomor = (row) => ({
  id: row.id,
  seq: row.seq,
  seq_suffix: row.seq_suffix,
  klasifikasi: row.klasifikasi,
  golongan: row.golongan,
  unit: row.unit,
  bulan: row.bulan,
  bulan_romawi: row.bulan_romawi,
  tahun: row.tahun,
  scope_key: row.scope_key,
  full_number: row.full_number,
  jenisId: row.jenis_id,
  status: row.status,
  letter_date: row.letter_date,
  perihal: row.perihal,
  tujuan: row.tujuan,
  created_by: {
    uid: row.created_by_id,
    nama: row.created_by_nama,
    role: row.created_by_role
  },
  letter_id: row.letter_id,
  issued_at: row.issued_at,
  voided_at: row.voided_at,
  voided_by: row.voided_by_id ? { uid: row.voided_by_id, nama: row.voided_by_nama } : null,
  void_reason: row.void_reason,
  replaced_by_id: row.replaced_by_id,
  replacement_of_id: row.replacement_of_id,
  reservation_expires_at: row.reservation_expires_at,
  idempotency_key: row.idempotency_key,
  reused_at: row.reused_at,
  reused_by: row.reused_by_id ? { uid: row.reused_by_id, nama: row.reused_by_nama } : null,
  reuse_count: row.reuse_count,
  reuse_reason: row.reuse_reason,
  row_version: row.row_version,
  created_at: row.created_at,
  updated_at: row.updated_at
});

const ambilMaster = async (jenisId) => {
  const master = await cariNomor(Number(jenisId));
  if (!master || master.aktif !== true) {
    throw new AppError(400, 'MASTER_NOMOR_TIDAK_AKTIF', 'Jenis nomor surat tidak aktif.');
  }
  const golongan = normalizeGolongan(master.golongan);
  return {
    ...master,
    golongan,
    format: normalizeFormatGolongan(master.format, golongan)
  };
};

const ambilBidang = async (kode) => {
  const bidang = await cariBidangByKode(String(kode || '').trim());
  if (!bidang || bidang.aktif !== true) {
    throw new AppError(
      400,
      'BIDANG_TIDAK_AKTIF',
      `Bidang dengan kode ${kode} belum terdaftar atau tidak aktif.`
    );
  }
  return bidang;
};

const ambilPengaturanNomor = async () => {
  const pengaturan = await ambilPengaturan();
  return {
    scope:
      pengaturan.numberingScope === SCOPE_NOMOR.PER_KLASIFIKASI
        ? SCOPE_NOMOR.PER_KLASIFIKASI
        : SCOPE_NOMOR.GLOBAL_PER_TAHUN,
    reservationMinutes: Math.max(1, Number(pengaturan.reservationMinutes || 15))
  };
};

const bangunNomor = ({ master, unit, seq, seqSuffix = null, date, scopeKey }) => {
  const bagian = bagianJakarta(date);
  const golongan = normalizeGolongan(master.golongan);
  return {
    seq: Number(seq),
    seq_suffix: seqSuffix === null || seqSuffix === undefined ? null : String(seqSuffix),
    klasifikasi: String(master.kode || ''),
    golongan,
    unit: String(unit),
    bulan: bagian.month,
    bulan_romawi: monthRoman(bagian.month),
    tahun: bagian.year,
    scope_key: scopeKey,
    full_number: renderNomor(master.format, {
      KODE: master.kode,
      GOLONGAN: golongan,
      URUT: seq,
      URUT_SUFFIX: seqSuffix ? `.${seqSuffix}` : '',
      UNIT: unit,
      TAHUN: bagian.year,
      BULAN: String(bagian.month).padStart(2, '0'),
      BULAN_ROMAWI: monthRoman(bagian.month),
      BIDANG: unit
    })
  };
};

const ambilNomor = async (id) => {
  const row = await one('SELECT * FROM letter_numbers WHERE id = ?', [id]);
  return row ? petaNomor(row) : null;
};

export const reservasiNomor = async ({
  jenisId,
  bidangKode,
  tanggal,
  aktor,
  idempotencyKey,
  metadata = {}
}) => {
  const [master, bidang, pengaturan] = await Promise.all([
    ambilMaster(jenisId),
    ambilBidang(bidangKode),
    ambilPengaturanNomor()
  ]);
  const tanggalSurat = keTanggal(tanggal);
  if (!tanggalSurat) throw new AppError(400, 'TANGGAL_TIDAK_VALID', 'Tanggal surat tidak valid.');
  const bagian = bagianJakarta(tanggalSurat);
  const scopeKey = scopeKeyFor({ golongan: master.golongan, kode: master.kode, scope: pengaturan.scope });
  const idemKey = String(
    idempotencyKey || `${aktor.uid}_${master.id}_${tanggalSurat.toISOString()}`
  ).slice(0, 200);

  const id = await withTransaction(async (koneksi) => {
    const [idem] = await koneksi.query(
      'SELECT letter_id FROM letter_idempotency WHERE idem_key = ? FOR UPDATE',
      [idemKey]
    );
    if (idem.length) {
      const [ada] = await koneksi.query('SELECT id FROM letter_numbers WHERE id = ?', [idem[0].letter_id]);
      if (!ada.length) {
        throw new AppError(409, 'IDEMPOTENSI_RUSAK', 'Kunci idempotensi menunjuk nomor yang tidak ada.');
      }
      return ada[0].id;
    }

    const [counter] = await koneksi.query(
      'SELECT last_seq FROM letter_counters WHERE tahun = ? AND scope_key = ? FOR UPDATE',
      [bagian.year, scopeKey]
    );
    let seq;
    if (counter.length) {
      seq = Number(counter[0].last_seq) + 1;
      await koneksi.query(
        'UPDATE letter_counters SET last_seq = ?, updated_at = NOW(3) WHERE tahun = ? AND scope_key = ?',
        [seq, bagian.year, scopeKey]
      );
    } else {
      seq = 1;
      await koneksi.query(
        `INSERT INTO letter_counters (tahun, scope, scope_key, last_seq)
         VALUES (?, ?, ?, 1)`,
        [bagian.year, pengaturan.scope, scopeKey]
      );
    }

    const nomor = bangunNomor({ master, unit: bidang.kode, seq, date: tanggalSurat, scopeKey });
    const [duplikat] = await koneksi.query('SELECT id FROM letter_numbers WHERE full_number = ?', [
      nomor.full_number
    ]);
    if (duplikat.length) {
      throw new AppError(409, 'NOMOR_DUPLIKAT', 'Nomor surat sudah terdaftar. Ulangi Generate Nomor.');
    }

    const auditHead = await bacaAuditHead(koneksi);
    const kedaluwarsa = new Date(Date.now() + pengaturan.reservationMinutes * 60000);
    const aktorData = dataAktor(aktor);

    const [hasil] = await koneksi.query(
      `INSERT INTO letter_numbers
         (seq, seq_suffix, klasifikasi, golongan, unit, bulan, bulan_romawi, tahun, scope_key,
          full_number, jenis_id, status, letter_date, perihal, tujuan,
          created_by_id, created_by_nama, created_by_role, reservation_expires_at,
          idempotency_key, row_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RESERVED', ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        nomor.seq,
        nomor.seq_suffix,
        nomor.klasifikasi,
        nomor.golongan,
        nomor.unit,
        nomor.bulan,
        nomor.bulan_romawi,
        nomor.tahun,
        nomor.scope_key,
        nomor.full_number,
        master.id,
        tanggalSurat,
        metadata.perihal || '',
        metadata.tujuan || '',
        aktorData.uid,
        aktorData.nama,
        aktorData.role,
        kedaluwarsa,
        idemKey
      ]
    );
    const letterId = hasil.insertId;
    await koneksi.query('INSERT INTO letter_idempotency (idem_key, letter_id) VALUES (?, ?)', [
      idemKey,
      letterId
    ]);

    const after = {
      id: letterId,
      ...nomor,
      jenisId: master.id,
      status: STATUS_NOMOR.RESERVED,
      letter_date: tanggalSurat,
      perihal: metadata.perihal || '',
      tujuan: metadata.tujuan || '',
      created_by: aktorData,
      reservation_expires_at: kedaluwarsa,
      idempotency_key: idemKey,
      row_version: 1
    };
    await tulisAuditDalamTransaksi(koneksi, {
      letterId,
      action: 'RESERVE',
      actor: aktor,
      before: null,
      after,
      previousHash: auditHead
    });
    return letterId;
  });

  return ambilNomor(id);
};

export const terbitkanNomor = async ({ reservationId, payload, aktor }) =>
  withTransaction(async (koneksi) => {
    const [rows] = await koneksi.query('SELECT * FROM letter_numbers WHERE id = ? FOR UPDATE', [
      reservationId
    ]);
    if (!rows.length) {
      throw new AppError(409, 'RESERVASI_TIDAK_ADA', 'Reservasi nomor tidak ditemukan.');
    }
    const before = rows[0];

    if (before.status === STATUS_NOMOR.ISSUED) {
      if (before.letter_id) {
        const [surat] = await koneksi.query('SELECT * FROM surat_keluar WHERE id = ?', [before.letter_id]);
        if (surat.length) return { ...petaKeluar(surat[0]), letterNumberId: before.id };
      }
      return petaNomor(before);
    }
    if (before.status !== STATUS_NOMOR.RESERVED) {
      throw new AppError(409, 'STATUS_NOMOR_TIDAK_VALID', 'Nomor tidak dapat diterbitkan dari status ini.');
    }
    if (before.reservation_expires_at && new Date(before.reservation_expires_at).getTime() < Date.now()) {
      throw new AppError(
        409,
        'RESERVASI_KEDALUWARSA',
        'Reservasi nomor sudah kedaluwarsa. Generate nomor baru.'
      );
    }

    const auditHead = await bacaAuditHead(koneksi);
    const aktorData = dataAktor(aktor);
    const akses =
      payload.sifat === 'rahasia' ? [...new Set([...(payload.aksesBidang || []), before.unit])] : [];
    const versi = Number(before.row_version || 1) + 1;

    const [hasil] = await koneksi.query(
      `INSERT INTO surat_keluar
         (no_surat, jenis_id, golongan, tgl_surat, tujuan, hal, isi_ringkas, sifat, tanda_tangan,
          file_id, file_url, bidang_pembuat_kode, dibuat_oleh_id, dibuat_oleh_nama,
          status, alasan_batal, dikirim_ke_luar, letter_number_id, letter_row_version, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, 'Aktif', '', 0, ?, ?, NOW(3))`,
      [
        before.full_number,
        Number(payload.jenisId) || before.jenis_id,
        normalizeGolongan(before.golongan),
        payload.tglSurat,
        payload.tujuan,
        payload.hal,
        payload.isiRingkas,
        payload.sifat,
        payload.tandaTangan || 'BASAH',
        String(payload.fileUrl || '').trim(),
        before.unit,
        aktorData.uid,
        aktorData.nama,
        before.id,
        versi
      ]
    );
    const suratId = hasil.insertId;
    for (const kode of akses) {
      await koneksi.query(
        'INSERT INTO surat_keluar_akses_bidang (surat_keluar_id, bidang_kode) VALUES (?, ?)',
        [suratId, kode]
      );
    }

    await koneksi.query(
      `UPDATE letter_numbers
          SET status = 'ISSUED', letter_id = ?, perihal = ?, tujuan = ?, letter_date = ?,
              issued_at = NOW(3), row_version = ?
        WHERE id = ?`,
      [suratId, payload.hal, payload.tujuan, payload.tglSurat, versi, before.id]
    );

    const after = {
      ...petaNomor(before),
      status: STATUS_NOMOR.ISSUED,
      letter_id: suratId,
      perihal: payload.hal,
      tujuan: payload.tujuan,
      letter_date: payload.tglSurat,
      issued_at: new Date(),
      row_version: versi
    };
    await tulisAuditDalamTransaksi(koneksi, {
      letterId: before.id,
      action: 'ISSUE',
      actor: aktor,
      before: petaNomor(before),
      after,
      previousHash: auditHead
    });

    const [surat] = await koneksi.query('SELECT * FROM surat_keluar WHERE id = ?', [suratId]);
    return { ...petaKeluar(surat[0]), aksesBidang: akses, letterNumberId: before.id };
  });

export { reservasiNomor as reserveLetterNumber, terbitkanNomor as issueLetterNumber };
