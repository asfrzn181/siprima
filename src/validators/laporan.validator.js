import { z } from 'zod';
import { SIFAT, STATUS_KELUAR, STATUS_MASUK } from '../constants/index.js';
import { tanggalWajib } from './common.validator.js';

const statusMasuk = ['semua', ...Object.values(STATUS_MASUK)];
const statusKeluar = ['semua', ...Object.values(STATUS_KELUAR)];
const sifat = ['semua', ...Object.values(SIFAT)];

const dasar = z.object({
  tglMulai: tanggalWajib,
  tglSelesai: tanggalWajib,
  sifat: z.enum(sifat).default('semua'),
  bidang: z.string().trim().max(40).default('')
});

export const skemaLaporanMasuk = dasar.extend({
  status: z.enum(statusMasuk).default('semua')
});

export const skemaLaporanKeluar = dasar.extend({
  status: z.enum(statusKeluar).default('semua')
});
