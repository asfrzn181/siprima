import { env } from '../config/env.js';
import {
  konfirmasiResetPassword,
  login as loginService,
  logout as logoutService,
  mintaResetPassword,
  refresh as refreshService,
  register as registerService,
  sesiSaatIni,
  ubahSandiSendiri
} from '../services/auth.service.js';
import { kirimSukses } from '../utils/response.js';

const opsiSesi = () => ({
  httpOnly: true,
  secure: env.produksi,
  sameSite: 'lax',
  path: '/',
  maxAge: env.masaSesiMs
});

const meta = (req) => ({
  userAgent: req.get('user-agent') || '',
  ip: req.ip || ''
});

export const login = async (req, res) => {
  const hasil = await loginService(req.body, meta(req));
  res.cookie(env.SESSION_COOKIE_NAME, hasil.cookie, opsiSesi());
  return kirimSukses(res, {
    message: 'Berhasil masuk.',
    data: { user: hasil.user, profile: hasil.profile }
  });
};

export const logout = async (req, res) => {
  await logoutService(req.cookies?.[env.SESSION_COOKIE_NAME]);
  res.clearCookie(env.SESSION_COOKIE_NAME, { ...opsiSesi(), maxAge: undefined });
  return kirimSukses(res, { message: 'Berhasil keluar.', data: null });
};

export const sesi = async (req, res) =>
  kirimSukses(res, { message: 'Sesi aktif.', data: await sesiSaatIni(req) });

export const csrf = (_req, res) =>
  kirimSukses(res, { message: 'Token CSRF.', data: { token: res.locals.csrfToken } });

export const register = async (req, res) =>
  kirimSukses(res, {
    status: 201,
    message: 'Pendaftaran diterima. Akun menunggu aktivasi admin.',
    data: await registerService(req.body)
  });

export const refresh = async (req, res) => {
  const hasil = await refreshService(req.cookies?.[env.SESSION_COOKIE_NAME], meta(req));
  res.cookie(env.SESSION_COOKIE_NAME, hasil.cookie, opsiSesi());
  return kirimSukses(res, {
    message: 'Sesi diperbarui.',
    data: { user: hasil.user, profile: hasil.profile }
  });
};

export const mintaReset = async (req, res) =>
  kirimSukses(res, {
    message: 'Jika email terdaftar, tautan reset telah dibuat.',
    data: await mintaResetPassword(req.body.email)
  });

export const reset = async (req, res) =>
  kirimSukses(res, {
    message: 'Kata sandi berhasil diperbarui.',
    data: await konfirmasiResetPassword(req.body.token, req.body.password)
  });

export const ubahSandi = async (req, res) =>
  kirimSukses(res, {
    message: 'Kata sandi berhasil diperbarui.',
    data: await ubahSandiSendiri(req.profile, req.body)
  });
