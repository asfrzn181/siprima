import { Router } from 'express';
import * as controller from '../controllers/suratMasuk.controller.js';
import { IZIN, PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { batasiUnggah } from '../middlewares/rateLimit.js';
import { izinkan, wajibIzin } from '../middlewares/role.js';
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

suratMasukRouter.get(
  '/',
  wajibIzin(IZIN.SURAT_MASUK_BACA),
  validasi(skemaFilterSuratMasuk, 'query'),
  controller.daftar
);
suratMasukRouter.get(
  '/export',
  wajibIzin(IZIN.SURAT_MASUK_BACA),
  validasi(skemaFilterSuratMasuk, 'query'),
  controller.ekspor
);
suratMasukRouter.get('/:id', wajibIzin(IZIN.SURAT_MASUK_BACA), controller.ambil);
suratMasukRouter.get('/:id/berkas', wajibIzin(IZIN.SURAT_MASUK_BACA), controller.unduhBerkas);

suratMasukRouter.post(
  '/',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.SURAT_MASUK_TULIS),
  validasi(skemaSuratMasuk),
  controller.tambah
);
suratMasukRouter.put(
  '/:id',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  wajibIzin(IZIN.SURAT_MASUK_TULIS),
  validasi(skemaSuratMasuk),
  controller.ubah
);
suratMasukRouter.post(
  '/:id/disposisi',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  wajibIzin(IZIN.SURAT_MASUK_DISPOSISI),
  validasi(skemaDisposisi),
  controller.disposisi
);
suratMasukRouter.post(
  '/:id/tindak-lanjut',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.BIDANG),
  wajibIzin(IZIN.SURAT_MASUK_TINDAK_LANJUT),
  validasi(skemaTindakLanjut),
  controller.tindakLanjut
);
suratMasukRouter.post(
  '/:id/scan',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.SURAT_MASUK_TULIS),
  batasiUnggah,
  unggahScan,
  controller.unggahScan
);
