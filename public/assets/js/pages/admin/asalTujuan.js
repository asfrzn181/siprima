import { halamanAsalTujuan, imporAsalTujuan, simpanAsalTujuan } from '../../api/master.api.js';
import { badge, showToast } from '../../components/ui.js';
import { bukaModal, pesanBaris, renderPager, selTeks, tutupModal } from './shared.js';

const body = document.querySelector('#asal-tujuan-body');
const pager = document.querySelector('#asal-tujuan-pager');
const form = document.querySelector('#asal-tujuan-form');
const error = document.querySelector('#asal-tujuan-error');

let halaman = 1;

const buka = (item = null) => {
  error.hidden = true;
  form.reset();
  form.elements.id.value = item?.id || '';
  form.elements.kode.value = item?.kode || '';
  form.elements.nama.value = item?.nama || '';
  form.elements.aktif.checked = item?.aktif !== false;
  bukaModal('asal-tujuan-modal');
};

const parseBaris = (baris) => {
  const hasil = [];
  let sel = '';
  let kutip = false;
  for (let i = 0; i < baris.length; i += 1) {
    const karakter = baris[i];
    if (karakter === '"') {
      if (kutip && baris[i + 1] === '"') {
        sel += '"';
        i += 1;
      } else {
        kutip = !kutip;
      }
    } else if (karakter === ',' && !kutip) {
      hasil.push(sel.trim());
      sel = '';
    } else {
      sel += karakter;
    }
  }
  hasil.push(sel.trim());
  return hasil;
};

const parseBoolean = (nilai, bawaan = true) => {
  if (nilai === undefined || nilai === '') return bawaan;
  return ['true', '1', 'ya', 'yes', 'aktif'].includes(String(nilai).toLowerCase());
};

const bacaCsv = async (file) => {
  const lines = (await file.text()).split(/\r?\n/).filter(Boolean).map(parseBaris);
  if (!lines.length) return { rows: [], dilewati: 0 };
  const headers = lines.shift().map((header) =>
    header
      .replace(/^\uFEFF/, '')
      .toLowerCase()
      .replace(/[\s_-]+/g, '')
  );
  const rows = [];
  let dilewati = 0;

  lines.forEach((cells) => {
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
    const nama = String(row.nama || row.namatujuan || '').trim();
    const kode = String(row.kode || '').trim();
    if (!nama || nama.length > 160 || kode.length > 40) {
      dilewati += 1;
      return;
    }
    rows.push({
      kode,
      nama,
      aktif: parseBoolean(row.aktif || row.status)
    });
  });

  return { rows, dilewati };
};

export const muatAsalTujuan = async () => {
  pesanBaris(body, 5, 'Memuat…');
  try {
    const hasil = await halamanAsalTujuan(halaman);
    body.replaceChildren();
    if (!hasil.items.length) pesanBaris(body, 5, 'Belum ada master asal & tujuan.');
    const mulai = (halaman - 1) * (hasil.pagination.limit || 20);
    hasil.items.forEach((item, index) => {
      const baris = document.createElement('tr');
      const status = document.createElement('td');
      status.append(badge(item.aktif ? 'Aktif' : 'Nonaktif', item.aktif ? 'success' : 'muted'));
      const aksi = document.createElement('td');
      const edit = document.createElement('button');
      edit.className = 'button small secondary';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => buka(item));
      aksi.append(edit);
      baris.append(selTeks(String(mulai + index + 1)), selTeks(item.kode), selTeks(item.nama), status, aksi);
      body.append(baris);
    });
    renderPager(pager, hasil.pagination, (halamanBaru) => {
      halaman = halamanBaru;
      muatAsalTujuan();
    });
  } catch (galat) {
    pesanBaris(body, 5, galat.message || 'Gagal memuat master asal & tujuan.');
  }
};

export const initAsalTujuan = async () => {
  document.querySelector('#new-asal-tujuan').addEventListener('click', () => buka());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    const id = form.elements.id.value;
    const data = {
      kode: form.elements.kode.value.trim(),
      nama: form.elements.nama.value.trim(),
      aktif: form.elements.aktif.checked
    };
    if (!data.nama) {
      error.textContent = 'Nama tujuan wajib diisi.';
      error.hidden = false;
      return;
    }
    try {
      await simpanAsalTujuan(id || null, data);
      tutupModal('asal-tujuan-modal');
      if (!id) halaman = 1;
      await muatAsalTujuan();
      showToast('Master asal & tujuan disimpan.');
    } catch (galat) {
      error.textContent = galat.message || 'Master asal & tujuan gagal disimpan.';
      error.hidden = false;
    }
  });

  document.querySelector('#csv-import-asal-tujuan').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const tombol = event.target;
    tombol.disabled = true;
    try {
      const { rows, dilewati } = await bacaCsv(file);
      if (!rows.length) {
        throw new Error('Tidak ada baris valid. Pastikan header KODE,NAMA TUJUAN dan pemisah koma.');
      }
      const hasil = await imporAsalTujuan(rows);
      halaman = 1;
      await muatAsalTujuan();
      showToast(`${hasil.jumlah || rows.length} data diimpor; ${dilewati} baris dilewati.`);
    } catch (galat) {
      showToast(galat.message || 'Impor CSV gagal.', 'error');
    } finally {
      tombol.disabled = false;
      tombol.value = '';
    }
  });

  await muatAsalTujuan();
};
