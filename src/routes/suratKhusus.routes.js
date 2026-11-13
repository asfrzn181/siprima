import { Router } from 'express';
import { buatController } from '../controllers/suratKhusus.controller.js';
import { IZIN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { wajibIzin } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import {
  skemaBatalKhusus,
  skemaFilterSuratKhusus,
  skemaSuratKhusus
} from '../validators/suratKhusus.validator.js';

export const buatSuratKhususRouter = ({ jenis, izin }) => {
  const router = Router();
  const controller = buatController(jenis);

  router.use(wajibLogin);

  router.get('/', wajibIzin(izin.baca), validasi(skemaFilterSuratKhusus, 'query'), controller.daftar);
  router.get('/nomor-tersedia', wajibIzin(izin.baca), controller.tersedia);
  router.get('/:id', wajibIzin(izin.baca), controller.ambil);
  router.post('/', verifikasiCsrf, wajibIzin(izin.tulis), validasi(skemaSuratKhusus), controller.tambah);
  router.put('/:id', verifikasiCsrf, wajibIzin(izin.tulis), validasi(skemaSuratKhusus), controller.ubah);
  router.post(
    '/:id/batal',
    verifikasiCsrf,
    wajibIzin(izin.hapus),
    validasi(skemaBatalKhusus),
    controller.hapus
  );
  router.delete(
    '/:id',
    verifikasiCsrf,
    wajibIzin(izin.hapus),
    validasi(skemaBatalKhusus),
    controller.hapus
  );

  return router;
};

export const suratSkRouter = buatSuratKhususRouter({
  jenis: 'SK',
  izin: { baca: IZIN.SK_BACA, tulis: IZIN.SK_TULIS, hapus: IZIN.SK_HAPUS }
});

export const suratSeRouter = buatSuratKhususRouter({
  jenis: 'SE',
  izin: { baca: IZIN.SE_BACA, tulis: IZIN.SE_TULIS, hapus: IZIN.SE_HAPUS }
});
