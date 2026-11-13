import {
  ambilRun,
  daftarJobCron,
  daftarRunCron,
  jalankanJob
} from '../services/cron.service.js';
import { kirimSukses } from '../utils/response.js';

export const health = (_req, res) =>
  kirimSukses(res, {
    message: 'Cron API aktif.',
    data: { status: 'ok', waktu: new Date().toISOString() }
  });

export const jobs = async (_req, res) => kirimSukses(res, { data: await daftarJobCron() });

export const run = async (req, res) =>
  kirimSukses(res, {
    status: 202,
    message: 'Job dijadwalkan.',
    data: await jalankanJob({
      jobName: req.params.job_name,
      kunciData: req.cronKey,
      ip: req.ip || '',
      trigger: 'appscript'
    })
  });

export const runDetail = async (req, res) =>
  kirimSukses(res, { data: await ambilRun(req.params.run_id) });

export const runs = async (req, res) =>
  kirimSukses(res, {
    data: await daftarRunCron({ jobName: req.query.job_name || null, limit: req.query.limit })
  });
