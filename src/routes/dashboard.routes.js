import { Router } from 'express';
import * as controller from '../controllers/dashboard.controller.js';
import { PERAN } from '../constants/index.js';
import { wajibLogin } from '../middlewares/auth.js';
import { izinkan } from '../middlewares/role.js';

export const dashboardRouter = Router();

dashboardRouter.use(wajibLogin, izinkan(PERAN.ADMIN, PERAN.PIMPINAN));

dashboardRouter.get('/', controller.ringkasan);
