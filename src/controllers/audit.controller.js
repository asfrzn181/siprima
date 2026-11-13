import { daftarLogAudit } from '../services/audit.service.js';
import { kirimSukses } from '../utils/response.js';

export const daftar = async (req, res) =>
  kirimSukses(res, { data: await daftarLogAudit({ page: Number(req.query.page) || 1 }) });
