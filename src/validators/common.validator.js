import { z } from 'zod';
import { PAGINATION } from '../constants/index.js';
import { keTanggal } from '../utils/tanggal.js';

export const tanggalWajib = z
  .union([z.string().min(1), z.date()])
  .transform((nilai) => keTanggal(nilai))
  .refine((nilai) => nilai instanceof Date, 'Tanggal tidak valid.');

export const tanggalOpsional = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((nilai) => (nilai ? keTanggal(nilai) : null));

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
