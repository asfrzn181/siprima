import { bacaPagination } from '../utils/pagination.js';
import { buatPengguna, daftarPengguna, ubahPengguna } from '../services/user.service.js';
import { kirimSukses } from '../utils/response.js';

export const daftar = async (req, res) =>
  kirimSukses(res, { data: await daftarPengguna(bacaPagination(req.query)) });

export const buat = async (req, res) =>
  kirimSukses(res, {
    status: 201,
    message: 'Pengguna berhasil dibuat.',
    data: await buatPengguna(req.body, req.profile)
  });

export const ubah = async (req, res) =>
  kirimSukses(res, {
    message: 'Pengguna berhasil diperbarui.',
    data: await ubahPengguna(req.params.id, req.body, req.profile)
  });
