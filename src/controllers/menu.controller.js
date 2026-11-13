import {
  hapusMenuAdmin,
  menuUntukProfil,
  pohonMenuAdmin,
  simpanMenuAdmin
} from '../services/menu.service.js';
import { kirimSukses } from '../utils/response.js';

export const daftar = async (req, res) =>
  kirimSukses(res, { data: await menuUntukProfil(req.profile) });

export const semua = async (_req, res) => kirimSukses(res, { data: await pohonMenuAdmin() });

export const simpan = async (req, res) =>
  kirimSukses(res, {
    message: 'Menu disimpan.',
    data: await simpanMenuAdmin(req.params.id && req.params.id !== 'baru' ? req.params.id : null, req.body, req.profile)
  });

export const hapus = async (req, res) =>
  kirimSukses(res, {
    message: 'Menu dihapus.',
    data: await hapusMenuAdmin(req.params.id, req.profile)
  });
