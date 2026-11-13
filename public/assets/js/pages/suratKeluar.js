import { punyaIzin, wajibMasuk } from '../api/client.js';
import { daftarBidang } from '../api/master.api.js';
import { daftarSuratKeluar, eksporSuratKeluar, kedaluwarsaNomor } from '../api/suratKeluar.api.js';
import { badge, renderShell, showToast } from '../components/ui.js';
import { pesanTabel } from '../utils/dom.js';
import { eksporExcel } from '../utils/excel.js';
import { formatStatusKind, formatTanggal } from '../utils/format.js';
import { siapkanForm } from './suratKeluarForm.js';

const sesi = await wajibMasuk();
if (!punyaIzin(sesi.profile, 'surat_keluar.baca')) {
  window.location.replace('./dashboard.html');
  throw new Error('Akses surat keluar dibatasi.');
}
renderShell({ active: 'keluar', session: sesi });

const body = document.querySelector('#list-body');
const note = document.querySelector('#list-note');
const pageLabel = document.querySelector('#page-label');
const prev = document.querySelector('#prev');
const next = document.querySelector('#next');

let halaman = 1;
let totalHalaman = 1;
let filter = { search: '', sifat: 'semua', status: 'semua', golongan: 'semua' };
let items = [];

let bidang = [];
try {
  bidang = await daftarBidang(false);
} catch {
  bidang = [];
}

const formPanel = siapkanForm({
  sesi,
  bidang,
  onSaved: async () => {
    halaman = 1;
    await muat();
  }
});

if (!punyaIzin(sesi.profile, 'surat_keluar.tulis')) {
  document.querySelector('#new-button').hidden = true;
}
if (sesi.profile.role === 'bidang' && !bidang.some((item) => item.kode === sesi.profile.bidang)) {
  document.querySelector('#new-button').disabled = true;
}

const sel = (teks) => {
  const td = document.createElement('td');
  td.textContent = teks || '—';
  return td;
};

const render = () => {
  if (!items.length) {
    pesanTabel(body, 9, 'Tidak ada surat sesuai filter.');
    return;
  }
  const mulai = (halaman - 1) * 20;
  body.replaceChildren(
    ...items.map((item, index) => {
      const baris = document.createElement('tr');
      const sifat = document.createElement('td');
      sifat.append(
        badge(item.sifat === 'rahasia' ? 'Rahasia' : 'Biasa', item.sifat === 'rahasia' ? 'danger' : 'muted')
      );
      const status = document.createElement('td');
      status.append(badge(item.status || 'Aktif', formatStatusKind(item.status)));
      const aksi = document.createElement('td');
      const detail = document.createElement('button');
      detail.className = 'button small secondary';
      detail.type = 'button';
      detail.textContent = 'Detail';
      detail.addEventListener('click', async () => {
        try {
          await formPanel.buka(item);
        } catch (error) {
          showToast(error.message || 'Detail gagal dibuka.', 'error');
        }
      });
      aksi.append(detail);
      baris.append(
        sel(String(mulai + index + 1)),
        sel(item.noSurat),
        sel(formatTanggal(item.tglSurat)),
        sel(item.tujuan),
        sel(item.hal),
        sel(item.bidangPembuat),
        sifat,
        status,
        aksi
      );
      return baris;
    })
  );
};

const muat = async () => {
  note.textContent = 'Memuat…';
  try {
    const hasil = await daftarSuratKeluar({ ...filter, page: halaman });
    items = hasil.items;
    totalHalaman = hasil.pagination.totalPages;
    render();
    prev.disabled = halaman <= 1;
    next.disabled = halaman >= totalHalaman;
    pageLabel.textContent = `Halaman ${halaman} dari ${totalHalaman}`;
    note.textContent = `${hasil.pagination.total} surat ditemukan.`;
  } catch (error) {
    pesanTabel(body, 9, error.message || 'Gagal memuat.');
    note.textContent = 'Gagal memuat data.';
  }
};

document.querySelector('#filter-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  filter = { search: data.search.trim(), sifat: data.sifat, status: data.status, golongan: data.golongan };
  halaman = 1;
  await muat();
});

document.querySelector('#reset-filter').addEventListener('click', async () => {
  document.querySelector('#filter-form').reset();
  filter = { search: '', sifat: 'semua', status: 'semua', golongan: 'semua' };
  halaman = 1;
  await muat();
});

document.querySelector('#refresh').addEventListener('click', muat);
prev.addEventListener('click', async () => {
  if (halaman <= 1) return;
  halaman -= 1;
  await muat();
});
next.addEventListener('click', async () => {
  if (halaman >= totalHalaman) return;
  halaman += 1;
  await muat();
});

document.querySelector('#export').hidden = !punyaIzin(sesi.profile, 'surat_keluar.cetak');
document.querySelector('#export').addEventListener('click', async () => {
  try {
    const data = await eksporSuratKeluar(filter);
    const rows = data.map((item, index) => ({
      'No. Urut': index + 1,
      'No. Surat': item.noSurat,
      'Tanggal Surat': formatTanggal(item.tglSurat),
      Tujuan: item.tujuan,
      Hal: item.hal,
      'Isi Ringkas': item.isiRingkas,
      'Bidang Pembuat': item.bidangPembuat,
      Sifat: item.sifat,
      Status: item.status
    }));
    await eksporExcel(rows, 'surat-keluar.xlsx', 'Surat Keluar');
  } catch (error) {
    showToast(error.message || 'Ekspor gagal.', 'error');
  }
});

await formPanel.muatMaster();
await muat();

if (punyaIzin(sesi.profile, 'nomor.verifikasi')) {
  kedaluwarsaNomor().catch(() => {});
}
