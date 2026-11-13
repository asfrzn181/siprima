import { galatAkses } from '../utils/AppError.js';

export const izinkan =
  (...peran) =>
  (req, _res, next) => {
    if (!req.profile || !peran.includes(req.profile.role)) {
      return next(galatAkses());
    }
    next();
  };
