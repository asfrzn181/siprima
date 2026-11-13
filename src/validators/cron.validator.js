import { z } from 'zod';

export const skemaNamaJob = z.object({
  job_name: z.string().trim().min(1, 'Nama job wajib diisi.').max(80)
});

export const skemaRunId = z.object({
  run_id: z.string().uuid('Run ID tidak valid.')
});

export const skemaDaftarRun = z.object({
  job_name: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional()
});
