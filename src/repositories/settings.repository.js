import { KOLEKSI } from '../constants/index.js';
import { ambilDokumen, refDokumen } from './base.repository.js';

const ID_PENGATURAN = 'umum';

export const ambilPengaturan = async () => {
  const data = await ambilDokumen(KOLEKSI.PENGATURAN, ID_PENGATURAN);
  return data ? { ...data } : {};
};

export const simpanPengaturan = async (data) => {
  await refDokumen(KOLEKSI.PENGATURAN, ID_PENGATURAN).set(data, { merge: true });
  return data;
};
