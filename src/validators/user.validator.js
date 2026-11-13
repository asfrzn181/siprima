import { z } from 'zod';
import { PERAN } from '../constants/index.js';

export const skemaBuatUser = z.object({
  email: z.string().trim().email('Format email tidak valid.'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter.').max(200),
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(120),
  role: z.enum([PERAN.ADMIN, PERAN.OPERATOR, PERAN.PIMPINAN, PERAN.BIDANG]),
  bidang: z.string().trim().max(40).default(''),
  aktif: z.boolean().default(true)
});

export const skemaUbahUser = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(120),
  role: z.enum([PERAN.ADMIN, PERAN.OPERATOR, PERAN.PIMPINAN, PERAN.BIDANG]),
  bidang: z.string().trim().max(40).default(''),
  aktif: z.boolean()
});
