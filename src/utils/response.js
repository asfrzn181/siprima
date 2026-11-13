export const kirimSukses = (res, { status = 200, message = 'Berhasil.', data = null } = {}) =>
  res.status(status).json({ status: 'success', message, data, errors: null });

export const kirimError = (res, { status = 500, message = 'Terjadi kesalahan.', errors = [] } = {}) =>
  res.status(status).json({ status: 'error', message, data: null, errors });
