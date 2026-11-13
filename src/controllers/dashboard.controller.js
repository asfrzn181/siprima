import { ringkasanDashboard } from '../services/dashboard.service.js';
import { kirimSukses } from '../utils/response.js';

export const ringkasan = async (req, res) =>
  kirimSukses(res, { data: await ringkasanDashboard(req.profile) });
