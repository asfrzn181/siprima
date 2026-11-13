import { bacaPagination } from '../utils/pagination.js';
import {
  cariMasterNomor,
  cariMasterNomorKode,
  daftarMasterBidang,
  daftarMasterBidangHalaman,
  daftarMasterNomor,
  daftarSemuaMasterNomor,
  imporMasterNomor,
  simpanMasterBidang,
  simpanMasterNomor
} from '../services/master.service.js';
import { kirimSukses } from '../utils/response.js';

export const daftarBidang = async (req, res) =>
  kirimSukses(res, {
    data: await daftarMasterBidang({ hanyaAktif: req.query.semua !== '1' })
  });

export const daftarBidangHalaman = async (req, res) =>
  kirimSukses(res, { data: await daftarMasterBidangHalaman(bacaPagination(req.query)) });

export const simpanBidang = async (req, res) =>
  kirimSukses(res, {
    message: 'Master bidang tersimpan.',
    data: await simpanMasterBidang(req.params.id, req.body, req.profile)
  });

export const daftarNomor = async (req, res) =>
  kirimSukses(res, { data: await daftarMasterNomor(bacaPagination(req.query)) });

export const daftarSemuaNomor = async (_req, res) =>
  kirimSukses(res, { data: await daftarSemuaMasterNomor() });

export const cariNomor = async (req, res) =>
  kirimSukses(res, { data: await cariMasterNomorKode(req.query.q, req.query.limit) });

export const ambilNomor = async (req, res) =>
  kirimSukses(res, { data: await cariMasterNomor(req.params.id) });

export const simpanNomor = async (req, res) =>
  kirimSukses(res, {
    message: 'Master nomor tersimpan.',
    data: await simpanMasterNomor(req.params.id, req.body, req.profile)
  });

export const imporNomor = async (req, res) =>
  kirimSukses(res, {
    status: 201,
    message: 'Master nomor berhasil diimpor.',
    data: await imporMasterNomor(req.body.rows, req.profile)
  });
