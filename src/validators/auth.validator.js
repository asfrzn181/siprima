import { z } from 'zod';

export const skemaLogin = z.object({
  email: z.string().trim().email('Format email tidak valid.'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter.').max(200)
});

export const skemaRegister = z.object({
  email: z.string().trim().email('Format email tidak valid.'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.').max(200),
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(120),
  bidang: z.string().trim().max(40).default('')
});

export const skemaLupaSandi = z.object({
  email: z.string().trim().email('Format email tidak valid.')
});

export const skemaResetSandi = z.object({
  token: z.string().trim().min(32, 'Token tidak valid.').max(200),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.').max(200)
});

export const skemaUbahSandi = z.object({
  sandiLama: z.string().min(1, 'Kata sandi lama wajib diisi.').max(200),
  sandiBaru: z.string().min(8, 'Kata sandi baru minimal 8 karakter.').max(200)
});
