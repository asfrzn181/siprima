import { Router } from 'express';
import * as controller from '../controllers/suratMasuk.controller.js';
import { PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { batasiUnggah } from '../middlewares/rateLimit.js';
import { izinkan } from '../middlewares/role.js';
import { unggahScan } from '../middlewares/upload.js';
import { validasi } from '../middlewares/validate.js';
import {
  skemaDisposisi,
  skemaFilterSuratMasuk,
  skemaSuratMasuk,
  skemaTindakLanjut
} from '../validators/suratMasuk.validator.js';

export const suratMasukRouter = Router();

suratMasukRouter.use(wajibLogin);

suratMasukRouter.get('/', validasi(skemaFilterSuratMasuk, 'query'), controller.daftar);
suratMasukRouter.get('/export', validasi(skemaFilterSuratMasuk, 'query'), controller.ekspor);
suratMasukRouter.get('/:id', controller.ambil);
suratMasukRouter.get('/:id/berkas', controller.unduhBerkas);

suratMasukRouter.post(
  '/',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  validasi(skemaSuratMasuk),
  controller.tambah
);
suratMasukRouter.put(
  '/:id',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  validasi(skemaSuratMasuk),
  controller.ubah
);
suratMasukRouter.post(
  '/:id/disposisi',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  validasi(skemaDisposisi),
  controller.disposisi
);
suratMasukRouter.post(
  '/:id/tindak-lanjut',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.BIDANG),
  validasi(skemaTindakLanjut),
  controller.tindakLanjut
);
suratMasukRouter.post(
  '/:id/scan',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  batasiUnggah,
  unggahScan,
  controller.unggahScan
);
