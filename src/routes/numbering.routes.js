import { Router } from 'express';
import * as controller from '../controllers/numbering.controller.js';
import * as counterController from '../controllers/counter.controller.js';
import { IZIN, PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { izinkan, wajibIzin } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import { skemaCariNomorLengkap, skemaVerifikasiNomor } from '../validators/master.validator.js';
import { skemaReservasi, skemaTersediaNomor } from '../validators/suratKeluar.validator.js';

export const numberingRouter = Router();

numberingRouter.use(wajibLogin);

numberingRouter.get(
  '/tersedia',
  izinkan(PERAN.ADMIN, PERAN.OPERATOR, PERAN.BIDANG, PERAN.PIMPINAN),
  validasi(skemaTersediaNomor, 'query'),
  controller.tersedia
);
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
  izinkan(PERAN.ADMIN, PERAN.OPERATOR, PERAN.BIDANG),
  wajibIzin(IZIN.SURAT_KELUAR_TULIS),
  validasi(skemaReservasi),
  controller.pratinjauNomor
);
numberingRouter.post(
  '/kedaluwarsa',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  wajibIzin(IZIN.NOMOR_VERIFIKASI),
  controller.kedaluwarsaNomor
);

numberingRouter.get(
  '/counter',
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MASTER_KELOLA),
  counterController.daftarCounter
);

numberingRouter.put(
  '/counter',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.MASTER_KELOLA),
  counterController.aturCounter
);
