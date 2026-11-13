import { halamanNomor, imporNomor, simpanNomor } from '../../api/master.api.js';
import { badge, showToast } from '../../components/ui.js';
import { normalisasiGolongan } from '../../utils/format.js';
import { bukaModal, pesanBaris, renderPager, selTeks, tutupModal } from './shared.js';

const body = document.querySelector('#nomor-body');
const pager = document.querySelector('#nomor-pager');
const form = document.querySelector('#nomor-form');
const error = document.querySelector('#nomor-error');

let halaman = 1;

const buka = (item = null) => {
  error.hidden = true;
  form.reset();
  form.elements.id.value = item?.id || '';
  form.elements.nama.value = item?.nama || '';
  form.elements.kode.value = item?.kode || '800';
  form.elements.resetTahunan.checked = item?.resetTahunan !== false;
  form.elements.urutanPerBidang.checked = item?.urutanPerBidang === true;
  form.elements.aktif.checked = item?.aktif !== false;
  bukaModal('nomor-modal');
};

export const muatNomor = async () => {
  pesanBaris(body, 4, 'Memuat…');
  try {
    const hasil = await halamanNomor(halaman);
    body.replaceChildren();
    if (!hasil.items.length) pesanBaris(body, 4, 'Belum ada jenis nomor.');
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
      muatNomor();
    });
  } catch (galat) {
    pesanBaris(body, 4, galat.message || 'Gagal memuat master nomor.');
  }
};

const parseBaris = (baris) => {
  const sel = [];
  let isi = '';
  let kutip = false;
  for (let i = 0; i < baris.length; i += 1) {
    const karakter = baris[i];
    if (karakter === '"' && baris[i + 1] === '"') {
      isi += '"';
      i += 1;
    } else if (karakter === '"') {
      kutip = !kutip;
    } else if (karakter === ',' && !kutip) {
      sel.push(isi.trim());
      isi = '';
    } else {
      isi += karakter;
    }
  }
  sel.push(isi.trim());
  return sel;
};

const parseBoolean = (nilai, bawaan = true) => {
  if (nilai === undefined || nilai === '') return bawaan;
  return ['true', '1', 'ya', 'yes', 'aktif'].includes(String(nilai).toLowerCase());
};

const bacaCsv = async (file) => {
  const lines = (await file.text()).split(/\r?\n/).filter(Boolean).map(parseBaris);
  const headers = lines.shift().map((header) =>
    header
      .replace(/^\uFEFF/, '')
      .toLowerCase()
      .replace(/[\s_-]+/g, '')
  );
  const rows = new Map();
  let dilewati = 0;

  lines.forEach((cells) => {
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
    const nama = String(row.nama || row.namaklasifikasi || '').trim();
    const kode = String(row.kode || '').trim();
    const jenis = normalisasiGolongan(row.golongan);
    if (!kode || !nama || kode.length > 40 || nama.length > 120) {
      dilewati += 1;
      return;
    }
    const id = row.id || kode.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    rows.set(id, {
      id,
      data: {
        nama,
        kode,
        golongan: jenis,
        resetTahunan: parseBoolean(row.resettahunan),
        urutanPerBidang: parseBoolean(row.urutanperbidang, false),
        aktif: parseBoolean(row.aktif)
      }
    });
  });

  return { rows: [...rows.values()], dilewati };
};

export const initNomor = async () => {
  document.querySelector('#new-nomor').addEventListener('click', () => buka());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    const id = form.elements.id.value;
    const data = {
      nama: form.elements.nama.value.trim(),
      kode: form.elements.kode.value.trim(),
      golongan: 'LAINNYA',
      resetTahunan: form.elements.resetTahunan.checked,
      urutanPerBidang: form.elements.urutanPerBidang.checked,
      aktif: form.elements.aktif.checked
    };
    if (!data.kode || !data.nama) {
      error.textContent = 'Kode klasifikasi dan nama wajib diisi.';
      error.hidden = false;
      return;
    }
    try {
      await simpanNomor(id || null, data);
      tutupModal('nomor-modal');
      if (!id) halaman = 1;
      await muatNomor();
      showToast('Master nomor tersimpan.');
    } catch (galat) {
      error.textContent = galat.message || 'Master nomor gagal disimpan.';
      error.hidden = false;
    }
  });

  document.querySelector('#csv-import').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const tombol = event.target;
    tombol.disabled = true;
    try {
      const { rows, dilewati } = await bacaCsv(file);
      if (!rows.length) {
        throw new Error('Tidak ada baris valid. Pastikan header KODE,NAMA KLASIFIKASI dan pemisah koma.');
      }
      await imporNomor(rows);
      halaman = 1;
      await muatNomor();
      showToast(`${rows.length} data diimpor; ${dilewati} baris dilewati.`);
    } catch (galat) {
      showToast(galat.message || 'Impor CSV gagal.', 'error');
    } finally {
      tombol.disabled = false;
      tombol.value = '';
    }
  });

  await muatNomor();
};
