import * as service from '../services/suratKhusus.service.js';
import { kirimSukses } from '../utils/response.js';

export const buatController = (jenis) => ({
  daftar: async (req, res) =>
    kirimSukses(res, { data: await service.daftar(jenis, req.query, req.profile) }),
  ambil: async (req, res) =>
    kirimSukses(res, { data: await service.ambil(jenis, req.params.id, req.profile) }),
  tersedia: async (req, res) =>
    kirimSukses(res, { data: await service.nomorTersedia(jenis, req.query, req.profile) }),
  tambah: async (req, res) =>
    kirimSukses(res, {
      status: 201,
      message: `Surat ${jenis} tersimpan.`,
      data: await service.tambah(jenis, req.body, req.profile)
    }),
  ubah: async (req, res) =>
    kirimSukses(res, {
      message: `Surat ${jenis} diperbarui.`,
      data: await service.ubah(jenis, req.params.id, req.body, req.profile)
    }),
  hapus: async (req, res) =>
    kirimSukses(res, {
      message: `Surat ${jenis} dibatalkan.`,
      data: await service.hapus(jenis, req.params.id, req.body.alasan, req.profile)
    })
});
