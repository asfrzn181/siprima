import { bacaPengaturan, ubahPengaturan } from '../services/settings.service.js';
import { kirimSukses } from '../utils/response.js';

export const ambil = async (_req, res) => kirimSukses(res, { data: await bacaPengaturan() });

export const simpan = async (req, res) =>
  kirimSukses(res, {
    message: 'Pengaturan tersimpan.',
    data: await ubahPengaturan(req.body, req.profile)
  });
