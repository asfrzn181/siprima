import { env } from '../config/env.js';
import { verifikasiKunci } from '../services/cron.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const wajibKunciCron = asyncHandler(async (req, _res, next) => {
  const kunci = req.get(env.CRON_API_KEY_HEADER) || '';
  req.cronKey = await verifikasiKunci(kunci, req.ip || '');
  next();
});
