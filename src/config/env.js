import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const akarProyek = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const boolean = (bawaan) =>
  z
    .enum(['true', 'false', '1', '0', ''])
    .optional()
    .transform((nilai) => (nilai === undefined || nilai === '' ? bawaan : ['true', '1'].includes(nilai)));

const skema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(1),

  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1).default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('siprima'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DB_SSL: boolean(false),

  SESSION_COOKIE_NAME: z.string().min(1).default('siprima_session'),
  SESSION_MAX_AGE_HOURS: z.coerce.number().int().min(1).max(336).default(8),
  CSRF_COOKIE_NAME: z.string().min(1).default('siprima_csrf'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
  AUTH_EXPOSE_RESET_TOKEN: boolean(false),

  CORS_ORIGINS: z.string().default(''),

  CRON_API_KEY_HEADER: z.string().min(1).default('x-cron-key'),
  CRON_RUN_HISTORY_LIMIT: z.coerce.number().int().min(1).max(500).default(50),

  UPLOAD_DIR: z.string().min(1).default(path.join(akarProyek, 'storage', 'scan')),
  BACKUP_DIR: z.string().min(1).default(path.join(akarProyek, 'storage', 'backup')),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(20).default(5),

  LOG_DIR: z.string().min(1).default(path.join(akarProyek, 'logs')),
  LOG_FILE: z.string().min(1).default('siprima-error.log'),

  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  RATE_LIMIT_MAX: z.coerce.number().int().min(10).max(100000).default(300),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(10),
  CRON_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(10000).default(120)
});

const mentah = Object.fromEntries(
  Object.keys(skema.shape).map((kunci) => [kunci, process.env[kunci]])
);

const hasil = skema.safeParse(mentah);

if (!hasil.success) {
  const daftar = hasil.error.issues
    .map((issue) => `- ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Konfigurasi environment tidak valid:\n${daftar}`);
}

const data = hasil.data;

export const env = Object.freeze({
  ...data,
  akarProyek,
  folderPublic: path.join(akarProyek, 'public'),
  produksi: data.NODE_ENV === 'production',
  ambilDariProxy: data.TRUST_PROXY > 0,
  masaSesiMs: data.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000,
  batasUnggahByte: data.MAX_UPLOAD_MB * 1024 * 1024,
  daftarCors: data.CORS_ORIGINS.split(',')
    .map((item) => item.trim())
    .filter(Boolean)
});
