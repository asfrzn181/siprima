export const KOLEKSI = Object.freeze({
  USERS: 'users',
  MASTER_BIDANG: 'masterBidang',
  MASTER_NOMOR: 'masterNomor',
  PENGATURAN: 'pengaturan',
  SURAT_MASUK: 'suratMasuk',
  SURAT_KELUAR: 'suratKeluar',
  COUNTERS: 'counters',
  AUDIT_LOG: 'auditLog',
  LETTER_COUNTERS: 'letter_counters',
  LETTER_NUMBERS: 'letter_numbers',
  LETTER_NUMBER_INDEX: 'letter_number_index',
  LETTER_IDEMPOTENCY: 'letter_idempotency',
  LETTER_AUDIT_LOG: 'letter_audit_log',
  LETTER_AUDIT_HEADS: 'letter_audit_heads'
});

export const PERAN = Object.freeze({
  ADMIN: 'admin',
  OPERATOR: 'operator',
  PIMPINAN: 'pimpinan',
  BIDANG: 'bidang'
});

export const IZIN = Object.freeze({
  SURAT_MASUK_BACA: 'surat_masuk.baca',
  SURAT_MASUK_TULIS: 'surat_masuk.tulis',
  SURAT_MASUK_HAPUS: 'surat_masuk.hapus',
  SURAT_MASUK_CETAK: 'surat_masuk.cetak',
  SURAT_MASUK_DISPOSISI: 'surat_masuk.disposisi',
  SURAT_MASUK_TINDAK_LANJUT: 'surat_masuk.tindak_lanjut',
  SURAT_KELUAR_BACA: 'surat_keluar.baca',
  SURAT_KELUAR_TULIS: 'surat_keluar.tulis',
  SURAT_KELUAR_HAPUS: 'surat_keluar.hapus',
  SURAT_KELUAR_CETAK: 'surat_keluar.cetak',
  SURAT_KELUAR_BATAL: 'surat_keluar.batal',
  SURAT_KELUAR_KIRIM: 'surat_keluar.kirim',
  SURAT_KELUAR_KOREKSI: 'surat_keluar.koreksi',
  SURAT_KELUAR_PAKAI_ULANG: 'surat_keluar.pakai_ulang',
  SK_BACA: 'sk.lihat',
  SK_TULIS: 'sk.tulis',
  SK_HAPUS: 'sk.hapus',
  SK_CETAK: 'sk.cetak',
  SE_BACA: 'se.lihat',
  SE_TULIS: 'se.tulis',
  SE_HAPUS: 'se.hapus',
  SE_CETAK: 'se.cetak',
  DASHBOARD_BACA: 'dashboard.baca',
  LAPORAN_BACA: 'laporan.baca',
  USERS_KELOLA: 'users.kelola',
  MASTER_BACA: 'master.baca',
  MASTER_KELOLA: 'master.kelola',
  PENGATURAN_BACA: 'pengaturan.baca',
  PENGATURAN_KELOLA: 'pengaturan.kelola',
  AUDIT_BACA: 'audit.baca',
  NOMOR_VERIFIKASI: 'nomor.verifikasi',
  SANDI_UBAH: 'sandi.ubah',
  MENU_KELOLA: 'menu.kelola'
});

