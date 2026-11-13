import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { suratMasukRouter } from './suratMasuk.routes.js';
import { suratKeluarRouter } from './suratKeluar.routes.js';
import { numberingRouter } from './numbering.routes.js';
import { userRouter } from './users.routes.js';
import { masterBidangRouter } from './masterBidang.routes.js';
import { masterNomorRouter } from './masterNomor.routes.js';
import { pengaturanRouter } from './pengaturan.routes.js';
import { auditRouter } from './audit.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { laporanRouter } from './laporan.routes.js';
import { cronRouter } from './cron.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/surat-masuk', suratMasukRouter);
apiRouter.use('/surat-keluar', suratKeluarRouter);
apiRouter.use('/nomor', numberingRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/master/bidang', masterBidangRouter);
apiRouter.use('/master/nomor', masterNomorRouter);
apiRouter.use('/pengaturan', pengaturanRouter);
apiRouter.use('/audit', auditRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/laporan', laporanRouter);
apiRouter.use('/cron', cronRouter);
