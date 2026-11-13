import { z } from 'zod';

export const skemaLogin = z.object({
  email: z.string().trim().email('Format email tidak valid.'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter.').max(200)
});
