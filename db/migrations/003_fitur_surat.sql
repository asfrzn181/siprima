-- ============================================================
-- SiPrima - fitur klasifikasi surat, asal/tujuan, dan SK/SE
-- ============================================================

-- +migrate Up

-- Master nomor surat kini hanya menyimpan kode + nama klasifikasi.
ALTER TABLE master_nomor DROP COLUMN format;

-- Master asal (pengirim) dan tujuan instansi.
CREATE TABLE master_asal_tujuan (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kode VARCHAR(40) NOT NULL,
  nama VARCHAR(160) NOT NULL,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_master_asal_tujuan_kode (kode),
  KEY idx_master_asal_tujuan_aktif_nama (aktif, nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Surat Keputusan (SK) dan Surat Edaran (SE) berbagi struktur yang sama.
CREATE TABLE surat_khusus (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  jenis ENUM('SK','SE') NOT NULL,
  tentang VARCHAR(200) NOT NULL,
  nomor VARCHAR(120) NOT NULL,
  tanggal DATETIME(3) NOT NULL,
  keterangan VARCHAR(1000) NOT NULL DEFAULT '',
  dibuat_oleh_id BIGINT UNSIGNED NULL,
  dibuat_oleh_nama VARCHAR(120) NOT NULL DEFAULT '',
  dibuat_pada DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  diubah_pada DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_surat_khusus_jenis_tanggal (jenis, tanggal),
  KEY idx_surat_khusus_jenis_nomor (jenis, nomor),
  CONSTRAINT fk_surat_khusus_dibuat_oleh FOREIGN KEY (dibuat_oleh_id)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tujuan pada surat masuk (asal sudah ada sebelumnya).
ALTER TABLE surat_masuk ADD COLUMN tujuan VARCHAR(160) NOT NULL DEFAULT '' AFTER asal;

-- +migrate Down

ALTER TABLE surat_masuk DROP COLUMN tujuan;

DROP TABLE IF EXISTS surat_khusus;
DROP TABLE IF EXISTS master_asal_tujuan;

ALTER TABLE master_nomor
  ADD COLUMN format VARCHAR(180) NOT NULL DEFAULT '{KODE}/{URUT:3}/{UNIT}/{TAHUN}' AFTER golongan;
