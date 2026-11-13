import { one, query } from '../config/db.js';

export const buatSesi = async ({ userId, tokenHash, userAgent = '', ip = '', expiresAt }) => {
  const hasil = await query(
    `INSERT INTO sessions (user_id, token_hash, user_agent, ip, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, tokenHash, String(userAgent).slice(0, 255), String(ip).slice(0, 45), expiresAt]
  );
  return hasil.insertId;
};

export const cariSesiAktif = (tokenHash) =>
  one(
    `SELECT * FROM sessions
      WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW(3)
      LIMIT 1`,
    [tokenHash]
  );

export const sentuhSesi = (id) => query('UPDATE sessions SET last_used_at = NOW(3) WHERE id = ?', [id]);

export const cabutSesi = (tokenHash) =>
  query('UPDATE sessions SET revoked_at = NOW(3) WHERE token_hash = ? AND revoked_at IS NULL', [tokenHash]);

export const cabutSesiUser = (userId) =>
  query('UPDATE sessions SET revoked_at = NOW(3) WHERE user_id = ? AND revoked_at IS NULL', [userId]);

export const rotasiSesi = (id, { tokenHash, expiresAt }) =>
  query('UPDATE sessions SET token_hash = ?, expires_at = ?, last_used_at = NOW(3) WHERE id = ?', [
    tokenHash,
    expiresAt,
    id
  ]);

export const hapusSesiKedaluwarsa = () =>
  query('DELETE FROM sessions WHERE expires_at < NOW(3) OR revoked_at IS NOT NULL');

export const buatReset = async ({ userId, tokenHash, expiresAt }) => {
  await query('UPDATE password_resets SET used_at = NOW(3) WHERE user_id = ? AND used_at IS NULL', [userId]);
  const hasil = await query(
    'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt]
  );
  return hasil.insertId;
};

export const cariResetAktif = (tokenHash) =>
  one(
    `SELECT * FROM password_resets
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW(3)
      LIMIT 1`,
    [tokenHash]
  );

export const tandaiResetDipakai = (id) =>
  query('UPDATE password_resets SET used_at = NOW(3) WHERE id = ?', [id]);
