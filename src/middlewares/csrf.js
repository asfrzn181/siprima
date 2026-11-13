import { randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const opsiCookie = () => ({
  httpOnly: false,
  secure: env.produksi,
  sameSite: 'lax',
  path: '/',
  maxAge: env.masaSesiMs
});

export const pastikanCsrf = (req, res, next) => {
  const nama = env.CSRF_COOKIE_NAME;
  let token = req.cookies?.[nama];
  if (!token || token.length < 32) {
    token = randomBytes(32).toString('hex');
    res.cookie(nama, token, opsiCookie());
  }
  res.locals.csrfToken = token;
  next();
};

export const verifikasiCsrf = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookie = req.cookies?.[env.CSRF_COOKIE_NAME] || '';
  const header = req.get('x-csrf-token') || '';
  if (!cookie || !header || cookie.length !== header.length) {
    return next(new AppError(403, 'CSRF_TIDAK_VALID', 'Token keamanan tidak valid. Muat ulang halaman.'));
  }
  if (!timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
    return next(new AppError(403, 'CSRF_TIDAK_VALID', 'Token keamanan tidak valid. Muat ulang halaman.'));
  }
  next();
};
