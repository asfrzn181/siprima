import { Router } from 'express';
import * as controller from '../controllers/suratKeluar.controller.js';
import { PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { batasiUnggah } from '../middlewares/rateLimit.js';
import { izinkan } from '../middlewares/role.js';
import { unggahScan } from '../middlewares/upload.js';
import { validasi } from '../middlewares/validate.js';
import {
  skemaBatal,
  skemaFilterSuratKeluar,
  skemaGunakanUlang,
  skemaKoreksi,
  skemaPayloadSuratKeluar,
  skemaPengiriman,
  skemaUbahSuratKeluar
} from '../validators/suratKeluar.validator.js';

export const suratKeluarRouter = Router();

suratKeluarRouter.use(wajibLogin);

suratKeluarRouter.get('/', validasi(skemaFilterSuratKeluar, 'query'), controller.daftar);
suratKeluarRouter.get('/export', validasi(skemaFilterSuratKeluar, 'query'), controller.ekspor);
suratKeluarRouter.get('/:id', controller.ambil);
suratKeluarRouter.get('/:id/berkas', controller.unduhBerkas);

suratKeluarRouter.post(
  '/',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.BIDANG),
  validasi(skemaPayloadSuratKeluar),
  controller.tambah
);
suratKeluarRouter.put(
  '/:id',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.BIDANG),
  validasi(skemaUbahSuratKeluar),
  controller.ubah
);
suratKeluarRouter.post(
  '/:id/batal',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  validasi(skemaBatal),
  controller.batal
);
suratKeluarRouter.post(
  '/:id/kirim',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  validasi(skemaPengiriman),
  controller.kirim
);
suratKeluarRouter.post(
  '/:id/koreksi',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  validasi(skemaKoreksi),
  controller.koreksi
);
suratKeluarRouter.post(
  '/:id/pakai-ulang-nomor',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  validasi(skemaGunakanUlang),
  controller.pakaiUlang
);
suratKeluarRouter.post(
  '/:id/scan',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.BIDANG),
  batasiUnggah,
  unggahScan,
  controller.unggahScan
);
