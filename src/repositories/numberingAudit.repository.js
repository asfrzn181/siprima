import { hashSha256 } from '../utils/hash.js';
import { jsonAtauNull } from './helpers.js';

const dataAktor = (aktor = {}) => ({
  uid: aktor.uid || null,
  nama: aktor.nama || aktor.email || '',
  role: aktor.profile?.role || aktor.role || ''
});

export const bacaAuditHead = async (koneksi) => {
  await koneksi.query("INSERT IGNORE INTO letter_audit_heads (id, last_hash) VALUES (1, '')");
  const [rows] = await koneksi.query('SELECT last_hash FROM letter_audit_heads WHERE id = 1 FOR UPDATE');
  return rows.length ? String(rows[0].last_hash || '') : '';
};

export const tulisAuditDalamTransaksi = async (
  koneksi,
  { letterId, action, actor, before, after, previousHash }
) => {
  const aktor = dataAktor(actor);
  const payload = JSON.stringify({
    letter_id: letterId,
    action,
    actor: aktor,
    before_json: before || null,
    after_json: after || null
  });
  const hash = hashSha256(`${previousHash || ''}${payload}`);

  await koneksi.query(
    `INSERT INTO letter_audit_log
       (letter_id, action, actor_id, actor_nama, actor_role, timestamp,
        before_json, after_json, prev_hash, hash)
     VALUES (?, ?, ?, ?, ?, NOW(3), ?, ?, ?, ?)`,
    [
      letterId,
      action,
      aktor.uid,
      aktor.nama,
      aktor.role,
      jsonAtauNull(before),
      jsonAtauNull(after),
      previousHash || '',
      hash
    ]
  );
  await koneksi.query('UPDATE letter_audit_heads SET last_hash = ?, updated_at = NOW(3) WHERE id = 1', [
    hash
  ]);
  return hash;
};
