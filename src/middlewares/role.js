import { galatAkses } from '../utils/AppError.js';

export const izinkan =
  (...peran) =>
  (req, _res, next) => {
    if (!req.profile || !peran.includes(req.profile.role)) {
      return next(galatAkses());
    }
    next();
  };

// Otorisasi berbasis izin (hasil terjemahan firestore.rules/storage.rules).
export const wajibIzin =
  (...izin) =>
  (req, _res, next) => {
    const dimiliki = req.profile?.izin || [];
    if (!req.profile || !izin.every((butir) => dimiliki.includes(butir))) {
      return next(galatAkses());
    }
    next();
  };
