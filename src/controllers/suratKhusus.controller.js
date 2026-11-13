import * as service from '../services/suratKhusus.service.js';
import { kirimSukses } from '../utils/response.js';

export const buatController = (jenis) => ({
  daftar: async (req, res) => kirimSukses(res, { data: await service.daftar(jenis, req.query) }),
  ambil: async (req, res) => kirimSukses(res, { data: await service.ambil(jenis, req.params.id) }),
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
      message: `Surat ${jenis} dihapus.`,
      data: await service.hapus(jenis, req.params.id, req.profile)
    })
});
