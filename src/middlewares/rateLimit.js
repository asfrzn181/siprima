import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { kirimError } from '../utils/response.js';

const pengirim = (_req, res) =>
  kirimError(res, {
    status: 429,
    message: 'Terlalu banyak permintaan. Coba lagi nanti.',
    errors: [{ code: 'TERLALU_BANYAK' }]
  });

const dasar = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: pengirim
};

export const batasiApi = rateLimit({
  ...dasar,
  windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.RATE_LIMIT_MAX
});

export const batasiLogin = rateLimit({
  ...dasar,
  windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true
});

export const batasiUnggah = rateLimit({
  ...dasar,
  windowMs: 60 * 60 * 1000,
  limit: 60
});

export const batasiCron = rateLimit({
  ...dasar,
  windowMs: 60 * 1000,
  limit: env.CRON_RATE_LIMIT_MAX
});
