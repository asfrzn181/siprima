import { z } from 'zod';
import { SIFAT, STATUS_MASUK } from '../constants/index.js';
import { skemaPagination, tanggalOpsional, tanggalWajib } from './common.validator.js';

const teks = (maks) => z.string().trim().min(1, 'Wajib diisi.').max(maks);

export const skemaSuratMasuk = z.object({
  tglTerima: tanggalWajib,
  tglSurat: tanggalWajib,
  noSurat: teks(120),
  asal: teks(160),
  hal: teks(200),
  isiRingkas: teks(2000),
  sifat: z.enum([SIFAT.BIASA, SIFAT.RAHASIA]).default(SIFAT.BIASA),
  aksesBidang: z.array(z.string().trim().max(40)).default([]),
  fileUrl: z.string().trim().max(1000).default(''),
  fileId: z.string().trim().max(300).default('')
});

export const skemaDisposisi = z.object({
  kepada: z.array(z.string().trim().min(1).max(40)).min(1, 'Pilih minimal satu bidang.'),
  diputuskanOleh: z.string().trim().max(80).default('Kadis'),
  catatan: z.string().trim().max(1000).default('')
});

export const skemaTindakLanjut = z.object({
  catatan: z.string().trim().max(1000).default('')
});

export const skemaFilterSuratMasuk = skemaPagination.extend({
  search: z.string().trim().max(200).default(''),
  sifat: z.enum(['semua', SIFAT.BIASA, SIFAT.RAHASIA]).default('semua'),
  status: z
    .enum(['semua', STATUS_MASUK.BARU, STATUS_MASUK.DIDISPOSISIKAN, STATUS_MASUK.SELESAI])
    .default('semua'),
  tglMulai: tanggalOpsional,
  tglSelesai: tanggalOpsional
});
