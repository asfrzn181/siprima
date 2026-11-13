import { halamanBidang, simpanBidang } from '../../api/master.api.js';
import { badge, showToast } from '../../components/ui.js';
import { bukaModal, pesanBaris, renderPager, selTeks, tutupModal } from './shared.js';

const body = document.querySelector('#bidang-body');
const pager = document.querySelector('#bidang-pager');
const form = document.querySelector('#bidang-form');
const error = document.querySelector('#bidang-error');

let halaman = 1;

const buka = (item = null) => {
  error.hidden = true;
  form.reset();
  form.elements.id.value = item?.id || '';
  form.elements.kode.value = item?.kode || '';
  form.elements.nama.value = item?.nama || '';
  form.elements.aktif.checked = item?.aktif !== false;
  bukaModal('bidang-modal');
};

export const muatBidang = async () => {
  pesanBaris(body, 4, 'Memuat…');
  try {
    const hasil = await halamanBidang(halaman);
    body.replaceChildren();
    if (!hasil.items.length) pesanBaris(body, 4, 'Belum ada master bidang.');
    hasil.items.forEach((item) => {
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
      baris.append(selTeks(item.kode), selTeks(item.nama), status, aksi);
      body.append(baris);
    });
    renderPager(pager, hasil.pagination, (halamanBaru) => {
      halaman = halamanBaru;
      muatBidang();
    });
  } catch (galat) {
    pesanBaris(body, 4, galat.message || 'Gagal memuat bidang.');
  }
};

export const initBidang = async () => {
  document.querySelector('#new-bidang').addEventListener('click', () => buka());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    const id = form.elements.id.value;
    const data = {
      kode: form.elements.kode.value.trim(),
      nama: form.elements.nama.value.trim(),
      aktif: form.elements.aktif.checked
    };
    try {
      await simpanBidang(id || null, data);
      tutupModal('bidang-modal');
      if (!id) halaman = 1;
      await muatBidang();
      showToast('Master bidang disimpan.');
    } catch (galat) {
      error.textContent = galat.message || 'Bidang gagal disimpan.';
      error.hidden = false;
    }
  });

  await muatBidang();
};
