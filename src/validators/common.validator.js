import { z } from 'zod';
import { PAGINATION } from '../constants/index.js';
import { tanggalMurni } from '../utils/tanggal.js';

const pesanTanggal = { code: z.ZodIssueCode.custom, message: 'Tanggal tidak valid (format YYYY-MM-DD).' };

export const tanggalWajib = z
  .union([z.string().min(1, 'Tanggal wajib diisi.'), z.date()])
  .transform((nilai, ctx) => {
    const hasil = tanggalMurni(nilai);
    if (!hasil) {
      ctx.addIssue(pesanTanggal);
      return z.NEVER;
    }
    return hasil;
  });

export const tanggalOpsional = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((nilai, ctx) => {
    if (nilai === null || nilai === undefined || nilai === '') return null;
    const hasil = tanggalMurni(nilai);
    if (!hasil) {
      ctx.addIssue(pesanTanggal);
      return z.NEVER;
    }
    return hasil;
  });

export const skemaPagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT)
});

export const skemaId = z.object({
  id: z.string().min(1, 'ID wajib diisi.').max(200)
});

export const skemaKataKunci = z.object({
  q: z.string().trim().max(200).default(''),
  limit: z.coerce.number().int().min(1).max(20).default(5)
});
