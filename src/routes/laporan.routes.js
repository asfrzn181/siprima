import { Router } from 'express';
import * as controller from '../controllers/laporan.controller.js';
import { PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { izinkan } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import { skemaLaporanKeluar, skemaLaporanMasuk } from '../validators/laporan.validator.js';

export const laporanRouter = Router();

laporanRouter.use(wajibLogin, izinkan(PERAN.ADMIN, PERAN.PIMPINAN));

laporanRouter.get('/masuk', validasi(skemaLaporanMasuk, 'query'), controller.masuk);
laporanRouter.get('/keluar', validasi(skemaLaporanKeluar, 'query'), controller.keluar);
