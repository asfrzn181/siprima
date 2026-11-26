import {
  laporanSuratKeluar,
  laporanSuratMasuk,
  laporanSuratSe,
  laporanSuratSk
} from '../services/laporan.service.js';
import { kirimSukses } from '../utils/response.js';

export const masuk = async (req, res) =>
  kirimSukses(res, { data: await laporanSuratMasuk(req.query, req.profile) });

export const keluar = async (req, res) =>
  kirimSukses(res, { data: await laporanSuratKeluar(req.query, req.profile) });

export const sk = async (req, res) =>
  kirimSukses(res, { data: await laporanSuratSk(req.query, req.profile) });

export const se = async (req, res) =>
  kirimSukses(res, { data: await laporanSuratSe(req.query, req.profile) });
