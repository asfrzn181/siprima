import {
  cariNomorLengkap,
  daftarTersedia,
  kedaluwarsa,
  pratinjau,
  verifikasi
} from '../services/numbering.service.js';
import { kirimSukses } from '../utils/response.js';

export const pratinjauNomor = async (req, res) =>
  kirimSukses(res, { data: await pratinjau(req.body, req.profile) });

export const tersedia = async (req, res) =>
  kirimSukses(res, { data: await daftarTersedia(req.query, req.profile) });

export const kedaluwarsaNomor = async (req, res) =>
  kirimSukses(res, { data: { jumlah: (await kedaluwarsa(req.profile)).length } });

export const verifikasiNomor = async (req, res) =>
  kirimSukses(res, { data: await verifikasi(req.query.tahun, req.query.scope) });

export const cariNomor = async (req, res) =>
  kirimSukses(res, { data: await cariNomorLengkap(req.query.nomor) });
