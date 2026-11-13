import { z } from 'zod';
import { skemaPagination, tanggalOpsional, tanggalWajib } from './common.validator.js';

const teks = (maks) => z.string().trim().min(1, 'Wajib diisi.').max(maks);

export const skemaSuratKhusus = z.object({
  tentang: teks(200),
  nomor: teks(120),
  tanggal: tanggalWajib,
  keterangan: z.string().trim().max(1000).default('')
});

export const skemaFilterSuratKhusus = skemaPagination.extend({
  search: z.string().trim().max(200).default(''),
  tglMulai: tanggalOpsional,
  tglSelesai: tanggalOpsional
});
