import { wajibIzin } from '../api/client.js';
import { laporan } from '../api/admin.api.js';
import { daftarBidang } from '../api/master.api.js';
import { badge, renderShell, showToast } from '../components/ui.js';
import { pesanTabel } from '../utils/dom.js';
import { eksporExcel } from '../utils/excel.js';
import { formatStatusKind, formatTanggal, tanggalIso } from '../utils/format.js';

const sesi = await wajibIzin('laporan.baca');
renderShell({ active: 'laporan', session: sesi });

const PAGE_SIZE = 20;
const JENIS_VALID = ['masuk', 'keluar', 'sk', 'se'];
const JUDUL = {
  masuk: 'Surat Masuk',
  keluar: 'Surat Keluar',
  sk: 'Surat Keputusan',
  se: 'Surat Edaran'
};
const COLS = {
  keluar: ['No. Urut', 'No. Surat', 'Tanggal Surat', 'Tujuan', 'Hal', 'Bidang Pembuat', 'Sifat', 'Status'],
  masuk: ['No. Urut', 'No. Agenda', 'Tgl Terima', 'Tgl Surat', 'No. Surat', 'Asal', 'Hal', 'Sifat', 'Status'],
  sk: ['No. Urut', 'Nomor SK', 'Tanggal', 'Tentang', 'Keterangan', 'Status'],
  se: ['No. Urut', 'Nomor SE', 'Tanggal', 'Tentang', 'Keterangan', 'Status']
};
const STATUS = {
  keluar: [
    ['semua', 'Semua'],
    ['Aktif', 'Aktif'],
    ['Dibatalkan', 'Dibatalkan']
  ],
  masuk: [
    ['semua', 'Semua'],
    ['Baru', 'Baru'],
    ['Didisposisikan', 'Didisposisikan'],
    ['Selesai', 'Selesai']
  ],
  sk: [
    ['semua', 'Semua'],
    ['Aktif', 'Aktif'],
    ['Dibatalkan', 'Dibatalkan']
  ],
  se: [
    ['semua', 'Semua'],
    ['Aktif', 'Aktif'],
    ['Dibatalkan', 'Dibatalkan']
  ]
};

const form = document.querySelector('#filter-form');
const statusSelect = document.querySelector('#status-select');
const thead = document.querySelector('#results-thead');
const body = document.querySelector('#results-body');
const note = document.querySelector('#results-note');
const panel = document.querySelector('#results-panel');
const stats = document.querySelector('#stats-row');
const exportButton = document.querySelector('#export-button');
const prev = document.querySelector('#prev-button');
const next = document.querySelector('#next-button');
const pageLabel = document.querySelector('#page-label');

let items = [];
let halaman = 1;
let filterAktif = null;

const jenisAwal = new URLSearchParams(window.location.search).get('jenis');
const jenis = JENIS_VALID.includes(jenisAwal) ? jenisAwal : 'keluar';

const isiStatus = () => {
  statusSelect.replaceChildren(...STATUS[jenis].map(([value, label]) => new Option(label, value)));
};

const renderJudul = () => {
  const judul = `Laporan ${JUDUL[jenis]}`;
  document.title = `SiPrima — ${judul}`;
  const heading = document.querySelector('#page-title');
  if (heading) heading.textContent = judul;
  const wrapSifat = form.elements.sifat?.closest('label');
  if (wrapSifat) wrapSifat.hidden = jenis === 'sk' || jenis === 'se';
};

const renderThead = () => {
  const baris = document.createElement('tr');
  COLS[jenis].forEach((kolom) =>
    baris.append(Object.assign(document.createElement('th'), { textContent: kolom }))
  );
  thead.replaceChildren(baris);
};

const selBadge = (teks) => {
  const td = document.createElement('td');
  td.append(teks);
  return td;
};

const selTeks = (teks) => {
  const td = document.createElement('td');
  td.textContent = teks || '—';
  return td;
};

const barisKeluar = (item, nomor) =>
  [
    selTeks(String(nomor)),
    selTeks(item.noSurat),
    selTeks(formatTanggal(item.tglSurat)),
    selTeks(item.tujuan),
    selTeks(item.hal),
    selTeks(item.bidangPembuat),
    selBadge(
      badge(
        item.sifat === 'rahasia' ? 'Rahasia' : 'Biasa',
        item.sifat === 'rahasia' ? 'danger' : 'muted'
      )
    ),
    selBadge(badge(item.status, formatStatusKind(item.status)))
  ];

const barisMasuk = (item, nomor) =>
  [
    selTeks(String(nomor)),
    selTeks(item.noAgenda),
    selTeks(formatTanggal(item.tglTerima)),
    selTeks(formatTanggal(item.tglSurat)),
    selTeks(item.noSurat),
    selTeks(item.asal),
    selTeks(item.hal),
    selBadge(
      badge(
        item.sifat === 'rahasia' ? 'Rahasia' : 'Biasa',
        item.sifat === 'rahasia' ? 'danger' : 'muted'
      )
    ),
    selBadge(badge(item.status, formatStatusKind(item.status)))
  ];

const barisKhusus = (item, nomor) =>
  [
    selTeks(String(nomor)),
    selTeks(item.nomor),
    selTeks(formatTanggal(item.tanggal)),
    selTeks(item.tentang),
    selTeks(item.keterangan),
    selBadge(badge(item.status, formatStatusKind(item.status)))
  ];

