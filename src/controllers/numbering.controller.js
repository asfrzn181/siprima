import {
  cariNomorLengkap,
  kedaluwarsa,
  pratinjau,
  reservasi,
  verifikasi
} from '../services/numbering.service.js';
import { kirimSukses } from '../utils/response.js';

export const pratinjauNomor = async (req, res) =>
  kirimSukses(res, { data: await pratinjau(req.body, req.profile) });

export const reservasiNomor = async (req, res) =>
  kirimSukses(res, {
    status: 201,
    message: 'Nomor berhasil direservasi.',
    data: await reservasi(req.body, req.profile)
  });

export const kedaluwarsaNomor = async (req, res) =>
  kirimSukses(res, { data: { jumlah: (await kedaluwarsa(req.profile)).length } });

export const verifikasiNomor = async (req, res) =>
  kirimSukses(res, { data: await verifikasi(req.query.tahun, req.query.scope) });

export const cariNomor = async (req, res) =>
  kirimSukses(res, { data: await cariNomorLengkap(req.query.nomor) });
