import multer from 'multer';
import { AppError } from '../utils/AppError.js';
import { catatError } from '../config/logger.js';
import { kirimError } from '../utils/response.js';

export const errorHandler = (error, req, res, _next) => {
  if (res.headersSent) return;

  let status = 500;
  let kode = 'KESALAHAN_SERVER';
  let pesan = 'Terjadi kesalahan pada server.';
  let errors = [];

  if (error instanceof AppError) {
    status = error.status;
    kode = error.kode;
    pesan = error.message;
    errors = error.errors || [];
  } else if (error instanceof multer.MulterError) {
    status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    kode = error.code === 'LIMIT_FILE_SIZE' ? 'BERKAS_TERLALU_BESAR' : 'UNGGAHAN_GAGAL';
    pesan =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'Ukuran berkas melebihi batas yang diizinkan.'
        : 'Berkas tidak dapat diunggah.';
  } else if (error?.type === 'entity.too.large') {
    status = 413;
    kode = 'PERMINTAAN_TERLALU_BESAR';
    pesan = 'Ukuran permintaan terlalu besar.';
  } else if (error?.type === 'entity.parse.failed') {
    status = 400;
    kode = 'JSON_TIDAK_VALID';
    pesan = 'Format data yang dikirim tidak valid.';
  }

  if (status >= 500) {
    catatError(error, {
      method: req.method,
      path: req.originalUrl,
      uid: req.user?.uid || null
    });
  }

  kirimError(res, {
    status,
    message: pesan,
    errors: errors.length ? errors : [{ code: kode }]
  });
};
