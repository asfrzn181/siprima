import { Router } from 'express';
import * as controller from '../controllers/numbering.controller.js';
import { PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { izinkan } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import { skemaCariNomorLengkap, skemaVerifikasiNomor } from '../validators/master.validator.js';
import { skemaReservasi } from '../validators/suratKeluar.validator.js';

export const numberingRouter = Router();

numberingRouter.use(wajibLogin);

numberingRouter.get('/cari', validasi(skemaCariNomorLengkap, 'query'), controller.cariNomor);
numberingRouter.get(
  '/verifikasi',
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  validasi(skemaVerifikasiNomor, 'query'),
  controller.verifikasiNomor
);

numberingRouter.post(
  '/pratinjau',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.BIDANG),
  validasi(skemaReservasi),
  controller.pratinjauNomor
);
numberingRouter.post(
  '/reservasi',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.BIDANG),
  validasi(skemaReservasi),
  controller.reservasiNomor
);
numberingRouter.post(
  '/kedaluwarsa',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  controller.kedaluwarsaNomor
);
