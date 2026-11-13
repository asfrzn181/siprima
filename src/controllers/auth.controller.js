import { env } from '../config/env.js';
import { login as loginService, sesiSaatIni } from '../services/auth.service.js';
import { kirimSukses } from '../utils/response.js';

const opsiSesi = () => ({
  httpOnly: true,
  secure: env.produksi,
  sameSite: 'lax',
  path: '/',
  maxAge: env.masaSesiMs
});

export const login = async (req, res) => {
  const hasil = await loginService(req.body);
  res.cookie(env.SESSION_COOKIE_NAME, hasil.cookie, opsiSesi());
  return kirimSukses(res, {
    message: 'Berhasil masuk.',
    data: { user: hasil.user, profile: hasil.profile }
  });
};

export const logout = (_req, res) => {
  res.clearCookie(env.SESSION_COOKIE_NAME, { ...opsiSesi(), maxAge: undefined });
  return kirimSukses(res, { message: 'Berhasil keluar.', data: null });
};

export const sesi = (req, res) => kirimSukses(res, { message: 'Sesi aktif.', data: sesiSaatIni(req) });

export const csrf = (_req, res) =>
  kirimSukses(res, { message: 'Token CSRF.', data: { token: res.locals.csrfToken } });
