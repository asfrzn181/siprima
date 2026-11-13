import { one, query } from '../config/db.js';

const petaMenu = (row) => ({
  id: row.id,
  kunci: row.kunci,
  label: row.label,
  parentId: row.parent_id,
  href: row.href,
  izin: row.izin || null,
  urutan: row.urutan,
  aktif: row.aktif === 1
});

export const daftarMenu = async () =>
  (await query('SELECT * FROM menus ORDER BY urutan ASC, label ASC')).map(petaMenu);

export const cariMenu = async (id) => {
  const row = await one('SELECT * FROM menus WHERE id = ?', [id]);
  return row ? petaMenu(row) : null;
};

export const cariMenuByKunci = async (kunci) => {
  const row = await one('SELECT * FROM menus WHERE kunci = ? LIMIT 1', [String(kunci || '').trim()]);
  return row ? petaMenu(row) : null;
};

export const simpanMenu = async (id, data) => {
  const nilai = [data.kunci, data.label, data.parentId || null, data.href || '', data.izin || null, data.urutan, data.aktif ? 1 : 0];
  if (id) {
    await query(
      `UPDATE menus
          SET kunci = ?, label = ?, parent_id = ?, href = ?, izin = ?, urutan = ?, aktif = ?
        WHERE id = ?`,
      [...nilai, id]
    );
    return cariMenu(id);
  }
  const hasil = await query(
    `INSERT INTO menus (kunci, label, parent_id, href, izin, urutan, aktif)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    nilai
  );
  return cariMenu(hasil.insertId);
};

export const hapusMenu = (id) => query('DELETE FROM menus WHERE id = ?', [id]);
