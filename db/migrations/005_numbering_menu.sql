-- ============================================================
-- SiPrima - nomor otomatis per menu (Surat Keluar, SK, SE)
-- ============================================================

-- +migrate Up

-- Registry nomor kini mengenal menu. Nomor urut global per tahun dan
-- terpisah untuk tiap menu, sehingga klasifikasi tidak lagi memecah urutan.
ALTER TABLE letter_numbers
  ADD COLUMN menu ENUM('SURAT_KELUAR','SK','SE') NOT NULL DEFAULT 'SURAT_KELUAR' AFTER golongan,
  ADD COLUMN kode_bidang VARCHAR(40) NULL AFTER unit;

-- Backfill menu dari golongan lama agar urutan SK/SE tidak bercampur dengan
-- surat keluar saat unique key ditambahkan.
UPDATE letter_numbers
   SET menu = CASE golongan
     WHEN 'SK' THEN 'SK'
     WHEN 'SE' THEN 'SE'
     ELSE 'SURAT_KELUAR'
   END;

UPDATE letter_numbers
   SET kode_bidang = unit
 WHERE menu = 'SURAT_KELUAR' AND kode_bidang IS NULL;

ALTER TABLE letter_numbers
  ADD UNIQUE KEY uq_letter_numbers_menu_tahun_seq (menu, tahun, seq);

-- Surat khusus (SK/SE) memakai nomor otomatis dan dapat dibatalkan tanpa
-- menghapus data.
ALTER TABLE surat_khusus
  ADD COLUMN jenis_id BIGINT UNSIGNED NULL AFTER jenis,
  ADD COLUMN letter_number_id BIGINT UNSIGNED NULL AFTER nomor,
  ADD COLUMN status ENUM('Aktif','Dibatalkan') NOT NULL DEFAULT 'Aktif' AFTER keterangan,
  ADD COLUMN alasan_batal VARCHAR(500) NOT NULL DEFAULT '' AFTER status,
  ADD COLUMN dibatalkan_pada DATETIME(3) NULL AFTER alasan_batal,
  ADD COLUMN dibatalkan_oleh_id BIGINT UNSIGNED NULL AFTER dibatalkan_pada,
  ADD COLUMN dibatalkan_oleh_nama VARCHAR(120) NOT NULL DEFAULT '' AFTER dibatalkan_oleh_id,
  ADD KEY idx_surat_khusus_letter_number (letter_number_id),
  ADD CONSTRAINT fk_surat_khusus_jenis FOREIGN KEY (jenis_id) REFERENCES master_nomor (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_surat_khusus_letter_number FOREIGN KEY (letter_number_id) REFERENCES letter_numbers (id) ON DELETE SET NULL;

-- +migrate Down

ALTER TABLE surat_khusus
  DROP FOREIGN KEY fk_surat_khusus_letter_number,
  DROP FOREIGN KEY fk_surat_khusus_jenis,
  DROP KEY idx_surat_khusus_letter_number,
  DROP COLUMN dibatalkan_oleh_nama,
  DROP COLUMN dibatalkan_oleh_id,
  DROP COLUMN dibatalkan_pada,
  DROP COLUMN alasan_batal,
  DROP COLUMN status,
  DROP COLUMN letter_number_id,
  DROP COLUMN jenis_id;

ALTER TABLE letter_numbers
  DROP INDEX uq_letter_numbers_menu_tahun_seq,
  DROP COLUMN kode_bidang,
  DROP COLUMN menu;
