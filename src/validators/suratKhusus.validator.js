import { z } from 'zod';
import { skemaPagination, tanggalOpsional, tanggalWajib } from './common.validator.js';

const teks = (maks) => z.string().trim().min(1, 'Wajib diisi.').max(maks);

export const skemaSuratKhusus = z.object({
  jenisId: z.string().trim().max(200).optional(),
  tentang: teks(200),
  nomor: z.string().trim().max(120).optional().default(''),
  seqPilihan: z.coerce.number().int().min(1).optional(),
  tanggal: tanggalWajib,
  keterangan: z.string().trim().max(1000).default('')
});

export const skemaBatalKhusus = z.object({
  alasan: z
    .string()
    .trim()
    .min(1, 'Keterangan pembatalan wajib diisi.')
    .max(300, 'Keterangan pembatalan maksimal 300 karakter.')
});

export const skemaFilterSuratKhusus = skemaPagination.extend({
  search: z.string().trim().max(200).default(''),
  status: z.enum(['', 'Aktif', 'Dibatalkan']).default(''),
  tglMulai: tanggalOpsional,
  tglSelesai: tanggalOpsional
});
