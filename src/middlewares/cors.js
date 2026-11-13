import { env } from '../config/env.js';

const METODE = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';

export const cors = (req, res, next) => {
  const origin = req.get('origin');
  if (origin && env.daftarCors.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', METODE);
    res.setHeader(
      'Access-Control-Allow-Headers',
      `Content-Type, X-CSRF-Token, ${env.CRON_API_KEY_HEADER}`
    );
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
};
