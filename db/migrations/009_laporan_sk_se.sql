-- ============================================================
-- SiPrima - menu Laporan untuk SK dan SE
-- ============================================================

-- +migrate Up

SET @laporan := (SELECT id FROM menus WHERE kunci = 'laporan');

INSERT INTO menus (kunci, label, parent_id, href, izin, urutan)
VALUES
  ('laporan-sk', 'Surat Keputusan', @laporan, 'laporan.html?jenis=sk', 'laporan.baca', 30),
  ('laporan-se', 'Surat Edaran', @laporan, 'laporan.html?jenis=se', 'laporan.baca', 40)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  parent_id = VALUES(parent_id),
  href = VALUES(href),
  izin = VALUES(izin),
  urutan = VALUES(urutan);

-- +migrate Down

DELETE FROM menus WHERE kunci IN ('laporan-sk', 'laporan-se');
