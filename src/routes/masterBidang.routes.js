import { Router } from 'express';
import * as controller from '../controllers/master.controller.js';
import { IZIN, PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { izinkan, wajibIzin } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import { skemaMasterBidang } from '../validators/master.validator.js';

export const masterBidangRouter = Router();

masterBidangRouter.use(wajibLogin);

masterBidangRouter.get('/', wajibIzin(IZIN.MASTER_BACA), controller.daftarBidang);
masterBidangRouter.get(
  '/halaman',
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MASTER_KELOLA),
  controller.daftarBidangHalaman
);
masterBidangRouter.post(
  '/',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MASTER_KELOLA),
  validasi(skemaMasterBidang),
  controller.simpanBidang
);
masterBidangRouter.put(
  '/:id',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MASTER_KELOLA),
  validasi(skemaMasterBidang),
  controller.simpanBidang
);
