import { createHash, randomUUID } from 'node:crypto';

export const hashSha256 = (nilai) => createHash('sha256').update(String(nilai)).digest('hex');

export const idAcak = () => randomUUID();

export const acakHex = (panjang = 32) =>
  createHash('sha256').update(randomUUID()).digest('hex').slice(0, panjang);
