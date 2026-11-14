import { z } from 'zod';
import { SIFAT, STATUS_KELUAR } from '../constants/index.js';
import { skemaPagination, tanggalOpsional, tanggalWajib } from './common.validator.js';

const teks = (maks) => z.string().trim().min(1, 'Wajib diisi.').max(maks);

export const skemaPayloadSuratKeluar = z.object({
  jenisId: z.string().trim().min(1, 'Jenis nomor wajib dipilih.').max(200),
  tglSurat: tanggalWajib,
  bidangPembuat: z.string().trim().max(40).optional(),
  tujuan: teks(200),
  hal: teks(200),
  isiRingkas: teks(2000),
  sifat: z.enum([SIFAT.BIASA, SIFAT.RAHASIA]).default(SIFAT.BIASA),
  tandaTangan: z.enum(['TTE', 'BASAH']).default('BASAH'),
  aksesBidang: z.array(z.string().trim().max(40)).default([])
});

export const skemaUbahSuratKeluar = z.object({
  tglSurat: tanggalWajib.optional(),
  tujuan: teks(200).optional(),
  hal: teks(200).optional(),
  isiRingkas: teks(2000).optional(),
  sifat: z.enum([SIFAT.BIASA, SIFAT.RAHASIA]).optional(),
  tandaTangan: z.enum(['TTE', 'BASAH']).optional(),
  aksesBidang: z.array(z.string().trim().max(40)).optional(),
  fileUrl: z.string().trim().max(1000).optional(),
  fileId: z.string().trim().max(300).optional()
});

export const skemaReservasi = z.object({
  menu: z.enum(['SURAT_KELUAR', 'SK', 'SE']).default('SURAT_KELUAR'),
  jenisId: z.string().trim().max(200).optional(),
  bidangKode: z.string().trim().max(40).optional(),
  tanggal: tanggalWajib,
  reservationIdLama: z.string().trim().max(200).optional(),
  perihal: z.string().trim().max(200).optional(),
  tujuan: z.string().trim().max(200).optional()
});

export const skemaTersediaNomor = z.object({
  menu: z.enum(['SURAT_KELUAR', 'SK', 'SE']).default('SURAT_KELUAR'),
  jenisId: z.string().trim().max(200).optional(),
  bidangKode: z.string().trim().max(40).optional(),
  tanggal: tanggalOpsional
});

export const skemaBatal = z.object({
  alasan: z
    .string()
    .trim()
    .min(1, 'Keterangan pembatalan wajib diisi.')
    .max(300, 'Keterangan pembatalan maksimal 300 karakter.')
});

export const skemaKoreksi = z.object({
  payload: skemaPayloadSuratKeluar,
  reason: z.string().trim().max(300).default('Koreksi nomor oleh admin')
});

export const skemaGunakanUlang = z.object({
  payload: skemaPayloadSuratKeluar
});

export const skemaFilterSuratKeluar = skemaPagination.extend({
  search: z.string().trim().max(200).default(''),
  sifat: z.enum(['semua', SIFAT.BIASA, SIFAT.RAHASIA]).default('semua'),
  status: z.enum(['semua', STATUS_KELUAR.AKTIF, STATUS_KELUAR.DIBATALKAN]).default('semua'),
  bidang: z.string().trim().max(40).default(''),
  tglMulai: tanggalOpsional,
  tglSelesai: tanggalOpsional
});
