-- ============================================================
-- SiPrima - menu navigasi dinamis (parent/child) + RBAC
-- ============================================================

-- +migrate Up

CREATE TABLE menus (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kunci VARCHAR(60) NOT NULL,
  label VARCHAR(120) NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  href VARCHAR(160) NOT NULL DEFAULT '',
  izin VARCHAR(80) NULL,
  urutan INT NOT NULL DEFAULT 0,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_menus_kunci (kunci),
  KEY idx_menus_parent_urutan (parent_id, urutan),
  CONSTRAINT fk_menus_parent FOREIGN KEY (parent_id) REFERENCES menus (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO menus (kunci, label, parent_id, href, izin, urutan) VALUES
  ('dashboard', 'Dashboard', NULL, 'dashboard.html', 'dashboard.baca', 10),
  ('agenda', 'Agenda Surat', NULL, '', NULL, 20),
  ('laporan', 'Laporan', NULL, '', NULL, 30),
  ('master', 'Master Data', NULL, '', NULL, 40),
  ('setting', 'Setting', NULL, '', NULL, 50);

SET @agenda := (SELECT id FROM menus WHERE kunci = 'agenda');
SET @laporan := (SELECT id FROM menus WHERE kunci = 'laporan');
SET @master := (SELECT id FROM menus WHERE kunci = 'master');
SET @setting := (SELECT id FROM menus WHERE kunci = 'setting');

INSERT INTO menus (kunci, label, parent_id, href, izin, urutan) VALUES
  ('masuk', 'Surat Masuk', @agenda, 'surat-masuk.html', 'surat_masuk.baca', 10),
  ('keluar', 'Surat Keluar', @agenda, 'surat-keluar.html', 'surat_keluar.baca', 20),
  ('sk', 'Surat Keputusan', @agenda, 'sk.html', 'sk.lihat', 30),
  ('se', 'Surat Edaran', @agenda, 'se.html', 'se.lihat', 40),
  ('laporan-masuk', 'Surat Masuk', @laporan, 'laporan.html?jenis=masuk', 'laporan.baca', 10),
  ('laporan-keluar', 'Surat Keluar', @laporan, 'laporan.html?jenis=keluar', 'laporan.baca', 20),
  ('master-bidang', 'Bidang', @master, 'admin.html#bidang', 'master.kelola', 10),
  ('master-nomor', 'Nomor Surat', @master, 'admin.html#nomor', 'master.kelola', 20),
  ('master-asal-tujuan', 'Asal & Tujuan', @master, 'admin.html#asal-tujuan', 'master.kelola', 30),
  ('ubah-sandi', 'Ganti Password', @setting, 'ubah-sandi.html', 'sandi.ubah', 10),
  ('pengguna', 'Pengguna', @setting, 'admin.html#users', 'users.kelola', 20),
  ('peran', 'Peran & Hak Akses', @setting, 'admin.html#peran', 'users.kelola', 30),
  ('pengaturan', 'Pengaturan Umum', @setting, 'admin.html#settings', 'pengaturan.kelola', 40),
  ('audit', 'Audit Log', @setting, 'admin.html#audit', 'audit.baca', 50),
  ('pembersih', 'Pembersih Nomor', @setting, 'admin.html#cleaner', 'nomor.verifikasi', 60),
  ('menu-nav', 'Menu Navigasi', @master, 'admin.html#menu', 'menu.kelola', 40);

-- +migrate Down

DROP TABLE IF EXISTS menus;
