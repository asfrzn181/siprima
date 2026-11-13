import { env } from '../config/env.js';
import { dapatkanAuth } from '../config/firebase.js';
import { cariUser } from '../repositories/user.repository.js';
import { AppError, galatSesi } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const wajibLogin = asyncHandler(async (req, _res, next) => {
  const cookie = req.cookies?.[env.SESSION_COOKIE_NAME];
  if (!cookie) throw galatSesi('Anda belum masuk.');

  let decoded;
  try {
    decoded = await dapatkanAuth().verifySessionCookie(cookie, true);
  } catch {
    throw galatSesi();
  }

  const profil = await cariUser(decoded.uid);
  if (!profil || profil.aktif !== true) {
    throw new AppError(403, 'AKUN_NONAKTIF', 'Akun belum aktif atau profil belum disiapkan admin.');
  }

  req.user = { uid: decoded.uid, email: decoded.email || profil.email || '' };
  req.profile = profil;
  next();
});

export const muatProfil = async (uid) => {
  const profil = await cariUser(uid);
  if (!profil || profil.aktif !== true) {
    throw new AppError(403, 'AKUN_NONAKTIF', 'Akun belum aktif atau profil belum disiapkan admin.');
  }
  return profil;
};
