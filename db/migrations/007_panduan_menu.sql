-- ============================================================
-- SiPrima - menu Panduan Pengguna (User Guide / Manual Book)
-- ============================================================

-- +migrate Up

-- Menu panduan dapat dilihat semua peran (izin NULL) dan tampil sebagai
-- menu utama agar mudah ditemukan.
INSERT INTO menus (kunci, label, parent_id, href, izin, urutan, aktif)
VALUES ('panduan', 'Panduan Pengguna', NULL, 'panduan.html', NULL, 60, 1)
ON DUPLICATE KEY UPDATE
  label = 'Panduan Pengguna',
  parent_id = NULL,
  href = 'panduan.html',
  izin = NULL,
  urutan = 60,
  aktif = 1;

-- +migrate Down

DELETE FROM menus WHERE kunci = 'panduan';
