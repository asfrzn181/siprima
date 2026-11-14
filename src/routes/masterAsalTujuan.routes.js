import { Router } from 'express';
import * as controller from '../controllers/master.controller.js';
import { IZIN, PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { izinkan, wajibIzin } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import { skemaBatchMasterAsalTujuan, skemaMasterAsalTujuan } from '../validators/master.validator.js';
import { skemaKataKunci } from '../validators/common.validator.js';

export const masterAsalTujuanRouter = Router();

masterAsalTujuanRouter.use(wajibLogin);

masterAsalTujuanRouter.get('/', wajibIzin(IZIN.MASTER_BACA), controller.daftarAsalTujuan);
masterAsalTujuanRouter.get(
  '/halaman',
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MASTER_KELOLA),
  controller.daftarAsalTujuanHalaman
);
masterAsalTujuanRouter.get(
  '/cari',
  validasi(skemaKataKunci, 'query'),
  controller.cariAsalTujuan
);

masterAsalTujuanRouter.post(
  '/',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MASTER_KELOLA),
  validasi(skemaMasterAsalTujuan),
  controller.simpanAsalTujuan
);
masterAsalTujuanRouter.post(
  '/impor',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MASTER_KELOLA),
  validasi(skemaBatchMasterAsalTujuan),
  controller.imporAsalTujuan
);
masterAsalTujuanRouter.put(
  '/:id',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MASTER_KELOLA),
  validasi(skemaMasterAsalTujuan),
  controller.simpanAsalTujuan
);
