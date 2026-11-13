import { Router } from 'express';
import * as controller from '../controllers/menu.controller.js';
import { IZIN, PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { izinkan, wajibIzin } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import { skemaMenu } from '../validators/menu.validator.js';

export const menuRouter = Router();

menuRouter.use(wajibLogin);

menuRouter.get('/', controller.daftar);

menuRouter.get('/semua', izinkan(PERAN.ADMIN), wajibIzin(IZIN.MENU_KELOLA), controller.semua);
menuRouter.post(
  '/',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MENU_KELOLA),
  validasi(skemaMenu),
  controller.simpan
);
menuRouter.put(
  '/:id',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MENU_KELOLA),
  validasi(skemaMenu),
  controller.simpan
);
menuRouter.delete(
  '/:id',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MENU_KELOLA),
  controller.hapus
);
