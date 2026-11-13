import { one, query, withTransaction } from '../config/db.js';

export const daftarPeran = async () => {
  const roles = await query('SELECT id, name, label FROM roles ORDER BY id ASC');
  const izin = await query(
    `SELECT rp.role_id, p.name FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
      ORDER BY p.name`
  );
  const peta = new Map();
  izin.forEach((item) => {
    if (!peta.has(item.role_id)) peta.set(item.role_id, []);
    peta.get(item.role_id).push(item.name);
  });
  return roles.map((row) => ({
    id: row.id,
    nama: row.name,
    label: row.label,
    izin: peta.get(row.id) || []
  }));
};

export const daftarIzin = async () =>
  (await query('SELECT id, name, label FROM permissions ORDER BY name')).map((row) => ({
    id: row.id,
    nama: row.name,
    label: row.label
  }));

export const simpanIzinPeran = async (nama, daftarIzin) =>
  withTransaction(async (koneksi) => {
    const [role] = await koneksi.query('SELECT id, name FROM roles WHERE name = ?', [nama]);
    if (!role.length) return null;
    const roleId = role[0].id;
    await koneksi.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    const unik = [...new Set((daftarIzin || []).map((item) => String(item || '').trim()).filter(Boolean))];
    for (const izin of unik) {
      const [perm] = await koneksi.query('SELECT id FROM permissions WHERE name = ?', [izin]);
      if (!perm.length) continue;
      await koneksi.query(
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleId, perm[0].id]
      );
    }
    return roleId;
  });

export const cariPeran = async (nama) => one('SELECT id, name FROM roles WHERE name = ?', [nama]);
