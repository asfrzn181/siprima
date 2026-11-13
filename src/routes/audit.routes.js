import { Router } from 'express';
import * as controller from '../controllers/audit.controller.js';
import { IZIN, PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { izinkan, wajibIzin } from '../middlewares/role.js';

export const auditRouter = Router();

auditRouter.use(wajibLogin, izinkan(PERAN.ADMIN), wajibIzin(IZIN.AUDIT_BACA));

auditRouter.get('/', controller.daftar);
