import { kirimError } from '../utils/response.js';

export const notFound = (req, res) => {
  if (req.path.startsWith('/api/')) {
    return kirimError(res, {
      status: 404,
      message: 'Endpoint tidak ditemukan.',
      errors: [{ code: 'TIDAK_DITEMUKAN' }]
    });
  }
  return res.status(404).send('Halaman tidak ditemukan.');
};
