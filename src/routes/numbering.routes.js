import { Router } from 'express';
import * as controller from '../controllers/numbering.controller.js';
import { IZIN, PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { izinkan, wajibIzin } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import { skemaCariNomorLengkap, skemaVerifikasiNomor } from '../validators/master.validator.js';
import { skemaReservasi } from '../validators/suratKeluar.validator.js';

export const numberingRouter = Router();

numberingRouter.use(wajibLogin);

numberingRouter.get(
  '/cari',
  wajibIzin(IZIN.SURAT_KELUAR_BACA),
  validasi(skemaCariNomorLengkap, 'query'),
  controller.cariNomor
);
numberingRouter.get(
  '/verifikasi',
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  wajibIzin(IZIN.NOMOR_VERIFIKASI),
  validasi(skemaVerifikasiNomor, 'query'),
  controller.verifikasiNomor
);

numberingRouter.post(
  '/pratinjau',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.BIDANG),
  wajibIzin(IZIN.SURAT_KELUAR_TULIS),
  validasi(skemaReservasi),
  controller.pratinjauNomor
);
numberingRouter.post(
  '/reservasi',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.BIDANG),
  wajibIzin(IZIN.SURAT_KELUAR_TULIS),
  validasi(skemaReservasi),
  controller.reservasiNomor
);
numberingRouter.post(
  '/kedaluwarsa',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  wajibIzin(IZIN.NOMOR_VERIFIKASI),
  controller.kedaluwarsaNomor
);
