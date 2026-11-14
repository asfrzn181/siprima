import { Router } from 'express';
import * as controller from '../controllers/master.controller.js';
import { IZIN, PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { izinkan, wajibIzin } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import { skemaBatchMasterNomor, skemaMasterNomor } from '../validators/master.validator.js';
import { skemaKataKunci } from '../validators/common.validator.js';

export const masterNomorRouter = Router();

masterNomorRouter.use(wajibLogin);
masterNomorRouter.use(izinkan(PERAN.ADMIN, PERAN.OPERATOR, PERAN.BIDANG));

masterNomorRouter.get('/', controller.daftarSemuaNomor);
masterNomorRouter.get('/halaman', izinkan(PERAN.ADMIN), wajibIzin(IZIN.MASTER_KELOLA), controller.daftarNomor);
masterNomorRouter.get('/cari', validasi(skemaKataKunci, 'query'), controller.cariNomor);
masterNomorRouter.get('/:id', controller.ambilNomor);

masterNomorRouter.post(
  '/',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MASTER_KELOLA),
  validasi(skemaMasterNomor),
  controller.simpanNomor
);
masterNomorRouter.post(
  '/impor',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MASTER_KELOLA),
  validasi(skemaBatchMasterNomor),
  controller.imporNomor
);
masterNomorRouter.put(
  '/:id',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MASTER_KELOLA),
  validasi(skemaMasterNomor),
  controller.simpanNomor
);
