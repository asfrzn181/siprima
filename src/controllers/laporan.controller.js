import { laporanSuratKeluar, laporanSuratMasuk } from '../services/laporan.service.js';
import { kirimSukses } from '../utils/response.js';

export const masuk = async (req, res) =>
  kirimSukses(res, { data: await laporanSuratMasuk(req.query, req.profile) });

export const keluar = async (req, res) =>
  kirimSukses(res, { data: await laporanSuratKeluar(req.query, req.profile) });
