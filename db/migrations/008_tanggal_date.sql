-- ============================================================
-- SiPrima - tanggal dokumen sebagai DATE murni (tanpa zona waktu)
-- ============================================================
-- Tanggal dokumen (Tanggal Surat, Tanggal Terima, Tanggal SK/SE, dan
-- letter_date pada register nomor) tidak boleh menyimpan jam/zona waktu.
-- Sebelumnya nilai DATETIME disimpan dalam UTC dari tengah malam Jakarta
-- (17:00 hari sebelumnya), sehingga tanggal tampil mundur satu hari.
-- Nilai lama digeser +7 jam ke tanggal Jakarta yang benar sebelum tipe
-- kolom diubah menjadi DATE.

-- +migrate Up

UPDATE surat_keluar SET tgl_surat = DATE_ADD(tgl_surat, INTERVAL 7 HOUR);
ALTER TABLE surat_keluar MODIFY COLUMN tgl_surat DATE NOT NULL;

UPDATE surat_masuk
   SET tgl_terima = DATE_ADD(tgl_terima, INTERVAL 7 HOUR),
       tgl_surat = DATE_ADD(tgl_surat, INTERVAL 7 HOUR);
ALTER TABLE surat_masuk
  MODIFY COLUMN tgl_terima DATE NOT NULL,
  MODIFY COLUMN tgl_surat DATE NOT NULL;

UPDATE surat_khusus SET tanggal = DATE_ADD(tanggal, INTERVAL 7 HOUR);
ALTER TABLE surat_khusus MODIFY COLUMN tanggal DATE NOT NULL;

UPDATE letter_numbers SET letter_date = DATE_ADD(letter_date, INTERVAL 7 HOUR);
ALTER TABLE letter_numbers MODIFY COLUMN letter_date DATE NOT NULL;

-- +migrate Down

ALTER TABLE letter_numbers MODIFY COLUMN letter_date DATETIME(3) NOT NULL;
ALTER TABLE surat_khusus MODIFY COLUMN tanggal DATETIME(3) NOT NULL;
ALTER TABLE surat_masuk
  MODIFY COLUMN tgl_terima DATETIME(3) NOT NULL,
  MODIFY COLUMN tgl_surat DATETIME(3) NOT NULL;
ALTER TABLE surat_keluar MODIFY COLUMN tgl_surat DATETIME(3) NOT NULL;
