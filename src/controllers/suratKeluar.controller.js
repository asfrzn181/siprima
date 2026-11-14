import { resolusiBerkas } from '../services/berkas.service.js';
import {
  ambilKeluar,
  batalkanKeluar,
  berkasKeluar,
  daftarKeluar,
  eksporKeluar,
  koreksiKeluar,
  pakaiUlangNomor,
  tambahKeluar,
  ubahKeluar
} from '../services/suratKeluar.service.js';
import { kirimSukses } from '../utils/response.js';

const kirimBerkas = (res, berkas) => {
  const hasil = resolusiBerkas(berkas);
  if (hasil.jenis === 'tautan') return res.redirect(hasil.url);
  return res.download(hasil.lokasi, hasil.nama);
};

export const daftar = async (req, res) =>
  kirimSukses(res, { data: await daftarKeluar(req.profile, req.query) });

export const ekspor = async (req, res) =>
  kirimSukses(res, { data: await eksporKeluar(req.profile, req.query) });

export const ambil = async (req, res) =>
  kirimSukses(res, { data: await ambilKeluar(req.params.id, req.profile) });

export const tambah = async (req, res) =>
  kirimSukses(res, {
    status: 201,
    message: 'Surat keluar berhasil diterbitkan.',
    data: await tambahKeluar(req.body, req.profile)
  });

export const ubah = async (req, res) =>
  kirimSukses(res, {
    message: 'Surat keluar berhasil diperbarui.',
    data: await ubahKeluar(req.params.id, req.body, req.profile)
  });

export const batal = async (req, res) =>
  kirimSukses(res, {
    message: 'Surat keluar dibatalkan.',
    data: await batalkanKeluar(req.params.id, req.body.alasan, req.profile)
  });

export const koreksi = async (req, res) =>
  kirimSukses(res, {
    message: 'Nomor surat berhasil dikoreksi.',
    data: await koreksiKeluar({ id: req.params.id, ...req.body, profil: req.profile })
  });

export const pakaiUlang = async (req, res) =>
  kirimSukses(res, {
    message: 'Nomor berhasil digunakan kembali.',
    data: await pakaiUlangNomor({ id: req.params.id, payload: req.body.payload, profil: req.profile })
  });

export const unduhBerkas = async (req, res) =>
  kirimBerkas(res, await berkasKeluar(req.params.id, req.profile));
