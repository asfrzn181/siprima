import { Router } from 'express';
import * as controller from '../controllers/role.controller.js';
import { IZIN, PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { izinkan, wajibIzin } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import { skemaUbahIzinPeran } from '../validators/role.validator.js';

export const roleRouter = Router();

roleRouter.use(wajibLogin, izinkan(PERAN.ADMIN), wajibIzin(IZIN.USERS_KELOLA));

roleRouter.get('/', controller.daftar);
roleRouter.put(
  '/:nama',
  verifikasiCsrf,
  validasi(skemaUbahIzinPeran),
  controller.ubah
);
