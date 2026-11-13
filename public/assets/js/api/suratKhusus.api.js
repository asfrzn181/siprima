import { api } from './client.js';
import { bangunQuery } from './query.js';

const jalur = (jenis) => (jenis === 'SE' ? '/se' : '/sk');

export const daftarSuratKhusus = (jenis, filter = {}) =>
  api.get(`${jalur(jenis)}${bangunQuery(filter)}`);

export const ambilSuratKhusus = (jenis, id) =>
  api.get(`${jalur(jenis)}/${encodeURIComponent(id)}`);

export const nomorTersediaSuratKhusus = (jenis, filter = {}) =>
  api.get(`${jalur(jenis)}/nomor-tersedia${bangunQuery(filter)}`);

export const tambahSuratKhusus = (jenis, data) => api.post(jalur(jenis), data);

export const ubahSuratKhusus = (jenis, id, data) =>
  api.put(`${jalur(jenis)}/${encodeURIComponent(id)}`, data);

export const batalkanSuratKhusus = (jenis, id, alasan) =>
  api.post(`${jalur(jenis)}/${encodeURIComponent(id)}/batal`, { alasan });

export const hapusSuratKhusus = (jenis, id) =>
  api.hapus(`${jalur(jenis)}/${encodeURIComponent(id)}`);
