-- Akun awal BKD Bangka
-- Jalankan setelah: npm run migrate && npm run seed

SET FOREIGN_KEY_CHECKS = 0;

-- Pastikan master bidang tersedia
INSERT INTO master_bidang (kode, nama, aktif, akses_data)
VALUES
  ('I', 'Sekretariat', 1, 'SEMUA'),
  ('II', 'BIDANG PENGADAAN DAN MUTASI ASN', 1, 'SENDIRI'),
  ('III', 'BIDANG PEMBINAAN DAN PENGEMBANGAN SUMBER DAYA MANUSIA', 1, 'SENDIRI'),
  ('IV', 'BIDANG SISTEM INFORMASI DAN DIGITALISASI', 1, 'SENDIRI')
ON DUPLICATE KEY UPDATE
  nama = VALUES(nama),
  aktif = VALUES(aktif),
  akses_data = VALUES(akses_data);

-- Pastikan permission cetak ada untuk Operator
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'operator'), id
FROM permissions
WHERE name IN (
  'surat_masuk.cetak',
  'surat_keluar.cetak',
  'sk.cetak',
  'se.cetak'
);

-- Tambah akun pengguna awal
INSERT INTO users
  (email, password_hash, nama, role_id, bidang_kode, aktif)
VALUES
  ('sekretariat.bkd@bangka.go.id', '$2a$10$Xb5g1p1nO9Q60t0qJI2o6e0azWBOOHv2F2F6g7kQn6c5IjzdofhbO', 'Sekretariat', (SELECT id FROM roles WHERE name = 'bidang' LIMIT 1), 'I', 1),
  ('mutasi.bkd@bangka.go.id',      '$2a$10$aFXpvpmbjhiLcTxafMu1OOk7zQ4t74YLFKEE4cheK5BIv1373rEUK', 'Mutasi',      (SELECT id FROM roles WHERE name = 'bidang' LIMIT 1), 'II', 1),
  ('ppsdm.bkd@bangka.go.id',      '$2a$10$yQhZaOuGTp5Cumd5pZr33echUZDBbefmhCx7aYg32Z2r3TWCiQWe.', 'PPSDM',       (SELECT id FROM roles WHERE name = 'bidang' LIMIT 1), 'III', 1),
  ('simpeg.bkd@bangka.go.id',     '$2a$10$.2QbzirguXUyiubw/flw6uS835PD6tc4THd7ikA045ijMMDjm6n9W', 'Simpeg',      (SELECT id FROM roles WHERE name = 'bidang' LIMIT 1), 'IV', 1),
  ('kaban-bkd@bangka.go.id',      '$2a$10$EArIGs1AzSxWHjQHdVZ2i.YmWCXGI1FbOiWreg4q7v8EUQdf/rRPq', 'Kepala BKD',  (SELECT id FROM roles WHERE name = 'pimpinan' LIMIT 1), NULL, 1),
  ('operator-bkd@bangka.go.id',   '$2a$10$qyka0gW8m19.NqQhJ7A64uFSck6iN52fK6oYh84AdFvSpXL21uKQi', 'Operator',    (SELECT id FROM roles WHERE name = 'operator' LIMIT 1), NULL, 1)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  nama          = VALUES(nama),
  role_id       = VALUES(role_id),
  bidang_kode   = VALUES(bidang_kode),
  aktif         = VALUES(aktif);

SET FOREIGN_KEY_CHECKS = 1;
