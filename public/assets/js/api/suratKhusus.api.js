import { api } from './client.js';
import { bangunQuery } from './query.js';

const jalur = (jenis) => (jenis === 'SE' ? '/se' : '/sk');

export const daftarSuratKhusus = (jenis, filter = {}) =>
  api.get(`${jalur(jenis)}${bangunQuery(filter)}`);

export const ambilSuratKhusus = (jenis, id) =>
  api.get(`${jalur(jenis)}/${encodeURIComponent(id)}`);

export const tambahSuratKhusus = (jenis, data) => api.post(jalur(jenis), data);

export const ubahSuratKhusus = (jenis, id, data) =>
  api.put(`${jalur(jenis)}/${encodeURIComponent(id)}`, data);

export const hapusSuratKhusus = (jenis, id) =>
  api.hapus(`${jalur(jenis)}/${encodeURIComponent(id)}`);
