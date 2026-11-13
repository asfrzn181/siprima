import { Router } from 'express';
import {
  csrf,
  login,
  logout,
  mintaReset,
  refresh,
  register,
  reset,
  sesi
} from '../controllers/auth.controller.js';
import { wajibLogin } from '../middlewares/auth.js';
import { verifikasiCsrf } from '../middlewares/csrf.js';
import { batasiLogin } from '../middlewares/rateLimit.js';
import { validasi } from '../middlewares/validate.js';
import {
  skemaLogin,
  skemaLupaSandi,
  skemaRegister,
  skemaResetSandi
} from '../validators/auth.validator.js';

export const authRouter = Router();

authRouter.get('/csrf', csrf);
authRouter.post('/login', batasiLogin, verifikasiCsrf, validasi(skemaLogin), login);
authRouter.post('/register', batasiLogin, verifikasiCsrf, validasi(skemaRegister), register);
authRouter.post('/refresh', verifikasiCsrf, refresh);
authRouter.post('/logout', verifikasiCsrf, logout);
authRouter.get('/session', wajibLogin, sesi);
authRouter.post('/password/forgot', batasiLogin, verifikasiCsrf, validasi(skemaLupaSandi), mintaReset);
authRouter.post('/password/reset', batasiLogin, verifikasiCsrf, validasi(skemaResetSandi), reset);
