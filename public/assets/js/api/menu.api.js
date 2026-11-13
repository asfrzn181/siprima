import { api } from './client.js';

export const daftarMenu = () => api.get('/menus');

export const semuaMenu = () => api.get('/menus/semua');

export const simpanMenu = (id, data) =>
  id ? api.put(`/menus/${encodeURIComponent(id)}`, data) : api.post('/menus', data);

export const hapusMenu = (id) => api.hapus(`/menus/${encodeURIComponent(id)}`);
