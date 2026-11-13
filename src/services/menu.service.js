import { AKSI_AUDIT } from '../constants/index.js';
import { catatAudit } from '../repositories/audit.repository.js';
import {
  cariMenu,
  cariMenuByKunci,
  daftarMenu,
  hapusMenu,
  simpanMenu
} from '../repositories/menu.repository.js';
import { AppError, galatTidakDitemukan } from '../utils/AppError.js';

const urutkan = (items) =>
  items
    .sort((a, b) => a.urutan - b.urutan || a.label.localeCompare(b.label, 'id'))
    .map((item) => ({ ...item, children: urutkan(item.children) }));

export const susunPohon = (daftar) => {
  const peta = new Map(daftar.map((item) => [item.id, { ...item, children: [] }]));
  const akar = [];
  peta.forEach((item) => {
    if (item.parentId && peta.has(item.parentId)) peta.get(item.parentId).children.push(item);
    else akar.push(item);
  });
  return urutkan(akar);
};

const buangKosong = (items) =>
  items
    .map((item) => ({ ...item, children: buangKosong(item.children) }))
    .filter((item) => item.href || item.children.length);

export const menuUntukProfil = async (profil) => {
  const boleh = new Set(profil?.izin || []);
  const terlihat = (await daftarMenu()).filter(
    (item) => item.aktif && (!item.izin || boleh.has(item.izin))
  );
  return buangKosong(susunPohon(terlihat));
};

export const pohonMenuAdmin = async () => susunPohon(await daftarMenu());

const normalisasi = (data) => ({
  kunci: data.kunci,
  label: data.label,
  parentId: data.parentId ? Number(data.parentId) : null,
  href: data.href || '',
  izin: data.izin || null,
  urutan: Number(data.urutan) || 0,
  aktif: data.aktif !== false
});

const pastikanParent = async (parentId, id) => {
  if (!parentId) return;
  if (id && Number(parentId) === Number(id)) {
    throw new AppError(400, 'VALIDASI_GAGAL', 'Menu tidak boleh menjadi induk dirinya sendiri.');
  }
  const induk = await cariMenu(parentId);
  if (!induk) throw galatTidakDitemukan('Menu induk tidak ditemukan.');
};

export const simpanMenuAdmin = async (id, data, aktor) => {
  const lama = id ? await cariMenu(id) : null;
  if (id && !lama) throw galatTidakDitemukan('Menu tidak ditemukan.');
  const nilai = normalisasi(data);
  await pastikanParent(nilai.parentId, id);
  const bentrok = await cariMenuByKunci(nilai.kunci);
  if (bentrok && String(bentrok.id) !== String(id || '')) {
    throw new AppError(409, 'KUNCI_MENU_DIPAKAI', 'Kunci menu sudah dipakai.');
  }
  const hasil = await simpanMenu(id ? Number(id) : null, nilai);
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_MENU,
    koleksi: 'menus',
    docId: hasil.id,
    sebelum: lama,
    sesudah: hasil
  });
  return hasil;
};

export const hapusMenuAdmin = async (id, aktor) => {
  const lama = await cariMenu(id);
  if (!lama) throw galatTidakDitemukan('Menu tidak ditemukan.');
  await hapusMenu(id);
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_MENU,
    koleksi: 'menus',
    docId: id,
    sebelum: lama
  });
  return { berhasil: true };
};
