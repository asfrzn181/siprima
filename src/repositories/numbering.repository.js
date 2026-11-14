import { one, query, withTransaction, galatSementara } from '../config/db.js';
import { STATUS_NOMOR } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';
import {
  bagianTanggal,
  tanggalDalamRentang,
  tanggalMurni,
  tahunTanggal
} from '../utils/tanggal.js';
import {
  MENU_NOMOR,
  bolehPakaiUlangNomor,
  defaultFormatMenu,
  monthRoman,
  normalizeGolongan,
  renderNomor
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

export const MENU_VALID = Object.freeze(Object.values(MENU_NOMOR));

export const normalisasiMenu = (menu, bawaan = MENU_NOMOR.SURAT_KELUAR) => {
  const nilai = String(menu || '')
    .trim()
    .toUpperCase();
  return MENU_VALID.includes(nilai) ? nilai : bawaan;
};

export const golonganMenu = (menu) => {
  if (menu === MENU_NOMOR.SK) return 'SK';
  if (menu === MENU_NOMOR.SE) return 'SE';
  return 'LAINNYA';
};

export const petaNomor = (row) => ({
  id: row.id,
  seq: row.seq,
  seq_suffix: row.seq_suffix,
  menu: row.menu || MENU_NOMOR.SURAT_KELUAR,
  klasifikasi: row.klasifikasi,
  golongan: row.golongan,
  unit: row.unit,
  kode_bidang: row.kode_bidang,
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
  return master;
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
    reservationMinutes: Math.max(1, Number(pengaturan.reservationMinutes || 15))
  };
};

export const siapkanKonteks = async ({ menu, jenisId, bidangKode }) => {
  const menuFinal = normalisasiMenu(menu);
  if (menuFinal !== MENU_NOMOR.SE && !jenisId) {
    throw new AppError(400, 'JENIS_WAJIB', 'Jenis nomor wajib dipilih.');
  }
  const master = menuFinal === MENU_NOMOR.SE ? null : await ambilMaster(jenisId);
  const bidang = menuFinal === MENU_NOMOR.SURAT_KELUAR ? await ambilBidang(bidangKode) : null;
  return { menu: menuFinal, master, bidangKode: bidang ? bidang.kode : null, bidang };
};

export const bangunNomor = ({ menu, master, bidangKode, seq, date }) => {
  const bagian = bagianTanggal(date) || { year: 0, month: 0, day: 0 };
  const golongan = golonganMenu(menu);
  const kode = master ? String(master.kode || '') : '';
  return {
    seq: Number(seq),
    seq_suffix: null,
    menu,
    klasifikasi: kode,
    golongan,
    unit: bidangKode || 'BKPSDMD',
    kode_bidang: bidangKode || null,
    bulan: bagian.month,
    bulan_romawi: monthRoman(bagian.month),
    tahun: bagian.year,
    scope_key: menu,
    full_number: renderNomor(defaultFormatMenu(menu), {
      KODE: kode,
      GOLONGAN: golongan,
      URUT: seq,
      UNIT: bidangKode || 'BKPSDMD',
      BIDANG: bidangKode || '',
      TAHUN: bagian.year,
      BULAN: String(bagian.month).padStart(2, '0'),
      BULAN_ROMAWI: monthRoman(bagian.month)
    })
  };
};

export const bolehPakaiUlang = (menu, row, tahun, tanggalAcuan, batasBawah = null, batasAtas = null) =>
  bolehPakaiUlangNomor({
    menu,
    status: row.status,
    voidedAt: row.voided_at,
    letterDate: row.letter_date,
    tahunNomor: row.tahun,
    tahunAcuan: tahun,
    tanggalAcuan,
    batasBawah,
    batasAtas
  });

const nomorAktif = (row) => row && row.status !== STATUS_NOMOR.VOID && Boolean(row.letter_date);

// Tetangga aktif terdekat: nomor VOID tidak dihitung sebagai pembatas.
const tetanggaAktif = (peta, maks, seq) => {
  let sebelum = null;
  for (let i = seq - 1; i >= 1; i -= 1) {
    const row = peta.get(i);
    if (nomorAktif(row)) {
      sebelum = row;
      break;
    }
  }
  let sesudah = null;
  for (let i = seq + 1; i <= maks; i += 1) {
    const row = peta.get(i);
    if (nomorAktif(row)) {
      sesudah = row;
      break;
    }
  }
  return { sebelum, sesudah };
};

const kumpulkanTersedia = async ({ menu, tahun, tanggalAcuan, koneksi = null }) => {
  const sql = `SELECT id, seq, status, letter_date, voided_at, tahun
               FROM letter_numbers WHERE menu = ? AND tahun = ?
               ORDER BY seq ASC`;
  const rows = koneksi
    ? (await koneksi.query(sql, [menu, tahun]))[0]
    : await query(sql, [menu, tahun]);
  const peta = new Map(rows.map((row) => [Number(row.seq), row]));
  const maks = rows.reduce((hasil, row) => Math.max(hasil, Number(row.seq)), 0);
  const menuFinal = normalisasiMenu(menu);
  const acuan = tanggalMurni(tanggalAcuan);
  const tersedia = [];

  for (let seq = 1; seq <= maks; seq += 1) {
    const row = peta.get(seq);
    const { sebelum, sesudah } = tetanggaAktif(peta, maks, seq);
    const batasBawah = sebelum ? sebelum.letter_date : null;
    const batasAtas = sesudah ? sesudah.letter_date : null;

    if (!row) {
      if (menuFinal !== MENU_NOMOR.SURAT_KELUAR) {
        // SK/SE: nomor bolong selalu tersedia dalam tahun yang sama.
        tersedia.push({ seq, sumber: 'BOLONG', row: null });
        continue;
      }
      // Nomor bolong hanya tersedia di antara tanggal tetangga aktifnya.
      if (tanggalDalamRentang(acuan, batasBawah, batasAtas)) {
        tersedia.push({ seq, sumber: 'BOLONG', row: null });
      }
      continue;
    }
    if (bolehPakaiUlang(menuFinal, row, tahun, acuan, batasBawah, batasAtas)) {
      tersedia.push({ seq, sumber: 'BATAL', row });
    }
  }

  // Nomor baru (maks + 1) hanya boleh bila Tanggal Surat tidak mendahului
  // tanggal nomor aktif dengan urutan tertinggi. Aturan kronologis ini khusus
  // Surat Keluar; SK/SE bebas memakai nomor baru dalam tahun yang sama.
  const aktifTerakhir = [...peta.values()]
    .filter(nomorAktif)
    .sort((a, b) => Number(b.seq) - Number(a.seq))[0];
  const batasBaru = aktifTerakhir ? tanggalMurni(aktifTerakhir.letter_date) : null;
  const bolehBaru =
    menuFinal !== MENU_NOMOR.SURAT_KELUAR ||
    !batasBaru ||
    (acuan !== null && acuan >= batasBaru);

  return { tersedia, maks, rows, bolehBaru, batasBaru };
};

const pilihSeq = (tersedia, maks, bolehBaru) => {
  if (tersedia.length) return tersedia[0];
  if (bolehBaru) return { seq: maks + 1, sumber: 'BARU', row: null };
  return null;
};

const ambilNomor = async (id) => {
  const row = await one('SELECT * FROM letter_numbers WHERE id = ?', [id]);
  return row ? petaNomor(row) : null;
};

const tulisIdempotensi = async (koneksi, idemKey, letterId) => {
  if (!idemKey) return;
  await koneksi.query(
    `INSERT INTO letter_idempotency (idem_key, letter_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE letter_id = letter_id`,
    [idemKey, letterId]
  );
};

// Pastikan baris counter sudah ada SEBELUM transaksi alokasi dimulai. Dengan
// begitu transaksi hanya perlu SELECT ... FOR UPDATE pada baris yang sudah ada,
// sehingga tidak ada balapan INSERT yang memicu deadlock.
export const pastikanCounter = async (tahun, menu) => {
  const menuFinal = normalisasiMenu(menu);
  for (let percobaan = 0; ; percobaan += 1) {
    try {
      await query(
        `INSERT IGNORE INTO letter_counters (tahun, scope, scope_key, last_seq)
         VALUES (?, 'GLOBAL_PER_TAHUN', ?, 0)`,
        [Number(tahun), menuFinal]
      );
      return;
    } catch (error) {
      if (percobaan >= 4 || !galatSementara(error)) throw error;
      await new Promise((selesai) => setTimeout(selesai, 20 * (percobaan + 1)));
    }
  }
};

/**
 * Mengalokasikan nomor di dalam transaksi yang sudah berjalan.
 * Dipakai oleh Surat Keluar (reservasi) dan SK/SE (langsung terbit).
 */
export const alokasikanDalamTransaksi = async (
  koneksi,
  {
    menu,
    master,
    bidangKode,
    tanggal,
    aktor,
    metadata = {},
    status = STATUS_NOMOR.RESERVED,
    idempotencyKey = '',
    reservationIdLama = null,
    reservationMinutes = 15
  }
) => {
  const menuFinal = normalisasiMenu(menu);
  const tanggalSurat = tanggalMurni(tanggal);
  const bagian = bagianTanggal(tanggalSurat);
  if (!bagian) {
    throw new AppError(400, 'TANGGAL_TIDAK_VALID', 'Tanggal surat tidak valid.');
  }
  const idemKey = String(idempotencyKey || '').slice(0, 200);

  if (idemKey) {
    const [idem] = await koneksi.query(
      'SELECT letter_id FROM letter_idempotency WHERE idem_key = ? FOR UPDATE',
      [idemKey]
    );
    if (idem.length) {
      return { id: idem[0].letter_id, nomor: null, reuse: false, existing: true };
    }
  }

  const [counterRows] = await koneksi.query(
    'SELECT last_seq FROM letter_counters WHERE tahun = ? AND scope_key = ? FOR UPDATE',
    [bagian.year, menuFinal]
  );
  if (!counterRows.length) {
    // Jaring pengaman bila pemanggil lupa menyiapkan counter sebelum transaksi.
    await koneksi.query(
      `INSERT INTO letter_counters (tahun, scope, scope_key, last_seq)
       VALUES (?, 'GLOBAL_PER_TAHUN', ?, 0)`,
      [bagian.year, menuFinal]
    );
  }

  let auditHead = await bacaAuditHead(koneksi);
  const aktorData = dataAktor(aktor);

  // Reservasi lama dilepas lebih dulu agar nomornya kembali tersedia dan bisa
  // dipakai ulang pada hari yang sama (mis. saat pengguna mengganti jenis nomor).
  if (reservationIdLama) {
    const [lamaReservasi] = await koneksi.query(
      'SELECT * FROM letter_numbers WHERE id = ? FOR UPDATE',
      [Number(reservationIdLama)]
    );
    if (lamaReservasi.length && lamaReservasi[0].status === STATUS_NOMOR.RESERVED) {
      const lama = lamaReservasi[0];
      const versiLama = Number(lama.row_version || 1) + 1;
      await koneksi.query(
        `UPDATE letter_numbers
            SET status = 'VOID', voided_at = UTC_TIMESTAMP(3), voided_by_id = ?, voided_by_nama = ?,
                void_reason = ?, row_version = ?
          WHERE id = ?`,
        [
          aktorData.uid,
          aktorData.nama,
          'Reservasi diganti karena parameter nomor berubah',
          versiLama,
          Number(lama.id)
        ]
      );
      auditHead = await tulisAuditDalamTransaksi(koneksi, {
        letterId: Number(lama.id),
        action: 'VOID',
        actor: aktor,
        before: petaNomor(lama),
        after: {
          ...petaNomor(lama),
          status: STATUS_NOMOR.VOID,
          voided_at: new Date(),
          voided_by: { uid: aktorData.uid, nama: aktorData.nama },
          void_reason: 'Reservasi diganti karena parameter nomor berubah',
          row_version: versiLama
        },
        previousHash: auditHead
      });
    }
  }

  const { tersedia, maks, bolehBaru } = await kumpulkanTersedia({
    koneksi,
    menu: menuFinal,
    tahun: bagian.year,
    tanggalAcuan: tanggalSurat
  });
  const pilihan = pilihSeq(tersedia, maks, bolehBaru);
  if (!pilihan) {
    throw new AppError(
      409,
      'NOMOR_TIDAK_TERSEDIA',
      'Tidak ada nomor yang tersedia untuk Tanggal Surat ini karena tanggalnya lebih awal dari nomor terakhir yang terbit.'
    );
  }
  const nomor = bangunNomor({
    menu: menuFinal,
    master,
    bidangKode,
    seq: pilihan.seq,
    date: tanggalSurat
  });

  const kedaluwarsa = new Date(Date.now() + Math.max(1, reservationMinutes) * 60000);
  const terbit = status === STATUS_NOMOR.ISSUED;
  let letterId;
  let aksi;
  let before = null;

  if (pilihan.row) {
    const [lamaRows] = await koneksi.query('SELECT * FROM letter_numbers WHERE id = ? FOR UPDATE', [
      Number(pilihan.row.id)
    ]);
    if (!lamaRows.length) {
      throw new AppError(409, 'NOMOR_TIDAK_DITEMUKAN', 'Nomor yang akan dipakai ulang tidak ditemukan.');
    }
    before = petaNomor(lamaRows[0]);
    await koneksi.query(
      `UPDATE letter_numbers
          SET klasifikasi = ?, golongan = ?, unit = ?, kode_bidang = ?, bulan = ?,
              bulan_romawi = ?, tahun = ?, scope_key = ?, full_number = ?, jenis_id = ?,
              status = ?, letter_date = ?, perihal = ?, tujuan = ?,
              created_by_id = ?, created_by_nama = ?, created_by_role = ?,
              letter_id = NULL, issued_at = ?, reservation_expires_at = ?, idempotency_key = ?,
              reused_at = UTC_TIMESTAMP(3), reused_by_id = ?, reused_by_nama = ?,
              reuse_count = reuse_count + 1, reuse_reason = ?,
              row_version = row_version + 1
        WHERE id = ?`,
      [
        nomor.klasifikasi,
        nomor.golongan,
        nomor.unit,
        nomor.kode_bidang,
        nomor.bulan,
        nomor.bulan_romawi,
        nomor.tahun,
        nomor.scope_key,
        nomor.full_number,
        master ? master.id : null,
        status,
        tanggalSurat,
        metadata.perihal || '',
        metadata.tujuan || '',
        aktorData.uid,
        aktorData.nama,
        aktorData.role,
        terbit ? new Date() : null,
        kedaluwarsa,
        idemKey,
        aktorData.uid,
        aktorData.nama,
        metadata.reuseReason || 'Nomor batal digunakan kembali otomatis',
        Number(pilihan.row.id)
      ]
    );
    letterId = Number(pilihan.row.id);
    aksi = 'REUSE_VOID';
  } else {
    const [hasil] = await koneksi.query(
      `INSERT INTO letter_numbers
         (seq, seq_suffix, menu, klasifikasi, golongan, unit, kode_bidang, bulan, bulan_romawi,
          tahun, scope_key, full_number, jenis_id, status, letter_date, perihal, tujuan,
          created_by_id, created_by_nama, created_by_role, issued_at, reservation_expires_at,
          idempotency_key, row_version)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        nomor.seq,
        nomor.menu,
        nomor.klasifikasi,
        nomor.golongan,
        nomor.unit,
        nomor.kode_bidang,
        nomor.bulan,
        nomor.bulan_romawi,
        nomor.tahun,
        nomor.scope_key,
        nomor.full_number,
        master ? master.id : null,
        status,
        tanggalSurat,
        metadata.perihal || '',
        metadata.tujuan || '',
        aktorData.uid,
        aktorData.nama,
        aktorData.role,
        terbit ? new Date() : null,
        kedaluwarsa,
        idemKey
      ]
    );
    letterId = hasil.insertId;
    aksi = terbit ? 'ISSUE' : 'RESERVE';
  }

  await koneksi.query(
    `UPDATE letter_counters
        SET last_seq = GREATEST(last_seq, ?), updated_at = UTC_TIMESTAMP(3)
      WHERE tahun = ? AND scope_key = ?`,
    [nomor.seq, bagian.year, menuFinal]
  );
  await tulisIdempotensi(koneksi, idemKey, letterId);

  const after = {
    id: letterId,
    ...nomor,
    jenisId: master ? master.id : null,
    status,
    letter_date: tanggalSurat,
    perihal: metadata.perihal || '',
    tujuan: metadata.tujuan || '',
    created_by: aktorData,
    reservation_expires_at: kedaluwarsa,
    idempotency_key: idemKey,
    row_version: before ? Number(before.row_version || 1) + 1 : 1,
    ...(pilihan.row
      ? {
          reused_at: new Date(),
          reused_by: { uid: aktorData.uid, nama: aktorData.nama },
          reuse_count: Number(before?.reuse_count || 0) + 1,
          reuse_reason: metadata.reuseReason || 'Nomor batal digunakan kembali otomatis'
        }
      : {})
  };
  await tulisAuditDalamTransaksi(koneksi, {
    letterId,
    action: aksi,
    actor: aktor,
    before,
    after,
    previousHash: auditHead
  });

  return {
    id: letterId,
    nomor,
    reuse: Boolean(pilihan.row),
    existing: false,
    rowVersion: after.row_version
  };
};

export const reservasiNomor = async ({
  menu = MENU_NOMOR.SURAT_KELUAR,
  jenisId,
  bidangKode,
  tanggal,
  aktor,
  idempotencyKey,
  metadata = {},
  reservationIdLama = null
}) => {
  const konteks = await siapkanKonteks({ menu, jenisId, bidangKode });
  const tanggalSurat = tanggalMurni(tanggal);
  if (!tanggalSurat) throw new AppError(400, 'TANGGAL_TIDAK_VALID', 'Tanggal surat tidak valid.');
  const pengaturan = await ambilPengaturanNomor();
  const idemKey = String(
    idempotencyKey || `${aktor.uid}_${konteks.menu}_${tanggalSurat}`
  ).slice(0, 200);
  await pastikanCounter(tahunTanggal(tanggalSurat), konteks.menu);

  const hasil = await withTransaction((koneksi) =>
    alokasikanDalamTransaksi(koneksi, {
      menu: konteks.menu,
      master: konteks.master,
      bidangKode: konteks.bidangKode,
      tanggal: tanggalSurat,
      aktor,
      metadata,
      status: STATUS_NOMOR.RESERVED,
      idempotencyKey: idemKey,
      reservationIdLama,
      reservationMinutes: pengaturan.reservationMinutes
    })
  );

  return ambilNomor(hasil.id);
};

export const tersediaNomor = async ({
  menu = MENU_NOMOR.SURAT_KELUAR,
  jenisId,
  bidangKode,
  tanggal
}) => {
  const konteks = await siapkanKonteks({ menu, jenisId, bidangKode });
  const tanggalSurat = tanggalMurni(tanggal);
  if (!tanggalSurat) throw new AppError(400, 'TANGGAL_TIDAK_VALID', 'Tanggal surat tidak valid.');
  const bagian = bagianTanggal(tanggalSurat);
  const { tersedia, maks, bolehBaru } = await kumpulkanTersedia({
    menu: konteks.menu,
    tahun: bagian.year,
    tanggalAcuan: tanggalSurat
  });
  const items = tersedia.map((item) => ({
    seq: item.seq,
    sumber: item.sumber,
    nomor: bangunNomor({
      menu: konteks.menu,
      master: konteks.master,
      bidangKode: konteks.bidangKode,
      seq: item.seq,
      date: tanggalSurat
    }).full_number
  }));
  const seqBaru = maks + 1;
  const nomorBerikutnya = bolehBaru
    ? bangunNomor({
        menu: konteks.menu,
        master: konteks.master,
        bidangKode: konteks.bidangKode,
        seq: seqBaru,
        date: tanggalSurat
      }).full_number
    : '';
  return {
    menu: konteks.menu,
    tahun: bagian.year,
    items,
    berikutnya: bolehBaru ? seqBaru : null,
    nomorBerikutnya,
    kecilTersedia: items.length ? items[0].seq : bolehBaru ? seqBaru : null
  };
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
    if (payload.jenisId && Number(payload.jenisId) !== Number(before.jenis_id)) {
      throw new AppError(
        409,
        'RESERVASI_TIDAK_COCOK',
        'Jenis nomor berubah sejak nomor dibuat. Generate ulang nomor.'
      );
    }
    if (payload.bidangPembuat && String(payload.bidangPembuat) !== String(before.unit)) {
      throw new AppError(
        409,
        'RESERVASI_TIDAK_COCOK',
        'Bidang pembuat berubah sejak nomor dibuat. Generate ulang nomor.'
      );
    }
    const tahunReservasi = tahunTanggal(before.letter_date);
    const tahunPayload = tahunTanggal(payload.tglSurat);
    if (!tahunPayload || tahunReservasi !== tahunPayload) {
      throw new AppError(
        409,
        'RESERVASI_TIDAK_COCOK',
        'Tahun surat berubah sejak nomor dibuat. Generate ulang nomor.'
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, 'Aktif', '', 0, ?, ?, UTC_TIMESTAMP(3))`,
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
              issued_at = UTC_TIMESTAMP(3), row_version = ?
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

/**
 * Terbitkan surat keluar langsung tanpa reservasi.
 *
 * Nomor resmi dialokasikan di dalam transaksi yang sama dengan penyimpanan
 * surat. Server selalu memilih nomor terkecil yang tersedia saat Simpan,
 * sehingga pratinjau di klien tidak pernah mengikat nomor.
 */
export const buatSuratKeluarBernomor = async ({ jenisId, bidangKode, tanggal, payload, aktor }) => {
  const konteks = await siapkanKonteks({
    menu: MENU_NOMOR.SURAT_KELUAR,
    jenisId,
    bidangKode
  });
  const tanggalSurat = tanggalMurni(tanggal);
  if (!tanggalSurat) throw new AppError(400, 'TANGGAL_TIDAK_VALID', 'Tanggal surat tidak valid.');
  await pastikanCounter(tahunTanggal(tanggalSurat), konteks.menu);

  return withTransaction(async (koneksi) => {
    const alokasi = await alokasikanDalamTransaksi(koneksi, {
      menu: konteks.menu,
      master: konteks.master,
      bidangKode: konteks.bidangKode,
      tanggal: tanggalSurat,
      aktor,
      metadata: { perihal: payload.hal || '', tujuan: payload.tujuan || '' },
      status: STATUS_NOMOR.ISSUED
    });

    const aktorData = dataAktor(aktor);
    const akses =
      payload.sifat === 'rahasia'
        ? [...new Set([...(payload.aksesBidang || []), konteks.bidangKode].filter(Boolean))]
        : [];
    const versi = Number(alokasi.rowVersion || 1);

    const [hasil] = await koneksi.query(
      `INSERT INTO surat_keluar
         (no_surat, jenis_id, golongan, tgl_surat, tujuan, hal, isi_ringkas, sifat, tanda_tangan,
          file_id, file_url, bidang_pembuat_kode, dibuat_oleh_id, dibuat_oleh_nama,
          status, alasan_batal, dikirim_ke_luar, letter_number_id, letter_row_version, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, ?, 'Aktif', '', 0, ?, ?, UTC_TIMESTAMP(3))`,
      [
        alokasi.nomor.full_number,
        konteks.master ? konteks.master.id : null,
        normalizeGolongan(alokasi.nomor.golongan),
        tanggalSurat,
        payload.tujuan,
        payload.hal,
        payload.isiRingkas,
        payload.sifat,
        payload.tandaTangan || 'BASAH',
        konteks.bidangKode,
        aktorData.uid,
        aktorData.nama,
        alokasi.id,
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
          SET letter_id = ?, perihal = ?, tujuan = ?, letter_date = ?
        WHERE id = ?`,
      [suratId, payload.hal, payload.tujuan, tanggalSurat, alokasi.id]
    );

    const [surat] = await koneksi.query('SELECT * FROM surat_keluar WHERE id = ?', [suratId]);
    return { ...petaKeluar(surat[0]), aksesBidang: akses, letterNumberId: alokasi.id };
  });
};

export { reservasiNomor as reserveLetterNumber, terbitkanNomor as issueLetterNumber };