export const IZIN_LABEL = Object.freeze({
  [IZIN.SURAT_MASUK_BACA]: 'Lihat surat masuk',
  [IZIN.SURAT_MASUK_TULIS]: 'Tambah/ubah surat masuk',
  [IZIN.SURAT_MASUK_HAPUS]: 'Hapus surat masuk',
  [IZIN.SURAT_MASUK_CETAK]: 'Cetak/ekspor surat masuk',
  [IZIN.SURAT_MASUK_DISPOSISI]: 'Catat disposisi',
  [IZIN.SURAT_MASUK_TINDAK_LANJUT]: 'Isi tindak lanjut',
  [IZIN.SURAT_KELUAR_BACA]: 'Lihat surat keluar',
  [IZIN.SURAT_KELUAR_TULIS]: 'Tambah/ubah surat keluar',
  [IZIN.SURAT_KELUAR_HAPUS]: 'Hapus surat keluar',
  [IZIN.SURAT_KELUAR_CETAK]: 'Cetak/ekspor surat keluar',
  [IZIN.SURAT_KELUAR_BATAL]: 'Batalkan surat keluar',
  [IZIN.SURAT_KELUAR_KIRIM]: 'Ubah status pengiriman',
  [IZIN.SURAT_KELUAR_KOREKSI]: 'Koreksi nomor surat keluar',
  [IZIN.SURAT_KELUAR_PAKAI_ULANG]: 'Pakai ulang nomor VOID',
  [IZIN.SK_BACA]: 'Lihat SK',
  [IZIN.SK_TULIS]: 'Tambah/ubah SK',
  [IZIN.SK_HAPUS]: 'Hapus SK',
  [IZIN.SK_CETAK]: 'Cetak/ekspor SK',
  [IZIN.SE_BACA]: 'Lihat SE',
  [IZIN.SE_TULIS]: 'Tambah/ubah SE',
  [IZIN.SE_HAPUS]: 'Hapus SE',
  [IZIN.SE_CETAK]: 'Cetak/ekspor SE',
  [IZIN.DASHBOARD_BACA]: 'Lihat dashboard',
  [IZIN.LAPORAN_BACA]: 'Lihat laporan',
  [IZIN.USERS_KELOLA]: 'Kelola pengguna',
  [IZIN.MASTER_BACA]: 'Baca master',
  [IZIN.MASTER_KELOLA]: 'Kelola master',
  [IZIN.PENGATURAN_BACA]: 'Baca pengaturan',
  [IZIN.PENGATURAN_KELOLA]: 'Kelola pengaturan',
  [IZIN.AUDIT_BACA]: 'Lihat audit log',
  [IZIN.NOMOR_VERIFIKASI]: 'Verifikasi urutan nomor',
  [IZIN.SANDI_UBAH]: 'Ubah kata sandi sendiri',
  [IZIN.MENU_KELOLA]: 'Kelola menu navigasi'
});

export const IZIN_PER_PERAN = Object.freeze({
  admin: Object.freeze(Object.values(IZIN)),
  operator: Object.freeze([
    IZIN.SURAT_MASUK_BACA,
    IZIN.SURAT_MASUK_TULIS,
    IZIN.SURAT_MASUK_CETAK,
    IZIN.SURAT_KELUAR_BACA,
    IZIN.SURAT_KELUAR_TULIS,
    IZIN.SURAT_KELUAR_CETAK,
    IZIN.SK_BACA,
    IZIN.SK_TULIS,
    IZIN.SK_CETAK,
    IZIN.SE_BACA,
    IZIN.SE_TULIS,
    IZIN.SE_CETAK,
    IZIN.DASHBOARD_BACA,
    IZIN.LAPORAN_BACA,
    IZIN.MASTER_BACA,
    IZIN.SANDI_UBAH
  ]),
  pimpinan: Object.freeze([
    IZIN.SURAT_MASUK_BACA,
    IZIN.SURAT_MASUK_CETAK,
    IZIN.SURAT_KELUAR_BACA,
    IZIN.SURAT_KELUAR_CETAK,
    IZIN.SK_BACA,
    IZIN.SK_CETAK,
    IZIN.SE_BACA,
    IZIN.SE_CETAK,
    IZIN.DASHBOARD_BACA,
    IZIN.LAPORAN_BACA,
    IZIN.MASTER_BACA,
    IZIN.PENGATURAN_BACA,
    IZIN.AUDIT_BACA,
    IZIN.NOMOR_VERIFIKASI,
    IZIN.SANDI_UBAH
  ]),
  bidang: Object.freeze([
    IZIN.SURAT_MASUK_BACA,
    IZIN.SURAT_MASUK_TINDAK_LANJUT,
    IZIN.SURAT_KELUAR_BACA,
    IZIN.SURAT_KELUAR_TULIS,
    IZIN.SURAT_KELUAR_CETAK,
    IZIN.MASTER_BACA,
    IZIN.PENGATURAN_BACA,
    IZIN.SANDI_UBAH
  ])
});

