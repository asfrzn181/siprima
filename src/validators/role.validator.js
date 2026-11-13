import { z } from 'zod';

export const skemaUbahIzinPeran = z.object({
  izin: z.array(z.string().trim().min(1).max(80)).max(200)
});
