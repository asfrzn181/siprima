import { z } from 'zod';

export const skemaMenu = z.object({
  kunci: z
    .string()
    .trim()
    .min(1, 'Kunci wajib diisi.')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Kunci hanya huruf kecil, angka, dan tanda hubung.'),
  label: z.string().trim().min(1, 'Label wajib diisi.').max(120),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  href: z.string().trim().max(160).default(''),
  izin: z
    .string()
    .trim()
    .max(80)
    .nullable()
    .optional()
    .transform((nilai) => (nilai ? nilai : null)),
  urutan: z.coerce.number().int().min(0).max(9999).default(0),
  aktif: z.boolean().default(true)
});
