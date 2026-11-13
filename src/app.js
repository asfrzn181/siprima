import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { pastikanCsrf } from './middlewares/csrf.js';
import { cors } from './middlewares/cors.js';
import { batasiApi } from './middlewares/rateLimit.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY > 0 ? env.TRUST_PROXY : false);

// Aplikasi bisa dipasang di subfolder (cPanel Application URL `domain/siprima`).
// Passenger belum tentu menghapus prefix tersebut, jadi kita normalisasi sendiri.
if (env.BASE_PATH) {
  app.use((req, res, next) => {
    if (req.url === env.BASE_PATH) return res.redirect(301, `${env.BASE_PATH}/`);
    if (req.url.startsWith(`${env.BASE_PATH}/`)) {
      req.url = req.url.slice(env.BASE_PATH.length);
    }
    next();
  });
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'same-origin' }
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cors);
app.use(pastikanCsrf);

app.use(
  express.static(env.folderPublic, {
    index: 'index.html',
    maxAge: env.produksi ? '1h' : 0,
    setHeaders: (res, lokasi) => {
      if (lokasi.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
    }
  })
);

app.use('/api', batasiApi, (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);
