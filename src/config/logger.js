import fs from 'node:fs';
import path from 'node:path';
import { env } from './env.js';

const pastikanFolder = (folder) => {
  fs.mkdirSync(folder, { recursive: true });
};

export const catatError = (error, konteks = {}) => {
  const waktu = new Date().toISOString();
  const pesan = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';
  const detail = JSON.stringify({ ...konteks, pesan, stack }, null, 2);
  try {
    pastikanFolder(env.LOG_DIR);
    fs.appendFileSync(path.join(env.LOG_DIR, env.LOG_FILE), `[${waktu}] ${detail}\n`);
  } catch (logError) {
    // Jika folder log tidak bisa ditulis, jangan sampai menutupi error asli.
    console.error('Gagal menulis log:', logError.message);
  }
};

export const catatInfo = (pesan, data = {}) => {
  try {
    pastikanFolder(env.LOG_DIR);
    fs.appendFileSync(
      path.join(env.LOG_DIR, env.LOG_FILE),
      `[${new Date().toISOString()}] ${pesan} ${JSON.stringify(data)}\n`
    );
  } catch (logError) {
    console.error('Gagal menulis log:', logError.message);
  }
};
