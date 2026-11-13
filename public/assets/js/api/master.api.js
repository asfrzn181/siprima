import { api } from './client.js';
import { bangunQuery } from './query.js';

export const daftarBidang = (semua = false) => api.get(`/master/bidang${semua ? '?semua=1' : ''}`);
export const halamanBidang = (page = 1) => api.get(`/master/bidang/halaman${bangunQuery({ page })}`);
export const simpanBidang = (id, data) =>
  id ? api.put(`/master/bidang/${encodeURIComponent(id)}`, data) : api.post('/master/bidang', data);

export const daftarNomor = () => api.get('/master/nomor');
export const halamanNomor = (page = 1) => api.get(`/master/nomor/halaman${bangunQuery({ page })}`);
export const cariNomor = (q, limit = 5) => api.get(`/master/nomor/cari${bangunQuery({ q, limit })}`);
export const ambilNomor = (id) => api.get(`/master/nomor/${encodeURIComponent(id)}`);
export const simpanNomor = (id, data) =>
  id ? api.put(`/master/nomor/${encodeURIComponent(id)}`, data) : api.post('/master/nomor', data);
export const imporNomor = (rows) => api.post('/master/nomor/impor', { rows });

export const daftarAsalTujuan = (semua = false) =>
  api.get(`/master/asal-tujuan${semua ? '?semua=1' : ''}`);
export const halamanAsalTujuan = (page = 1) =>
  api.get(`/master/asal-tujuan/halaman${bangunQuery({ page })}`);
export const cariAsalTujuan = (q, limit = 5) =>
  api.get(`/master/asal-tujuan/cari${bangunQuery({ q, limit })}`);
export const simpanAsalTujuan = (id, data) =>
  id
    ? api.put(`/master/asal-tujuan/${encodeURIComponent(id)}`, data)
    : api.post('/master/asal-tujuan', data);
export const imporAsalTujuan = (rows) => api.post('/master/asal-tujuan/impor', { rows });
