import { one, query, withTransaction } from '../config/db.js';
import { jsonAtauNull, parseJson } from './helpers.js';

const petaKunci = (row) => ({
  id: row.id,
  name: row.name,
  allowedJobs: parseJson(row.allowed_jobs, []),
  lastUsedAt: row.last_used_at,
  lastUsedIp: row.last_used_ip,
  revokedAt: row.revoked_at,
  createdAt: row.created_at
});

const petaJob = (row) => ({
  id: row.id,
  jobName: row.job_name,
  enabled: row.enabled === 1,
  scheduleNote: row.schedule_note,
  config: parseJson(row.config, {}),
  lastRunAt: row.last_run_at,
  updatedAt: row.updated_at
});

const petaRun = (row) => ({
  id: row.id,
  runId: row.run_id,
  jobName: row.job_name,
  status: row.status,
  trigger: row.trigger_type,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  durationMs: row.duration_ms,
  result: parseJson(row.result),
  errorMessage: row.error_message,
  callerIp: row.caller_ip,
  createdAt: row.created_at
});

export const cariKunciByHash = async (hash) => {
  const row = await one('SELECT * FROM cron_api_keys WHERE key_hash = ? AND revoked_at IS NULL LIMIT 1', [
    hash
  ]);
  return row ? petaKunci(row) : null;
};

export const sentuhKunci = (id, ip) =>
  query('UPDATE cron_api_keys SET last_used_at = NOW(3), last_used_ip = ? WHERE id = ?', [
    String(ip || '').slice(0, 45),
    id
  ]);

export const daftarJob = async () => {
  const rows = await query('SELECT * FROM cron_jobs ORDER BY job_name ASC');
  return rows.map(petaJob);
};

export const cariJob = async (nama) => {
  const row = await one('SELECT * FROM cron_jobs WHERE job_name = ?', [nama]);
  return row ? petaJob(row) : null;
};

// Membuat run baru sambil mengunci baris cron_jobs agar dua pemanggil
// tidak dapat memulai job yang sama secara bersamaan (lintas proses).
export const mulaiRun = async ({ runId, jobName, trigger, callerIp }) =>
  withTransaction(async (koneksi) => {
    const [job] = await koneksi.query('SELECT enabled FROM cron_jobs WHERE job_name = ? FOR UPDATE', [
      jobName
    ]);
    if (!job.length) return { status: 'tidak_ada' };
    if (job[0].enabled !== 1) return { status: 'nonaktif' };

    const [aktif] = await koneksi.query(
      `SELECT run_id FROM cron_runs
        WHERE job_name = ? AND status IN ('queued', 'running')
        ORDER BY created_at DESC LIMIT 1`,
      [jobName]
    );
    if (aktif.length) return { status: 'berjalan', runId: aktif[0].run_id };

    await koneksi.query(
      `INSERT INTO cron_runs (run_id, job_name, status, trigger_type, caller_ip)
       VALUES (?, ?, 'queued', ?, ?)`,
      [runId, jobName, trigger, String(callerIp || '').slice(0, 45)]
    );
    return { status: 'dibuat' };
  });

export const tandaiBerjalan = (runId) =>
  query("UPDATE cron_runs SET status = 'running', started_at = NOW(3) WHERE run_id = ?", [runId]);

export const selesaikanRun = (runId, { status, result = null, errorMessage = null, durationMs = null }) =>
  query(
    `UPDATE cron_runs
        SET status = ?, finished_at = NOW(3), duration_ms = ?, result = ?, error_message = ?
      WHERE run_id = ?`,
    [status, durationMs, jsonAtauNull(result), errorMessage, runId]
  );

export const cariRun = async (runId) => {
  const row = await one('SELECT * FROM cron_runs WHERE run_id = ?', [runId]);
  return row ? petaRun(row) : null;
};

export const daftarRun = async ({ jobName = null, limit = 50 } = {}) => {
  const rows = jobName
    ? await query(
        'SELECT * FROM cron_runs WHERE job_name = ? ORDER BY created_at DESC LIMIT ?',
        [jobName, Number(limit) || 50]
      )
    : await query('SELECT * FROM cron_runs ORDER BY created_at DESC LIMIT ?', [Number(limit) || 50]);
  return rows.map(petaRun);
};

export const adaRunAktif = async (jobName) => {
  const row = await one(
    `SELECT run_id FROM cron_runs
      WHERE job_name = ? AND status IN ('queued', 'running')
      ORDER BY created_at DESC LIMIT 1`,
    [jobName]
  );
  return row ? row.run_id : null;
};

export const perbaruiLastRun = (jobName) =>
  query('UPDATE cron_jobs SET last_run_at = NOW(3) WHERE job_name = ?', [jobName]);
