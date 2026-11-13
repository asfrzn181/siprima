import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { EKSTENSI_MIME, MIME_IZIN } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';
import { pastikanFolderUnggahan } from '../repositories/storage.repository.js';

const penyimpanan = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      pastikanFolderUnggahan();
      cb(null, env.UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (_req, file, cb) => {
    const ekstensi = EKSTENSI_MIME[file.mimetype] || '';
    cb(null, `${randomUUID()}${ekstensi}`);
  }
});

const filter = (_req, file, cb) => {
  if (!MIME_IZIN.includes(file.mimetype)) {
    return cb(new AppError(400, 'TIPE_BERKAS_TIDAK_IZIN', 'Berkas harus PDF, JPG, atau PNG.'));
  }
  cb(null, true);
};

export const unggahScan = multer({
  storage: penyimpanan,
  fileFilter: filter,
  limits: { fileSize: env.batasUnggahByte, files: 1 }
}).single('scan');
