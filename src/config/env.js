import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const akarProyek = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const skema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(1),

  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_PRIVATE_KEY_PATH: z.string().optional(),
  FIREBASE_WEB_API_KEY: z.string().min(10),
  FIREBASE_STORAGE_BUCKET: z.string().optional().default(''),

  SESSION_COOKIE_NAME: z.string().min(1).default('siprima_session'),
  SESSION_MAX_AGE_HOURS: z.coerce.number().int().min(1).max(336).default(8),
  CSRF_COOKIE_NAME: z.string().min(1).default('siprima_csrf'),

  UPLOAD_DIR: z
    .string()
    .min(1)
    .default(path.join(akarProyek, 'storage', 'scan')),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(20).default(5),

  LOG_DIR: z.string().min(1).default(path.join(akarProyek, 'logs')),
  LOG_FILE: z.string().min(1).default('siprima-error.log'),

  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  RATE_LIMIT_MAX: z.coerce.number().int().min(10).max(100000).default(300),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(10)
});

const mentah = {
  NODE_ENV: process.env.NODE_ENV,
  APP_BASE_URL: process.env.APP_BASE_URL,
  PORT: process.env.PORT,
  TRUST_PROXY: process.env.TRUST_PROXY,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_PRIVATE_KEY_PATH: process.env.FIREBASE_PRIVATE_KEY_PATH,
  FIREBASE_WEB_API_KEY: process.env.FIREBASE_WEB_API_KEY,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_HOURS: process.env.SESSION_MAX_AGE_HOURS,
  CSRF_COOKIE_NAME: process.env.CSRF_COOKIE_NAME,
  UPLOAD_DIR: process.env.UPLOAD_DIR,
  MAX_UPLOAD_MB: process.env.MAX_UPLOAD_MB,
  LOG_DIR: process.env.LOG_DIR,
  LOG_FILE: process.env.LOG_FILE,
  RATE_LIMIT_WINDOW_MINUTES: process.env.RATE_LIMIT_WINDOW_MINUTES,
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_MAX: process.env.LOGIN_RATE_LIMIT_MAX
};

const hasil = skema.safeParse(mentah);

if (!hasil.success) {
  const daftar = hasil.error.issues
    .map((issue) => `- ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  // Gagal cepat saat startup dengan pesan yang bisa dibaca dari cPanel.
  throw new Error(`Konfigurasi environment tidak valid:\n${daftar}`);
}

const data = hasil.data;

const bacaPrivateKey = () => {
  if (data.FIREBASE_PRIVATE_KEY) {
    return data.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  }
  if (data.FIREBASE_PRIVATE_KEY_PATH) {
    const lokasi = path.resolve(data.FIREBASE_PRIVATE_KEY_PATH);
    if (!fs.existsSync(lokasi)) {
      throw new Error(`FIREBASE_PRIVATE_KEY_PATH tidak ditemukan: ${lokasi}`);
    }
    return fs.readFileSync(lokasi, 'utf8');
  }
  throw new Error('Isi FIREBASE_PRIVATE_KEY atau FIREBASE_PRIVATE_KEY_PATH.');
};

export const env = Object.freeze({
  ...data,
  akarProyek,
  folderPublic: path.join(akarProyek, 'public'),
  privateKey: bacaPrivateKey(),
  produksi: data.NODE_ENV === 'production',
  ambilDariProxy: data.TRUST_PROXY > 0,
  masaSesiMs: data.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000,
  batasUnggahByte: data.MAX_UPLOAD_MB * 1024 * 1024
});
