import { Router } from 'express';
import * as controller from '../controllers/dashboard.controller.js';
import { IZIN, PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { izinkan, wajibIzin } from '../middlewares/role.js';

export const dashboardRouter = Router();

dashboardRouter.use(
  wajibLogin,
  izinkan(PERAN.ADMIN, PERAN.OPERATOR, PERAN.PIMPINAN),
  wajibIzin(IZIN.DASHBOARD_BACA)
);

dashboardRouter.get('/', controller.ringkasan);
