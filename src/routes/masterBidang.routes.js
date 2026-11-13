import { Router } from 'express';
import * as controller from '../controllers/master.controller.js';
import { PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { izinkan } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import { skemaMasterBidang } from '../validators/master.validator.js';

export const masterBidangRouter = Router();

masterBidangRouter.use(wajibLogin);

masterBidangRouter.get('/', controller.daftarBidang);
masterBidangRouter.get('/halaman', izinkan(PERAN.ADMIN), controller.daftarBidangHalaman);
masterBidangRouter.post(
  '/',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  validasi(skemaMasterBidang),
  controller.simpanBidang
);
masterBidangRouter.put(
  '/:id',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  validasi(skemaMasterBidang),
  controller.simpanBidang
);
