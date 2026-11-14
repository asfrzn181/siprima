import { api } from './client.js';
import { bangunQuery, tanggalQuery } from './query.js';

const query = (filter = {}) =>
  bangunQuery({
    search: filter.search || '',
    sifat: filter.sifat || 'semua',
    status: filter.status || 'semua',
    bidang: filter.bidang || '',
    tglMulai: filter.tglMulai ? tanggalQuery(filter.tglMulai) : '',
    tglSelesai: filter.tglSelesai ? tanggalQuery(filter.tglSelesai, true) : '',
    page: filter.page || 1,
    limit: filter.limit || 20
  });

export const daftarSuratKeluar = (filter) => api.get(`/surat-keluar${query(filter)}`);
export const ambilSuratKeluar = (id) => api.get(`/surat-keluar/${encodeURIComponent(id)}`);
export const tambahSuratKeluar = (data) => api.post('/surat-keluar', data);
export const ubahSuratKeluar = (id, data) => api.put(`/surat-keluar/${encodeURIComponent(id)}`, data);
export const batalkanSuratKeluar = (id, alasan) =>
  api.post(`/surat-keluar/${encodeURIComponent(id)}/batal`, { alasan });
export const koreksiSuratKeluar = (id, payload, reason) =>
  api.post(`/surat-keluar/${encodeURIComponent(id)}/koreksi`, { payload, reason });
export const pakaiUlangNomor = (id, payload) =>
  api.post(`/surat-keluar/${encodeURIComponent(id)}/pakai-ulang-nomor`, { payload });
export const eksporSuratKeluar = (filter) =>
  api.get(`/surat-keluar/export${query({ ...filter, limit: 5000 })}`);

export const pratinjauNomor = (data) => api.post('/nomor/pratinjau', data);
export const nomorTersedia = (filter) => api.get(`/nomor/tersedia${bangunQuery(filter)}`);
export const kedaluwarsaNomor = () => api.post('/nomor/kedaluwarsa');
export const cariNomorLengkap = (nomor) => api.get(`/nomor/cari${bangunQuery({ nomor })}`);
