-- ============================================================
-- Reset data transaksi SiPrima
-- ------------------------------------------------------------
-- Menghapus seluruh data transaksi dan mengembalikan penomoran
-- ke urutan 1. Master (users, roles, master_bidang, master_nomor,
-- pengaturan, menus) TIDAK dihapus.
--
-- PERINGATAN: operasi ini permanen. Backup dulu bila perlu:
--   mysqldump -u root siprima > backup-siprima.sql
--
-- Cara pakai:
--   mysql -u root siprima < db/reset-transaksi.sql
-- ============================================================

START TRANSACTION;

-- 1. Tabel anak / relasi akses
DELETE FROM surat_masuk_tindak_lanjut;
DELETE FROM surat_masuk_akses_bidang;
DELETE FROM surat_keluar_akses_bidang;

-- 2. Riwayat dan idempotensi nomor
DELETE FROM letter_audit_log;
DELETE FROM letter_idempotency;

-- 3. Surat (hapus surat lebih dulu agar FK letter_numbers.letter_id
--    otomatis menjadi NULL sebelum register nomor dihapus)
DELETE FROM surat_keluar;
DELETE FROM surat_khusus;
DELETE FROM surat_masuk;

-- 4. Register nomor dan counter penomoran
DELETE FROM letter_numbers;
DELETE FROM letter_counters;

-- 5. Counter agenda surat masuk (legacy)
DELETE FROM counters;

-- 6. Audit umum
DELETE FROM audit_log;

-- 7. Reset rantai hash audit nomor
UPDATE letter_audit_heads SET last_hash = '' WHERE id = 1;

COMMIT;

-- Reset AUTO_INCREMENT agar ID kembali mulai dari 1.
-- (ALTER TABLE menyebabkan implicit commit, jadi dijalankan setelah COMMIT.)
ALTER TABLE surat_masuk AUTO_INCREMENT = 1;
ALTER TABLE surat_keluar AUTO_INCREMENT = 1;
ALTER TABLE surat_khusus AUTO_INCREMENT = 1;
ALTER TABLE surat_masuk_tindak_lanjut AUTO_INCREMENT = 1;
ALTER TABLE letter_numbers AUTO_INCREMENT = 1;
ALTER TABLE letter_counters AUTO_INCREMENT = 1;
ALTER TABLE letter_idempotency AUTO_INCREMENT = 1;
ALTER TABLE letter_audit_log AUTO_INCREMENT = 1;
ALTER TABLE counters AUTO_INCREMENT = 1;
ALTER TABLE audit_log AUTO_INCREMENT = 1;

-- Verifikasi: semua angka harus 0.
SELECT 'surat_masuk' AS tabel, COUNT(*) AS jumlah FROM surat_masuk
UNION ALL SELECT 'surat_masuk_akses_bidang', COUNT(*) FROM surat_masuk_akses_bidang
UNION ALL SELECT 'surat_masuk_tindak_lanjut', COUNT(*) FROM surat_masuk_tindak_lanjut
UNION ALL SELECT 'surat_keluar', COUNT(*) FROM surat_keluar
UNION ALL SELECT 'surat_keluar_akses_bidang', COUNT(*) FROM surat_keluar_akses_bidang
UNION ALL SELECT 'surat_khusus', COUNT(*) FROM surat_khusus
UNION ALL SELECT 'letter_numbers', COUNT(*) FROM letter_numbers
UNION ALL SELECT 'letter_counters', COUNT(*) FROM letter_counters
UNION ALL SELECT 'letter_idempotency', COUNT(*) FROM letter_idempotency
UNION ALL SELECT 'letter_audit_log', COUNT(*) FROM letter_audit_log
UNION ALL SELECT 'counters', COUNT(*) FROM counters
UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log;
