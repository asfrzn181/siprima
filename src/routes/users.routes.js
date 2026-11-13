import { Router } from 'express';
import * as controller from '../controllers/user.controller.js';
import { IZIN, PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { izinkan, wajibIzin } from '../middlewares/role.js';
import { validasi } from '../middlewares/validate.js';
import { skemaBuatUser, skemaUbahUser } from '../validators/user.validator.js';

export const userRouter = Router();

userRouter.use(wajibLogin, izinkan(PERAN.ADMIN), wajibIzin(IZIN.USERS_KELOLA));

userRouter.get('/', controller.daftar);
userRouter.post('/', verifikasiCsrf, validasi(skemaBuatUser), controller.buat);
userRouter.put('/:id', verifikasiCsrf, validasi(skemaUbahUser), controller.ubah);
