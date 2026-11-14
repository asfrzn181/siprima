-- ============================================================
-- SiPrima - pengaturan akses data per bidang
-- ============================================================

-- +migrate Up

-- SEMUA  : pengguna pada bidang ini melihat data seluruh bidang.
-- SENDIRI: pengguna hanya melihat data bidangnya sendiri (default aman).
ALTER TABLE master_bidang
  ADD COLUMN akses_data ENUM('SEMUA','SENDIRI') NOT NULL DEFAULT 'SENDIRI' AFTER aktif;

-- +migrate Down

ALTER TABLE master_bidang
  DROP COLUMN akses_data;
