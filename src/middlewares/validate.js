import { AppError } from '../utils/AppError.js';

export const validasi =
  (skema, sumber = 'body') =>
  (req, _res, next) => {
    const hasil = skema.safeParse(req[sumber]);
    if (!hasil.success) {
      const errors = hasil.error.issues.map((issue) => ({
        field: issue.path.join('.') || sumber,
        message: issue.message
      }));
      return next(new AppError(400, 'VALIDASI_GAGAL', 'Data yang dikirim tidak valid.', errors));
    }
    req[sumber] = hasil.data;
    next();
  };
