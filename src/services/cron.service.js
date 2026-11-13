import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { catatError } from '../config/logger.js';
import { ambilJob } from '../jobs/index.js';
import {
  cariJob,
  cariKunciByHash,
  cariRun,
  daftarJob,
  daftarRun,
  mulaiRun,
  perbaruiLastRun,
  sentuhKunci,
  selesaikanRun,
  tandaiBerjalan
} from '../repositories/cron.repository.js';
import { AppError, galatAkses, galatTidakDitemukan } from '../utils/AppError.js';
import { hashSha256 } from '../utils/hash.js';

const batasRiwayat = (limit) =>
  Math.min(env.CRON_RUN_HISTORY_LIMIT, Math.max(1, Number(limit) || env.CRON_RUN_HISTORY_LIMIT));

export const verifikasiKunci = async (kunciMentah, ip) => {
  if (!kunciMentah) {
    throw new AppError(401, 'KUNCI_CRON_TIDAK_ADA', 'Kunci API cron wajib dikirim.');
  }
  const data = await cariKunciByHash(hashSha256(kunciMentah));
  if (!data) {
    throw new AppError(401, 'KUNCI_CRON_TIDAK_VALID', 'Kunci API cron tidak valid atau sudah dicabut.');
  }
  await sentuhKunci(data.id, ip);
  return data;
};

export const daftarJobCron = async () =>
  (await daftarJob()).map((job) => ({ ...job, tersedia: Boolean(ambilJob(job.jobName)) }));

const prosesJob = async (runId, jobName) => {
  const mulai = Date.now();
  try {
    await tandaiBerjalan(runId);
    const job = await cariJob(jobName);
    const hasil = await ambilJob(jobName)(job?.config || {});
    await selesaikanRun(runId, {
      status: 'success',
      result: hasil,
      durationMs: Date.now() - mulai
    });
    await perbaruiLastRun(jobName);
  } catch (error) {
    await selesaikanRun(runId, {
      status: 'failed',
      errorMessage: String(error?.message || error).slice(0, 2000),
      durationMs: Date.now() - mulai
    });
    catatError(error, { sumber: 'cron', jobName, runId });
  }
};

export const jalankanJob = async ({ jobName, kunciData, ip, trigger = 'appscript' }) => {
  if (!ambilJob(jobName)) throw galatTidakDitemukan('Job tidak dikenal.');
  if (!kunciData.allowedJobs.includes(jobName)) {
    throw galatAkses('Kunci API ini tidak diizinkan menjalankan job tersebut.');
  }

  const runId = randomUUID();
  const hasil = await mulaiRun({ runId, jobName, trigger, callerIp: ip });

  if (hasil.status === 'tidak_ada') throw galatTidakDitemukan('Job tidak terdaftar di database.');
  if (hasil.status === 'nonaktif') {
    throw new AppError(409, 'JOB_NONAKTIF', 'Job sedang dinonaktifkan.');
  }
  if (hasil.status === 'berjalan') {
    throw new AppError(409, 'JOB_SEDANG_BERJALAN', 'Job yang sama masih berjalan.', [
      { code: 'RUN_ID', runId: hasil.runId }
    ]);
  }

  prosesJob(runId, jobName).catch(() => {});
  return { runId, jobName, status: 'queued' };
};

export const ambilRun = async (runId) => {
  const run = await cariRun(runId);
  if (!run) throw galatTidakDitemukan('Run tidak ditemukan.');
  return run;
};

export const daftarRunCron = async ({ jobName = null, limit = null } = {}) =>
  daftarRun({ jobName, limit: batasRiwayat(limit) });