export const SEMUA_PERAN = Object.freeze(Object.values(PERAN));
export const PERAN_PENGELOLA = Object.freeze([PERAN.ADMIN, PERAN.PIMPINAN]);
export const PERAN_OPERATOR = Object.freeze([PERAN.ADMIN, PERAN.BIDANG]);

export const STATUS_MASUK = Object.freeze({
  BARU: 'Baru',
  DIDISPOSISIKAN: 'Didisposisikan',
  SELESAI: 'Selesai'
});

export const STATUS_KELUAR = Object.freeze({
  AKTIF: 'Aktif',
  DIBATALKAN: 'Dibatalkan'
});

export const STATUS_NOMOR = Object.freeze({
  RESERVED: 'RESERVED',
  ISSUED: 'ISSUED',
  VOID: 'VOID'
});

export const SIFAT = Object.freeze({
  BIASA: 'biasa',
  RAHASIA: 'rahasia'
});

export const TANDA_TANGAN = Object.freeze(['TTE', 'BASAH']);
export const GOLONGAN = Object.freeze(['SK', 'SE', 'LAINNYA']);
export const DEFAULT_GOLONGAN = 'LAINNYA';
export const SCOPE_NOMOR = Object.freeze({
  GLOBAL_PER_TAHUN: 'GLOBAL_PER_TAHUN',
  PER_KLASIFIKASI: 'PER_KLASIFIKASI'
});

export const JENIS_SURAT = Object.freeze({
  MASUK: 'masuk',
  KELUAR: 'keluar'
});

export const AKSI_AUDIT = Object.freeze({
  TAMBAH_SURAT_MASUK: 'tambah surat masuk',
  UBAH_SURAT_MASUK: 'ubah surat masuk',
  DISPOSISI: 'ubah disposisi',
  TINDAK_LANJUT: 'tindak lanjut',
  TAMBAH_SURAT_KELUAR: 'tambah surat keluar',
  UBAH_SURAT_KELUAR: 'ubah surat keluar',
  BATAL_SURAT_KELUAR: 'batalkan surat keluar',
  KIRIM_SURAT_KELUAR: 'ubah status pengiriman',
  KOREKSI_SURAT_KELUAR: 'koreksi nomor surat keluar',
  TAMBAH_SK: 'tambah SK',
  UBAH_SK: 'ubah SK',
  HAPUS_SK: 'hapus SK',
  BATAL_SK: 'batalkan SK',
  TAMBAH_SE: 'tambah SE',
  UBAH_SE: 'ubah SE',
  HAPUS_SE: 'hapus SE',
  BATAL_SE: 'batalkan SE',
  TAMBAH_USER: 'tambah pengguna',
  UBAH_USER: 'ubah pengguna',
  UBAH_MASTER_BIDANG: 'ubah master bidang',
  UBAH_MASTER_NOMOR: 'ubah master nomor',
  UBAH_MASTER_ASAL_TUJUAN: 'ubah master asal & tujuan',
  UBAH_PERAN: 'ubah hak akses peran',
  UBAH_PENGATURAN: 'ubah pengaturan',
  UBAH_MENU: 'ubah menu navigasi',
  UBAH_SANDI: 'ubah kata sandi'
});

export const MIME_IZIN = Object.freeze(['application/pdf', 'image/jpeg', 'image/png']);
export const EKSTENSI_MIME = Object.freeze({
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png'
});

export const PAGINATION = Object.freeze({
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MAX_SCAN: 2000,
  MAX_EXPORT: 5000
});
