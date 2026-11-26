import { query } from '../config/db.js';

export const daftarCounterNomor = async () =>
  query('SELECT tahun, scope, scope_key, last_seq, updated_at FROM letter_counters ORDER BY tahun DESC, scope_key ASC');

export const aturCounterNomor = async ({ tahun, scopeKey, lastSeq }) => {
  const th = Number(tahun);
  const seq = Number(lastSeq);
  if (!Number.isInteger(th) || th < 2000) throw new Error('Tahun tidak valid.');
  if (!['SURAT_KELUAR', 'SK', 'SE'].includes(scopeKey)) throw new Error('Jenis nomor tidak valid.');
  if (!Number.isInteger(seq) || seq < 0) throw new Error('Nomor urut tidak valid.');

  const [maxRow] = await query(
    'SELECT COALESCE(MAX(seq), 0) AS maks FROM letter_numbers WHERE menu = ? AND tahun = ?',
    [scopeKey, th]
  );
  const batas = Math.max(seq, Number(maxRow?.maks || 0));
  await query(
    `INSERT INTO letter_counters (tahun, scope, scope_key, last_seq)
     VALUES (?, 'GLOBAL_PER_TAHUN', ?, ?)
     ON DUPLICATE KEY UPDATE last_seq = GREATEST(last_seq, ?), updated_at = UTC_TIMESTAMP(3)`,
    [th, scopeKey, batas, batas]
  );
  return { tahun: th, scopeKey, lastSeq: batas };
};

export const daftarCounterAgenda = async () =>
  query("SELECT name, nilai FROM counters WHERE name LIKE 'agendaMasuk_%' ORDER BY name ASC");

export const aturCounterAgenda = async ({ tahun, lastSeq }) => {
  const th = Number(tahun);
  const seq = Number(lastSeq);
  if (!Number.isInteger(th) || th < 2000) throw new Error('Tahun tidak valid.');
  if (!Number.isInteger(seq) || seq < 0) throw new Error('Nomor urut tidak valid.');

  const [maxRow] = await query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(no_agenda, '/', -1) AS UNSIGNED)), 0) AS maks FROM surat_masuk WHERE no_agenda LIKE ?",
    [`${th}/%`]
  );
  const batas = Math.max(seq, Number(maxRow?.maks || 0));
  await query(
    "INSERT INTO counters (name, nilai) VALUES (?, ?) ON DUPLICATE KEY UPDATE nilai = GREATEST(nilai, ?)",
    [`agendaMasuk_${th}`, batas, batas]
  );
  return { tahun: th, lastSeq: batas };
};
