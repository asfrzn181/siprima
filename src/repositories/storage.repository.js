import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

export const pastikanFolderUnggahan = () => {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
};

export const lokasiBerkas = (namaBerkas) => {
  const namaAman = path.basename(String(namaBerkas || ''));
  if (!namaAman || namaAman !== String(namaBerkas || '')) {
    throw new Error('Nama berkas tidak valid.');
  }
  const lokasi = path.join(env.UPLOAD_DIR, namaAman);
  const resolusi = path.resolve(lokasi);
  const akar = path.resolve(env.UPLOAD_DIR);
  if (!resolusi.startsWith(`${akar}${path.sep}`)) {
    throw new Error('Nama berkas tidak valid.');
  }
  return resolusi;
};

export const berkasAda = (namaBerkas) => {
  if (!namaBerkas) return false;
  try {
    return fs.existsSync(lokasiBerkas(namaBerkas));
  } catch {
    return false;
  }
};

export const hapusBerkas = (namaBerkas) => {
  if (!namaBerkas) return;
  try {
    fs.rmSync(lokasiBerkas(namaBerkas), { force: true });
  } catch {
    // Berkas lama yang hilang bukan alasan menggagalkan transaksi data.
  }
};
