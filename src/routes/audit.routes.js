import { Router } from 'express';
import * as controller from '../controllers/audit.controller.js';
import { PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { izinkan } from '../middlewares/role.js';

export const auditRouter = Router();

auditRouter.use(wajibLogin, izinkan(PERAN.ADMIN));

auditRouter.get('/', controller.daftar);
