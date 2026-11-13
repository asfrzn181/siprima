import { Router } from 'express';
import * as controller from '../controllers/pengaturan.controller.js';
import { PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { izinkan } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import { skemaPengaturan } from '../validators/master.validator.js';

export const pengaturanRouter = Router();

pengaturanRouter.use(wajibLogin);

pengaturanRouter.get('/', controller.ambil);
pengaturanRouter.put('/', verifikasiCsrf, izinkan(PERAN.ADMIN), validasi(skemaPengaturan), controller.simpan);
