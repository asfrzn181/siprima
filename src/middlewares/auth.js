import { env } from '../config/env.js';
import { cariUser } from '../repositories/user.repository.js';
import { cariSesiAktif, sentuhSesi } from '../repositories/session.repository.js';
import { hashSha256 } from '../utils/hash.js';
import { AppError, galatSesi } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const wajibLogin = asyncHandler(async (req, _res, next) => {
  const cookie = req.cookies?.[env.SESSION_COOKIE_NAME];
  if (!cookie) throw galatSesi('Anda belum masuk.');

  const sesi = await cariSesiAktif(hashSha256(cookie));
  if (!sesi) throw galatSesi();

  const profil = await cariUser(sesi.user_id);
  if (!profil || profil.aktif !== true) {
    throw new AppError(403, 'AKUN_NONAKTIF', 'Akun belum aktif atau profil belum disiapkan admin.');
  }

  req.user = { id: profil.id, uid: profil.id, email: profil.email };
  req.profile = profil;
  req.sessionId = sesi.id;
  sentuhSesi(sesi.id).catch(() => {});
  next();
});

export const muatProfil = async (id) => {
  const profil = await cariUser(id);
  if (!profil || profil.aktif !== true) {
    throw new AppError(403, 'AKUN_NONAKTIF', 'Akun belum aktif atau profil belum disiapkan admin.');
  }
  return profil;
};
