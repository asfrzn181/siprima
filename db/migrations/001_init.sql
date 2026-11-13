-- ============================================================
-- SiPrima - migrasi awal MySQL 8
-- Engine: InnoDB, charset: utf8mb4, collation: utf8mb4_unicode_ci
-- Semua waktu disimpan dalam UTC (DATETIME(3)).
-- ============================================================

-- +migrate Up

CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(40) NOT NULL,
  label VARCHAR(80) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  KEY idx_role_permissions_permission (permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE master_bidang (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kode VARCHAR(40) NOT NULL,
  nama VARCHAR(120) NOT NULL,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_master_bidang_kode (kode),
  KEY idx_master_bidang_aktif_nama (aktif, nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(200) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nama VARCHAR(120) NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  bidang_kode VARCHAR(40) NULL,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role_id),
  KEY idx_users_bidang (bidang_kode),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_users_bidang FOREIGN KEY (bidang_kode) REFERENCES master_bidang (kode) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  ip VARCHAR(45) NOT NULL DEFAULT '',
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  last_used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token (token_hash),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_resets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_resets_token (token_hash),
  KEY idx_password_resets_user (user_id),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE master_nomor (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama VARCHAR(120) NOT NULL,
  golongan ENUM('SK','SE','LAINNYA') NOT NULL DEFAULT 'LAINNYA',
  format VARCHAR(180) NOT NULL,
  kode VARCHAR(40) NOT NULL,
  reset_tahunan TINYINT(1) NOT NULL DEFAULT 1,
  urutan_per_bidang TINYINT(1) NOT NULL DEFAULT 0,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_master_nomor_aktif_nama (aktif, nama),
  KEY idx_master_nomor_kode (kode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pengaturan (
  id TINYINT UNSIGNED NOT NULL,
  nama_dinas VARCHAR(180) NOT NULL DEFAULT '',
  apps_script_url VARCHAR(500) NOT NULL DEFAULT '',
  numbering_scope ENUM('GLOBAL_PER_TAHUN','PER_KLASIFIKASI') NOT NULL DEFAULT 'GLOBAL_PER_TAHUN',
  reservation_minutes INT NOT NULL DEFAULT 15,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE counters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  last_value BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_counters_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE surat_masuk (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  no_agenda VARCHAR(20) NOT NULL,
  tgl_terima DATETIME(3) NOT NULL,
  tgl_surat DATETIME(3) NOT NULL,
  no_surat VARCHAR(120) NOT NULL,
  asal VARCHAR(160) NOT NULL,
  hal VARCHAR(200) NOT NULL,
  isi_ringkas TEXT NOT NULL,
  sifat ENUM('biasa','rahasia') NOT NULL DEFAULT 'biasa',
  file_id VARCHAR(300) NOT NULL DEFAULT '',
  file_url VARCHAR(1000) NOT NULL DEFAULT '',
  status ENUM('Baru','Didisposisikan','Selesai') NOT NULL DEFAULT 'Baru',
  dibuat_oleh_id BIGINT UNSIGNED NULL,
  dibuat_oleh_nama VARCHAR(120) NOT NULL DEFAULT '',
  disposisi_diputuskan_oleh VARCHAR(80) NOT NULL DEFAULT '',
  disposisi_dicatat_oleh_id BIGINT UNSIGNED NULL,
  disposisi_dicatat_oleh_nama VARCHAR(120) NOT NULL DEFAULT '',
  disposisi_tanggal DATETIME(3) NULL,
  disposisi_catatan VARCHAR(1000) NOT NULL DEFAULT '',
  dibuat_pada DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  diubah_pada DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_surat_masuk_agenda (no_agenda),
  KEY idx_sm_status_sifat_dibuat (status, sifat, dibuat_pada),
  KEY idx_sm_sifat_dibuat (sifat, dibuat_pada),
  KEY idx_sm_status_dibuat (status, dibuat_pada),
  KEY idx_sm_dibuat (dibuat_pada),
  KEY idx_sm_tgl_terima (tgl_terima),
  KEY idx_sm_status_sifat_tgl (status, sifat, tgl_terima),
  KEY idx_sm_sifat_tgl (sifat, tgl_terima),
  KEY idx_sm_status_tgl (status, tgl_terima),
  KEY idx_sm_no_surat (no_surat),
  KEY idx_sm_hal (hal),
  KEY idx_sm_asal (asal),
  CONSTRAINT fk_sm_dibuat_oleh FOREIGN KEY (dibuat_oleh_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_sm_disposisi_oleh FOREIGN KEY (disposisi_dicatat_oleh_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE surat_masuk_akses_bidang (
  surat_masuk_id BIGINT UNSIGNED NOT NULL,
  bidang_kode VARCHAR(40) NOT NULL,
  PRIMARY KEY (surat_masuk_id, bidang_kode),
  KEY idx_smab_bidang (bidang_kode),
  CONSTRAINT fk_smab_surat FOREIGN KEY (surat_masuk_id) REFERENCES surat_masuk (id) ON DELETE CASCADE,
  CONSTRAINT fk_smab_bidang FOREIGN KEY (bidang_kode) REFERENCES master_bidang (kode) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE surat_masuk_tindak_lanjut (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  surat_masuk_id BIGINT UNSIGNED NOT NULL,
  bidang_kode VARCHAR(40) NOT NULL,
  status ENUM('Belum','Sudah') NOT NULL DEFAULT 'Belum',
  tanggal DATETIME(3) NULL,
  catatan VARCHAR(1000) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uq_smtl_surat_bidang (surat_masuk_id, bidang_kode),
  KEY idx_smtl_bidang (bidang_kode),
  CONSTRAINT fk_smtl_surat FOREIGN KEY (surat_masuk_id) REFERENCES surat_masuk (id) ON DELETE CASCADE,
  CONSTRAINT fk_smtl_bidang FOREIGN KEY (bidang_kode) REFERENCES master_bidang (kode) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE surat_keluar (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  no_surat VARCHAR(120) NOT NULL,
  jenis_id BIGINT UNSIGNED NULL,
  golongan ENUM('SK','SE','LAINNYA') NOT NULL DEFAULT 'LAINNYA',
  tgl_surat DATETIME(3) NOT NULL,
  tujuan VARCHAR(200) NOT NULL,
  hal VARCHAR(200) NOT NULL,
  isi_ringkas TEXT NOT NULL,
  sifat ENUM('biasa','rahasia') NOT NULL DEFAULT 'biasa',
  tanda_tangan ENUM('TTE','BASAH') NOT NULL DEFAULT 'BASAH',
  file_id VARCHAR(300) NOT NULL DEFAULT '',
  file_url VARCHAR(1000) NOT NULL DEFAULT '',
  bidang_pembuat_kode VARCHAR(40) NULL,
  dibuat_oleh_id BIGINT UNSIGNED NULL,
  dibuat_oleh_nama VARCHAR(120) NOT NULL DEFAULT '',
  status ENUM('Aktif','Dibatalkan') NOT NULL DEFAULT 'Aktif',
  alasan_batal VARCHAR(1000) NOT NULL DEFAULT '',
  dikirim_ke_luar TINYINT(1) NOT NULL DEFAULT 0,
  letter_number_id BIGINT UNSIGNED NULL,
  letter_row_version INT UNSIGNED NOT NULL DEFAULT 1,
  dibuat_pada DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  diubah_pada DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_sk_status_sifat_tgl (status, sifat, tgl_surat),
  KEY idx_sk_sifat_tgl (sifat, tgl_surat),
  KEY idx_sk_status_tgl (status, tgl_surat),
  KEY idx_sk_tgl (tgl_surat),
  KEY idx_sk_no_surat (no_surat),
  KEY idx_sk_hal (hal),
  KEY idx_sk_tujuan (tujuan),
  KEY idx_sk_bidang (bidang_pembuat_kode),
  KEY idx_sk_jenis (jenis_id),
  KEY idx_sk_letter_number (letter_number_id),
  CONSTRAINT fk_sk_jenis FOREIGN KEY (jenis_id) REFERENCES master_nomor (id) ON DELETE SET NULL,
  CONSTRAINT fk_sk_bidang FOREIGN KEY (bidang_pembuat_kode) REFERENCES master_bidang (kode) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_sk_dibuat_oleh FOREIGN KEY (dibuat_oleh_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE surat_keluar_akses_bidang (
  surat_keluar_id BIGINT UNSIGNED NOT NULL,
  bidang_kode VARCHAR(40) NOT NULL,
  PRIMARY KEY (surat_keluar_id, bidang_kode),
  KEY idx_skab_bidang (bidang_kode),
  CONSTRAINT fk_skab_surat FOREIGN KEY (surat_keluar_id) REFERENCES surat_keluar (id) ON DELETE CASCADE,
  CONSTRAINT fk_skab_bidang FOREIGN KEY (bidang_kode) REFERENCES master_bidang (kode) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE letter_counters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tahun SMALLINT UNSIGNED NOT NULL,
  scope ENUM('GLOBAL_PER_TAHUN','PER_KLASIFIKASI') NOT NULL,
  scope_key VARCHAR(80) NOT NULL,
  last_seq INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_letter_counters (tahun, scope_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE letter_numbers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seq INT UNSIGNED NOT NULL,
  seq_suffix VARCHAR(20) NULL,
  klasifikasi VARCHAR(40) NOT NULL,
  golongan ENUM('SK','SE','LAINNYA') NOT NULL,
  unit VARCHAR(40) NOT NULL,
  bulan TINYINT UNSIGNED NOT NULL,
  bulan_romawi VARCHAR(4) NOT NULL,
  tahun SMALLINT UNSIGNED NOT NULL,
  scope_key VARCHAR(80) NOT NULL,
  full_number VARCHAR(200) NOT NULL,
  jenis_id BIGINT UNSIGNED NULL,
  status ENUM('RESERVED','ISSUED','VOID') NOT NULL DEFAULT 'RESERVED',
  letter_date DATETIME(3) NOT NULL,
  perihal VARCHAR(200) NOT NULL DEFAULT '',
  tujuan VARCHAR(200) NOT NULL DEFAULT '',
  created_by_id BIGINT UNSIGNED NULL,
  created_by_nama VARCHAR(120) NOT NULL DEFAULT '',
  created_by_role VARCHAR(40) NOT NULL DEFAULT '',
  letter_id BIGINT UNSIGNED NULL,
  issued_at DATETIME(3) NULL,
  voided_at DATETIME(3) NULL,
  voided_by_id BIGINT UNSIGNED NULL,
  voided_by_nama VARCHAR(120) NOT NULL DEFAULT '',
  void_reason VARCHAR(500) NOT NULL DEFAULT '',
  replaced_by_id BIGINT UNSIGNED NULL,
  replacement_of_id BIGINT UNSIGNED NULL,
  reservation_expires_at DATETIME(3) NOT NULL,
  idempotency_key VARCHAR(200) NOT NULL DEFAULT '',
  reused_at DATETIME(3) NULL,
  reused_by_id BIGINT UNSIGNED NULL,
  reused_by_nama VARCHAR(120) NOT NULL DEFAULT '',
  reuse_count INT UNSIGNED NOT NULL DEFAULT 0,
  reuse_reason VARCHAR(500) NOT NULL DEFAULT '',
  row_version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_letter_numbers_full (full_number),
  KEY idx_ln_status_expiry (status, reservation_expires_at),
  KEY idx_ln_tahun_scope_seq (tahun, scope_key, seq, seq_suffix),
  KEY idx_ln_jenis (jenis_id),
  KEY idx_ln_letter (letter_id),
  KEY idx_ln_replaced (replaced_by_id),
  CONSTRAINT fk_ln_jenis FOREIGN KEY (jenis_id) REFERENCES master_nomor (id) ON DELETE SET NULL,
  CONSTRAINT fk_ln_letter FOREIGN KEY (letter_id) REFERENCES surat_keluar (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE surat_keluar
  ADD CONSTRAINT fk_sk_letter_number FOREIGN KEY (letter_number_id) REFERENCES letter_numbers (id) ON DELETE SET NULL;

CREATE TABLE letter_idempotency (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  idem_key VARCHAR(200) NOT NULL,
  letter_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_letter_idempotency_key (idem_key),
  KEY idx_letter_idempotency_letter (letter_id),
  CONSTRAINT fk_letter_idempotency_letter FOREIGN KEY (letter_id) REFERENCES letter_numbers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE letter_audit_heads (
  id TINYINT UNSIGNED NOT NULL,
  last_hash CHAR(64) NOT NULL DEFAULT '',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE letter_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  letter_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(40) NOT NULL,
  actor_id BIGINT UNSIGNED NULL,
  actor_nama VARCHAR(120) NOT NULL DEFAULT '',
  actor_role VARCHAR(40) NOT NULL DEFAULT '',
  timestamp DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  before_json JSON NULL,
  after_json JSON NULL,
  prev_hash CHAR(64) NOT NULL DEFAULT '',
  hash CHAR(64) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_lal_letter (letter_id),
  KEY idx_lal_time (timestamp),
  CONSTRAINT fk_lal_letter FOREIGN KEY (letter_id) REFERENCES letter_numbers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  nama VARCHAR(120) NOT NULL DEFAULT '',
  aksi VARCHAR(80) NOT NULL,
  koleksi VARCHAR(60) NOT NULL DEFAULT '',
  doc_id VARCHAR(200) NOT NULL DEFAULT '',
  sebelum JSON NULL,
  sesudah JSON NULL,
  waktu DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_waktu (waktu),
  KEY idx_audit_user (user_id),
  KEY idx_audit_koleksi (koleksi),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +migrate Down

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS letter_audit_log;
DROP TABLE IF EXISTS letter_audit_heads;
DROP TABLE IF EXISTS letter_idempotency;
DROP TABLE IF EXISTS letter_numbers;
DROP TABLE IF EXISTS letter_counters;
DROP TABLE IF EXISTS surat_keluar_akses_bidang;
DROP TABLE IF EXISTS surat_keluar;
DROP TABLE IF EXISTS surat_masuk_tindak_lanjut;
DROP TABLE IF EXISTS surat_masuk_akses_bidang;
DROP TABLE IF EXISTS surat_masuk;
DROP TABLE IF EXISTS counters;
DROP TABLE IF EXISTS pengaturan;
DROP TABLE IF EXISTS master_nomor;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS master_bidang;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
SET FOREIGN_KEY_CHECKS = 1;
