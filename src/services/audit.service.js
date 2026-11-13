import { daftarAudit } from '../repositories/audit.repository.js';
import { serialisasi } from '../utils/serialisasi.js';

const UKURAN_HALAMAN = 20;

export const daftarLogAudit = async ({ page = 1 } = {}) => {
  const semua = (await daftarAudit({ limit: 2000 })).map((item) => serialisasi(item));
  const limit = UKURAN_HALAMAN;
  const total = semua.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const mulai = (page - 1) * limit;
  return {
    items: semua.slice(mulai, mulai + limit),
    pagination: { page, limit, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages }
  };
};
