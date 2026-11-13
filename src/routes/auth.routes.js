import { Router } from 'express';
import { csrf, login, logout, sesi } from '../controllers/auth.controller.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { batasiLogin } from '../middlewares/rateLimit.js';
import { validasi } from '../middlewares/validate.js';
import { skemaLogin } from '../validators/auth.validator.js';

export const authRouter = Router();

authRouter.get('/csrf', csrf);
authRouter.post('/login', batasiLogin, verifikasiCsrf, validasi(skemaLogin), login);
authRouter.post('/logout', wajibLogin, verifikasiCsrf, logout);
authRouter.get('/session', wajibLogin, sesi);
