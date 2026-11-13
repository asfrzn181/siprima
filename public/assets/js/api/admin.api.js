import { api } from './client.js';
import { bangunQuery } from './query.js';

export const daftarPengguna = (page = 1) => api.get(`/users${bangunQuery({ page })}`);
export const buatPengguna = (data) => api.post('/users', data);
export const ubahPengguna = (id, data) => api.put(`/users/${encodeURIComponent(id)}`, data);

export const ambilPengaturan = () => api.get('/pengaturan');
export const simpanPengaturan = (data) => api.put('/pengaturan', data);

export const daftarAudit = (page = 1) => api.get(`/audit${bangunQuery({ page })}`);
export const ringkasanDashboard = () => api.get('/dashboard');
export const verifikasiNomor = (tahun, scope) => api.get(`/nomor/verifikasi${bangunQuery({ tahun, scope })}`);
export const laporan = (jenis, filter) => api.get(`/laporan/${jenis}${bangunQuery(filter)}`);
