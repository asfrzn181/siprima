import { app } from './app.js';
import { env } from './config/env.js';
import { catatError, catatInfo } from './config/logger.js';
import { pastikanFolderUnggahan } from './repositories/storage.repository.js';

const jalankan = () => {
  pastikanFolderUnggahan();
  const server = app.listen(env.PORT, () => {
    catatInfo('SiPrima berjalan', { port: env.PORT, env: env.NODE_ENV });
  });

  const hentikan = (sinyal) => {
    catatInfo('SiPrima dihentikan', { sinyal });
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => hentikan('SIGTERM'));
  process.on('SIGINT', () => hentikan('SIGINT'));
  process.on('unhandledRejection', (error) => catatError(error, { sumber: 'unhandledRejection' }));
  process.on('uncaughtException', (error) => {
    catatError(error, { sumber: 'uncaughtException' });
    process.exit(1);
  });
};

jalankan();
