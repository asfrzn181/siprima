import { z } from 'zod';
import { GOLONGAN, SCOPE_NOMOR } from '../constants/index.js';
import { normalizeFormatGolongan, normalizeGolongan } from '../utils/nomor.js';

export const skemaMasterBidang = z.object({
  kode: z.string().trim().min(1, 'Kode wajib diisi.').max(40),
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(120),
  aktif: z.boolean().default(true)
});

export const skemaMasterNomor = z
  .object({
    nama: z.string().trim().min(1, 'Nama wajib diisi.').max(120),
    golongan: z.enum(GOLONGAN).default('LAINNYA'),
    format: z.string().trim().min(1, 'Format wajib diisi.').max(180),
    kode: z.string().trim().min(1, 'Kode klasifikasi wajib diisi.').max(40),
    resetTahunan: z.boolean().default(true),
    urutanPerBidang: z.boolean().default(false),
    aktif: z.boolean().default(true)
  })
  .transform((data) => ({
    ...data,
    golongan: normalizeGolongan(data.golongan),
    format: normalizeFormatGolongan(data.format, data.golongan)
  }));

export const skemaBatchMasterNomor = z.object({
  rows: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(200),
        data: skemaMasterNomor
      })
    )
    .min(1, 'Tidak ada baris valid untuk diimpor.')
    .max(2000)
});

export const skemaPengaturan = z.object({
  namaDinas: z.string().trim().max(180).default(''),
  appsScriptUrl: z.string().trim().max(500).default(''),
  numberingScope: z
    .enum([SCOPE_NOMOR.GLOBAL_PER_TAHUN, SCOPE_NOMOR.PER_KLASIFIKASI])
    .default(SCOPE_NOMOR.GLOBAL_PER_TAHUN),
  reservationMinutes: z.coerce.number().int().min(1).max(1440).default(15)
});

export const skemaVerifikasiNomor = z.object({
  tahun: z.coerce.number().int().min(2000).max(2100),
  scope: z.string().trim().max(100).optional()
});

export const skemaCariNomorLengkap = z.object({
  nomor: z.string().trim().min(1, 'Nomor surat wajib diisi.').max(200)
});
