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
  PIMPINAN: 'pimpinan',
  BIDANG: 'bidang'
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
  TAMBAH_USER: 'tambah pengguna',
  UBAH_USER: 'ubah pengguna',
  UBAH_MASTER_BIDANG: 'ubah master bidang',
  UBAH_MASTER_NOMOR: 'ubah master nomor',
  UBAH_PENGATURAN: 'ubah pengaturan'
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
