import { Router } from 'express';
import * as controller from '../controllers/suratKeluar.controller.js';
import { IZIN, PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { batasiUnggah } from '../middlewares/rateLimit.js';
import { izinkan, wajibIzin } from '../middlewares/role.js';
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

suratKeluarRouter.get(
  '/',
  wajibIzin(IZIN.SURAT_KELUAR_BACA),
  validasi(skemaFilterSuratKeluar, 'query'),
  controller.daftar
);
suratKeluarRouter.get(
  '/export',
  wajibIzin(IZIN.SURAT_KELUAR_BACA),
  validasi(skemaFilterSuratKeluar, 'query'),
  controller.ekspor
);
suratKeluarRouter.get('/:id', wajibIzin(IZIN.SURAT_KELUAR_BACA), controller.ambil);
suratKeluarRouter.get('/:id/berkas', wajibIzin(IZIN.SURAT_KELUAR_BACA), controller.unduhBerkas);

suratKeluarRouter.post(
  '/',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.BIDANG),
  wajibIzin(IZIN.SURAT_KELUAR_TULIS),
  validasi(skemaPayloadSuratKeluar),
  controller.tambah
);
suratKeluarRouter.put(
  '/:id',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.BIDANG),
  wajibIzin(IZIN.SURAT_KELUAR_TULIS),
  validasi(skemaUbahSuratKeluar),
  controller.ubah
);
suratKeluarRouter.post(
  '/:id/batal',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  wajibIzin(IZIN.SURAT_KELUAR_BATAL),
  validasi(skemaBatal),
  controller.batal
);
suratKeluarRouter.post(
  '/:id/kirim',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.SURAT_KELUAR_KIRIM),
  validasi(skemaPengiriman),
  controller.kirim
);
suratKeluarRouter.post(
  '/:id/koreksi',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.PIMPINAN),
  wajibIzin(IZIN.SURAT_KELUAR_KOREKSI),
  validasi(skemaKoreksi),
  controller.koreksi
);
suratKeluarRouter.post(
  '/:id/pakai-ulang-nomor',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN),
  wajibIzin(IZIN.SURAT_KELUAR_PAKAI_ULANG),
  validasi(skemaGunakanUlang),
  controller.pakaiUlang
);
suratKeluarRouter.post(
  '/:id/scan',
  verifikasiCsrf,
  izinkan(PERAN.ADMIN, PERAN.BIDANG),
  wajibIzin(IZIN.SURAT_KELUAR_TULIS),
  batasiUnggah,
  unggahScan,
  controller.unggahScan
);