const barisUntuk = (item, nomor) => {
  if (jenis === 'keluar') return barisKeluar(item, nomor);
  if (jenis === 'masuk') return barisMasuk(item, nomor);
  return barisKhusus(item, nomor);
};

const renderHalaman = () => {
  const totalHalaman = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const mulai = (halaman - 1) * PAGE_SIZE;
  const potongan = items.slice(mulai, mulai + PAGE_SIZE);
  if (!potongan.length) {
    pesanTabel(body, COLS[jenis].length, 'Tidak ada data surat untuk filter ini.');
  } else {
    body.replaceChildren(
      ...potongan.map((item, index) => {
        const baris = document.createElement('tr');
        baris.append(...barisUntuk(item, mulai + index + 1));
        return baris;
      })
    );
  }
  pageLabel.textContent = `Halaman ${halaman} dari ${totalHalaman}`;
  prev.disabled = halaman <= 1;
  next.disabled = halaman >= totalHalaman;
};

const renderStatistik = () => {
  const aktif = jenis === 'masuk' ? 'Baru' : 'Aktif';
  const selesai = jenis === 'masuk' ? 'Selesai' : 'Dibatalkan';
  document.querySelector('#stat-total').textContent = items.length;
  document.querySelector('#stat-active').textContent = items.filter((item) => item.status === aktif).length;
  document.querySelector('#stat-closed').textContent = items.filter((item) => item.status === selesai).length;
  document.querySelector('#stat-label-active').textContent = aktif;
  document.querySelector('#stat-label-closed').textContent = selesai;
  document.querySelector('#stat-active-desc').textContent = `status ${aktif.toLowerCase()}`;
  document.querySelector('#stat-closed-desc').textContent = `status ${selesai.toLowerCase()}`;
  stats.style.display = '';
};

const muat = async () => {
  exportButton.disabled = true;
  note.textContent = 'Memuat data…';
  try {
    const data = await laporan(jenis, filterAktif);
    items = data.items;
    halaman = 1;
    renderStatistik();
    renderHalaman();
    note.textContent = `${items.length} surat ditemukan.`;
    exportButton.disabled = items.length === 0;
  } catch (error) {
    pesanTabel(body, COLS[jenis].length, error.message || 'Gagal memuat data laporan.');
    note.textContent = 'Terjadi kesalahan saat memuat data.';
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (!data.tglMulai || !data.tglSelesai) return showToast('Tanggal mulai dan sampai wajib diisi.');
  if (data.tglMulai > data.tglSelesai)
    return showToast('Tanggal mulai tidak boleh lebih dari tanggal sampai.');
  filterAktif = {
    tglMulai: tanggalIso(data.tglMulai),
    tglSelesai: tanggalIso(data.tglSelesai),
    status: data.status || 'semua',
    sifat: data.sifat || 'semua',
    bidang: data.bidang || 'semua'
  };
  renderThead();
  panel.classList.add('visible');
  await muat();
});

document.querySelector('#reset-button').addEventListener('click', () => {
  form.reset();
  isiStatus();
  items = [];
  filterAktif = null;
  panel.classList.remove('visible');
  stats.style.display = 'none';
});

document.querySelector('#refresh-button').addEventListener('click', () => {
  if (filterAktif) muat();
});

prev.addEventListener('click', () => {
  if (halaman <= 1) return;
  halaman -= 1;
  renderHalaman();
});
next.addEventListener('click', () => {
  if (halaman >= Math.max(1, Math.ceil(items.length / PAGE_SIZE))) return;
  halaman += 1;
  renderHalaman();
});

const barisEkspor = (item, index) => {
  if (jenis === 'keluar') {
    return {
      'No. Urut': index + 1,
      'No. Surat': item.noSurat || '',
      'Tanggal Surat': formatTanggal(item.tglSurat),
      Tujuan: item.tujuan || '',
      Hal: item.hal || '',
      'Bidang Pembuat': item.bidangPembuat || '',
      Sifat: item.sifat || '',
      Status: item.status || ''
    };
  }
  if (jenis === 'masuk') {
    return {
      'No. Urut': index + 1,
      'No. Agenda': item.noAgenda || '',
      'Tgl Terima': formatTanggal(item.tglTerima),
      'Tgl Surat': formatTanggal(item.tglSurat),
      'No. Surat': item.noSurat || '',
      Asal: item.asal || '',
      Hal: item.hal || '',
      Sifat: item.sifat || '',
      Status: item.status || ''
    };
  }
  return {
    'No. Urut': index + 1,
    Nomor: item.nomor || '',
    Tanggal: formatTanggal(item.tanggal),
    Tentang: item.tentang || '',
    Keterangan: item.keterangan || '',
    Status: item.status || ''
  };
};

exportButton.addEventListener('click', async () => {
  if (!items.length) return;
  try {
    const rows = items.map(barisEkspor);
    await eksporExcel(rows, `laporan-${jenis}.xlsx`, JUDUL[jenis]);
  } catch (error) {
    showToast(error.message || 'Ekspor gagal.', 'error');
  }
});

renderJudul();
isiStatus();
renderThead();

if (sesi.profile.aksesData === 'SEMUA') {
  const wrap = document.querySelector('#bidang-filter-wrap');
  const select = form.elements.bidang;
  try {
    const bidang = await daftarBidang(false);
    bidang
      .filter((item) => item.aktif !== false && item.kode)
      .forEach((item) => select.append(new Option(`${item.nama} (${item.kode})`, item.kode)));
    wrap.hidden = false;
  } catch {
    wrap.hidden = true;
  }
}
