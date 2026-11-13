import { resolusiBerkas } from '../services/berkas.service.js';
import {
  ambilMasuk,
  berkasMasuk,
  daftarMasuk,
  disposisiMasuk,
  eksporMasuk,
  lampirkanScanMasuk,
  tambahMasuk,
  tindakLanjutMasuk,
  ubahMasuk
} from '../services/suratMasuk.service.js';
import { kirimSukses } from '../utils/response.js';

const kirimBerkas = (res, berkas) => {
  const hasil = resolusiBerkas(berkas);
  if (hasil.jenis === 'tautan') return res.redirect(hasil.url);
  return res.download(hasil.lokasi, hasil.nama);
};

export const daftar = async (req, res) =>
  kirimSukses(res, { data: await daftarMasuk(req.profile, req.query) });

export const ekspor = async (req, res) =>
  kirimSukses(res, { data: await eksporMasuk(req.profile, req.query) });

export const ambil = async (req, res) =>
  kirimSukses(res, { data: await ambilMasuk(req.params.id, req.profile) });

export const tambah = async (req, res) =>
  kirimSukses(res, {
    status: 201,
    message: 'Surat masuk berhasil dicatat.',
    data: await tambahMasuk(req.body, req.profile)
  });

export const ubah = async (req, res) =>
  kirimSukses(res, {
    message: 'Surat masuk berhasil diperbarui.',
    data: await ubahMasuk(req.params.id, req.body, req.profile)
  });

export const disposisi = async (req, res) =>
  kirimSukses(res, {
    message: 'Disposisi berhasil disimpan.',
    data: await disposisiMasuk(req.params.id, req.body, req.profile)
  });

export const tindakLanjut = async (req, res) =>
  kirimSukses(res, {
    message: 'Tindak lanjut berhasil disimpan.',
    data: await tindakLanjutMasuk(req.params.id, req.body, req.profile)
  });

export const unggahScan = async (req, res) =>
  kirimSukses(res, {
    status: 201,
    message: 'Scan berhasil diunggah.',
    data: await lampirkanScanMasuk(req.params.id, req.file, req.profile)
  });

export const unduhBerkas = async (req, res) =>
  kirimBerkas(res, await berkasMasuk(req.params.id, req.profile));
