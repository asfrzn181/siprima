import path from 'node:path';
import { berkasAda, lokasiBerkas } from '../repositories/storage.repository.js';
import { galatTidakDitemukan } from '../utils/AppError.js';

export const resolusiBerkas = ({ fileId, fileUrl, namaUnduhan }) => {
  if (fileId && berkasAda(fileId)) {
    const lokasi = lokasiBerkas(fileId);
    return { jenis: 'berkas', lokasi, nama: `${namaUnduhan}${path.extname(lokasi)}` };
  }
  if (fileUrl) return { jenis: 'tautan', url: fileUrl };
  throw galatTidakDitemukan('Berkas scan tidak tersedia.');
};
