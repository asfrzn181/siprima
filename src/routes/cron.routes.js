import { Router } from 'express';
import * as controller from '../controllers/cron.controller.js';
import { wajibKunciCron } from '../middlewares/cronAuth.js';
import { batasiCron } from '../middlewares/rateLimit.js';
import { validasi } from '../middlewares/validate.js';
import { skemaDaftarRun, skemaNamaJob, skemaRunId } from '../validators/cron.validator.js';

export const cronRouter = Router();

cronRouter.use(batasiCron);

cronRouter.get('/health', controller.health);

cronRouter.use(wajibKunciCron);

cronRouter.get('/jobs', controller.jobs);
cronRouter.get('/runs', validasi(skemaDaftarRun, 'query'), controller.runs);
cronRouter.get('/runs/:run_id', validasi(skemaRunId, 'params'), controller.runDetail);
cronRouter.post('/run/:job_name', validasi(skemaNamaJob, 'params'), controller.run);
