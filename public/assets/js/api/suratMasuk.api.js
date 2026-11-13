import { api } from './client.js';
import { bangunQuery, tanggalQuery } from './query.js';

const query = (filter = {}) =>
  bangunQuery({
    search: filter.search || '',
    sifat: filter.sifat || 'semua',
    status: filter.status || 'semua',
    tglMulai: filter.tglMulai ? tanggalQuery(filter.tglMulai) : '',
    tglSelesai: filter.tglSelesai ? tanggalQuery(filter.tglSelesai, true) : '',
    page: filter.page || 1,
    limit: filter.limit || 20
  });

export const daftarSuratMasuk = (filter) => api.get(`/surat-masuk${query(filter)}`);
export const ambilSuratMasuk = (id) => api.get(`/surat-masuk/${encodeURIComponent(id)}`);
export const tambahSuratMasuk = (data) => api.post('/surat-masuk', data);
export const ubahSuratMasuk = (id, data) => api.put(`/surat-masuk/${encodeURIComponent(id)}`, data);
export const disposisiSuratMasuk = (id, data) =>
  api.post(`/surat-masuk/${encodeURIComponent(id)}/disposisi`, data);
export const tindakLanjutSuratMasuk = (id, data) =>
  api.post(`/surat-masuk/${encodeURIComponent(id)}/tindak-lanjut`, data);
export const eksporSuratMasuk = (filter) =>
  api.get(`/surat-masuk/export${query({ ...filter, limit: 5000 })}`);

export const unggahScanMasuk = (id, file) => {
  const form = new FormData();
  form.append('scan', file);
  return api.unggah(`/surat-masuk/${encodeURIComponent(id)}/scan`, form);
};

export const urlBerkasMasuk = (id) => `/api/surat-masuk/${encodeURIComponent(id)}/berkas`;
