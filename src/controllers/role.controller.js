import { daftarPeranDanIzin, ubahIzinPeran } from '../services/role.service.js';
import { kirimSukses } from '../utils/response.js';

export const daftar = async (_req, res) => kirimSukses(res, { data: await daftarPeranDanIzin() });

export const ubah = async (req, res) =>
  kirimSukses(res, {
    message: 'Hak akses peran diperbarui.',
    data: await ubahIzinPeran(req.params.nama, req.body.izin, req.profile)
  });
