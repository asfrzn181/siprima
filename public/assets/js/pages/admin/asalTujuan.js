import { halamanAsalTujuan, simpanAsalTujuan } from '../../api/master.api.js';
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
    if (!data.kode || !data.nama) {
      error.textContent = 'Kode dan nama tujuan wajib diisi.';
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

  await muatAsalTujuan();
};
