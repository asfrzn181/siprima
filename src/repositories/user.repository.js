import { one, query } from '../config/db.js';

const petaUser = (row, izin = []) => {
  const role = String(row.role || '').toLowerCase();
  const aksesData =
    role === 'bidang' && row.bidang_kode
      ? row.bidang_akses_data === 'SEMUA'
        ? 'SEMUA'
        : 'SENDIRI'
      : 'SEMUA';
  return {
    id: row.id,
    uid: row.id,
    email: row.email,
    nama: row.nama,
    role,
    bidang: row.bidang_kode || '',
    aksesData,
    aktif: row.aktif === 1,
    izin,
    lastLoginAt: row.last_login_at,
    dibuatPada: row.created_at,
    diubahPada: row.updated_at
  };
};

const ambilIzin = async (roleId) => {
  const rows = await query(
    `SELECT p.name FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = ? ORDER BY p.name`,
    [roleId]
  );
  return rows.map((item) => item.name);
};

const ambilRoleId = async (nama) => {
  const row = await one('SELECT id FROM roles WHERE name = ?', [nama]);
  return row ? row.id : null;
};

const dasarUser = `SELECT u.*, r.name AS role, b.akses_data AS bidang_akses_data
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN master_bidang b ON b.kode = u.bidang_kode`;

export const cariUser = async (id) => {
  const row = await one(`${dasarUser} WHERE u.id = ?`, [id]);
  if (!row) return null;
  return petaUser(row, await ambilIzin(row.role_id));
};

export const cariUserByEmail = async (email) => {
  const row = await one(`${dasarUser} WHERE u.email = ?`, [String(email || '').trim().toLowerCase()]);
  if (!row) return null;
  return { ...petaUser(row, await ambilIzin(row.role_id)), passwordHash: row.password_hash };
};

export const daftarUser = async () => {
  const rows = await query(`${dasarUser} ORDER BY u.nama ASC`);
  return Promise.all(rows.map(async (row) => petaUser(row, await ambilIzin(row.role_id))));
};

export const simpanUser = async (data) => {
  const roleId = await ambilRoleId(data.role);
  if (!roleId) throw new Error(`Peran tidak dikenal: ${data.role}`);
  const hasil = await query(
    `INSERT INTO users (email, password_hash, nama, role_id, bidang_kode, aktif)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      String(data.email || '').trim().toLowerCase(),
      data.passwordHash,
      data.nama,
      roleId,
      data.bidang ? String(data.bidang).trim() : null,
      data.aktif ? 1 : 0
    ]
  );
  return cariUser(hasil.insertId);
};

export const ubahUser = async (id, data) => {
  const roleId = await ambilRoleId(data.role);
  if (!roleId) throw new Error(`Peran tidak dikenal: ${data.role}`);
  await query('UPDATE users SET nama = ?, role_id = ?, bidang_kode = ?, aktif = ? WHERE id = ?', [
    data.nama,
    roleId,
    data.bidang ? String(data.bidang).trim() : null,
    data.aktif ? 1 : 0,
    id
  ]);
  return cariUser(id);
};

export const ubahSandi = (id, passwordHash) =>
  query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);

export const cariHashUser = async (id) => {
  const row = await one('SELECT password_hash FROM users WHERE id = ?', [id]);
  return row ? row.password_hash : null;
};

export const perbaruiLoginTerakhir = (id) =>
  query('UPDATE users SET last_login_at = NOW(3) WHERE id = ?', [id]);

export const pastikanUserAda = async (id) => Boolean(await one('SELECT id FROM users WHERE id = ?', [id]));
