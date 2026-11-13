import { wajibMasuk } from '../api/client.js';
import { daftarBidang, cariNomor } from '../api/master.api.js';
import {
  daftarSuratMasuk,
  disposisiSuratMasuk,
  eksporSuratMasuk,
  tambahSuratMasuk,
  ubahSuratMasuk,
  unggahScanMasuk,
  urlBerkasMasuk
} from '../api/suratMasuk.api.js';
import { createAutocomplete } from '../components/autocomplete.js';
import { attachRowNavigation, badge, copyToClipboard, renderShell, showToast } from '../components/ui.js';
import { pesanTabel } from '../utils/dom.js';
import { eksporExcel } from '../utils/excel.js';
import { formatStatusKind, formatTanggal, inputTanggal, tanggalIso } from '../utils/format.js';

const sesi = await wajibMasuk();
if (sesi.profile.role === 'bidang') {
  window.location.replace('./surat-keluar.html');
  throw new Error('Akses dibatasi untuk bidang.');
}
renderShell({ active: 'masuk', session: sesi, title: 'Surat masuk' });

const canCreate = sesi.profile.role === 'admin';
const canEdit = ['admin', 'pimpinan'].includes(sesi.profile.role);

const body = document.querySelector('#surat-body');
const note = document.querySelector('#list-note');
const pageLabel = document.querySelector('#page-label');
const prev = document.querySelector('#previous-button');
const next = document.querySelector('#next-button');
const formPanel = document.querySelector('#form-panel');
const form = document.querySelector('#surat-form');
const formError = document.querySelector('#form-error');
const saveButton = document.querySelector('#save-button');
const dispositionButton = document.querySelector('#disposition-button');
const downloadButton = document.querySelector('#download-button');
const fileLink = document.querySelector('#file-link');

let halaman = 1;
let totalHalaman = 1;
let filter = { search: '', sifat: 'semua', status: 'semua', tglMulai: '', tglSelesai: '' };
let items = [];
let bidang = [];
let returnToRow = null;

const tampilError = (pesan) => {
  formError.textContent = pesan;
  formError.hidden = false;
};

const opsiBidang = (wadah, nama, terpilih = []) => {
  wadah.replaceChildren();
  const aktif = bidang.filter((item) => item.aktif !== false && item.kode);
  if (!aktif.length) {
    wadah.append(
      Object.assign(document.createElement('span'), {
        className: 'muted',
        textContent: 'Master bidang aktif belum tersedia.'
      })
    );
    return;
  }
  aktif.forEach((item) => {
    const label = document.createElement('label');
    label.className = 'check-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = nama;
    input.value = item.kode;
    input.checked = terpilih.includes(item.kode);
    const teks = document.createElement('span');
    teks.textContent = `${item.kode} — ${item.nama}`;
    label.append(input, teks);
    wadah.append(label);
  });
};

const sel = (label, teks) => {
  const td = document.createElement('td');
  td.dataset.label = label;
  td.textContent = teks || '—';
  return td;
};

const renderBaris = () => {
  if (!items.length) {
    pesanTabel(body, 8, 'Tidak ada surat yang sesuai.', 'Ubah kata kunci atau reset filter.');
    return;
  }
  body.replaceChildren(
    ...items.map((item) => {
      const baris = document.createElement('tr');
      baris.dataset.id = item.id;
      baris.tabIndex = 0;

      const nomorSel = document.createElement('td');
      nomorSel.dataset.label = 'Nomor surat';
      const barisNomor = document.createElement('div');
      barisNomor.className = 'number-line';
      barisNomor.append(
        Object.assign(document.createElement('span'), {
          className: 'number-cell',
          textContent: item.noSurat || '—'
        })
      );
      const salin = document.createElement('button');
      salin.className = 'copy-button';
      salin.type = 'button';
      salin.textContent = 'Salin';
      salin.addEventListener('click', () => copyToClipboard(item.noSurat || ''));
      barisNomor.append(salin);
      nomorSel.append(barisNomor);

      const sifatSel = document.createElement('td');
      sifatSel.dataset.label = 'Sifat';
      sifatSel.append(
        badge(item.sifat === 'rahasia' ? 'Rahasia' : 'Biasa', item.sifat === 'rahasia' ? 'danger' : 'muted')
      );

      const statusSel = document.createElement('td');
      statusSel.dataset.label = 'Status';
      statusSel.append(badge(item.status || 'Baru', formatStatusKind(item.status)));

      const aksiSel = document.createElement('td');
      const detail = document.createElement('button');
      detail.className = 'button small secondary';
      detail.type = 'button';
      detail.textContent = 'Detail';
      detail.addEventListener('click', () => bukaForm(item, !canEdit));
      aksiSel.append(detail);

      baris.append(
        sel('Agenda', item.noAgenda),
        sel('Tanggal', formatTanggal(item.tglTerima)),
        nomorSel,
        sel('Asal', item.asal),
        sel('Perihal', item.hal),
        sifatSel,
        statusSel,
        aksiSel
      );
      return baris;
    })
  );
};

const muat = async () => {
  note.textContent = 'Memuat daftar surat…';
  try {
    const hasil = await daftarSuratMasuk({ ...filter, page: halaman });
    items = hasil.items;
    totalHalaman = hasil.pagination.totalPages;
    renderBaris();
    prev.disabled = halaman <= 1;
    next.disabled = halaman >= totalHalaman;
    pageLabel.textContent = `Halaman ${halaman} dari ${totalHalaman}`;
    note.textContent = `${hasil.pagination.total} surat ditemukan.`;
  } catch (error) {
    pesanTabel(body, 8, 'Daftar surat gagal dimuat.', error.message);
    note.textContent = 'Gagal memuat data.';
  }
};

const setReadOnly = (bacaSaja) => {
  form.querySelectorAll('input, select, textarea').forEach((field) => {
    field.disabled = bacaSaja || (field.name === 'scan' && !canCreate);
  });
  saveButton.hidden = bacaSaja;
  dispositionButton.hidden = bacaSaja || !canEdit;
  document.querySelector('#file-label').hidden = bacaSaja || !canCreate;
};

const bukaForm = (item = null, bacaSaja = false) => {
  formError.hidden = true;
  form.reset();
  formPanel.hidden = false;
  document.querySelector('#form-title').textContent = item
    ? bacaSaja
      ? 'Detail surat masuk'
      : 'Ubah surat masuk'
    : 'Tambah surat masuk';
  document.querySelector('#form-note').textContent = item
    ? `Nomor agenda ${item.noAgenda}.`
    : 'Nomor agenda dibuat otomatis saat disimpan.';

  const tujuan = item?.disposisi?.kepada || item?.aksesBidang || [];
  form.elements.id.value = item?.id || '';
  form.dataset.fileUrl = item?.fileUrl || '';
  form.elements.tglTerima.value = inputTanggal(item?.tglTerima || new Date());
  form.elements.tglSurat.value = inputTanggal(item?.tglSurat || new Date());
  form.elements.noSurat.value = item?.noSurat || '';
  form.elements.asal.value = item?.asal || '';
  form.elements.hal.value = item?.hal || '';
  form.elements.isiRingkas.value = item?.isiRingkas || '';
  form.elements.sifat.value = item?.sifat || 'biasa';
  form.elements.diputuskanOleh.value = item?.disposisi?.diputuskanOleh || 'Kadis';
  form.elements.catatanDisposisi.value = item?.disposisi?.catatan || '';
  opsiBidang(document.querySelector('#access-options'), 'aksesBidang', item?.aksesBidang || []);
  opsiBidang(document.querySelector('#disposition-options'), 'tujuanBidang', tujuan);
  document.querySelector('#access-fieldset').hidden = form.elements.sifat.value !== 'rahasia';
  document.querySelector('#disposition-fieldset').hidden = !canEdit;
  downloadButton.hidden = !item?.fileId;
  downloadButton.dataset.id = item?.id || '';
  fileLink.hidden = !item?.fileUrl;
  fileLink.href = item?.fileUrl || '#';
  setReadOnly(bacaSaja);
  formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const tutupForm = () => {
  formPanel.hidden = true;
  if (returnToRow && document.body.contains(returnToRow)) {
    returnToRow.focus({ preventScroll: true });
    returnToRow.scrollIntoView({ block: 'nearest' });
  }
  returnToRow = null;
};

const payloadForm = () => ({
  tglTerima: tanggalIso(form.elements.tglTerima.value),
  tglSurat: tanggalIso(form.elements.tglSurat.value),
  noSurat: form.elements.noSurat.value.trim(),
  asal: form.elements.asal.value.trim(),
  hal: form.elements.hal.value.trim(),
  isiRingkas: form.elements.isiRingkas.value.trim(),
  sifat: form.elements.sifat.value,
  aksesBidang: [...document.querySelectorAll('input[name="aksesBidang"]:checked')].map(
    (input) => input.value
  ),
  fileUrl: form.dataset.fileUrl || ''
});

createAutocomplete({
  input: form.elements.noSurat,
  loadSuggestions: (kataKunci) => cariNomor(kataKunci, 5),
  renderItem: (item) => {
    const wadah = document.createElement('span');
    wadah.append(
      Object.assign(document.createElement('strong'), { textContent: item.kode || '—' }),
      Object.assign(document.createElement('small'), { textContent: item.nama || 'Tanpa keterangan' })
    );
    return wadah;
  },
  formatSelected: (item) => item.kode || '',
  onSelect: (item) => {
    form.elements.noSurat.value = item.kode || '';
  }
});

document.querySelector('#new-button').hidden = !canCreate;
document.querySelector('#new-button').addEventListener('click', () => bukaForm());
document.querySelector('#close-form').addEventListener('click', tutupForm);
formPanel.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') tutupForm();
});
form.elements.sifat.addEventListener('change', () => {
  document.querySelector('#access-fieldset').hidden = form.elements.sifat.value !== 'rahasia';
});

attachRowNavigation(body, (id, row) => {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  returnToRow = row;
  bukaForm(item, !canEdit);
});

document.querySelector('#search-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  filter = { ...filter, search: document.querySelector('#global-search').value.trim() };
  halaman = 1;
  await muat();
});

document.querySelector('#clear-search').addEventListener('click', async () => {
  document.querySelector('#global-search').value = '';
  filter = { ...filter, search: '' };
  halaman = 1;
  await muat();
});

document.querySelector('#filter-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  filter = {
    ...filter,
    sifat: data.sifat,
    status: data.status,
    tglMulai: data.tglMulai,
    tglSelesai: data.tglSelesai
  };
  halaman = 1;
  await muat();
});

document.querySelector('#reset-filter').addEventListener('click', async () => {
  document.querySelector('#filter-form').reset();
  filter = { search: filter.search, sifat: 'semua', status: 'semua', tglMulai: '', tglSelesai: '' };
  halaman = 1;
  await muat();
});

document.querySelector('#refresh-button').addEventListener('click', muat);
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

document.querySelector('#export-button').addEventListener('click', async () => {
  try {
    const data = await eksporSuratMasuk(filter);
    const rows = data.map((item) => ({
      'No. Agenda': item.noAgenda,
      'Tanggal Terima': formatTanggal(item.tglTerima),
      'Tanggal Surat': formatTanggal(item.tglSurat),
      'No. Surat': item.noSurat,
      Asal: item.asal,
      Hal: item.hal,
      'Isi Ringkas': item.isiRingkas,
      Sifat: item.sifat,
      Status: item.status
    }));
    await eksporExcel(rows, 'surat-masuk.xlsx', 'Surat Masuk');
  } catch (error) {
    showToast(error.message || 'Ekspor gagal.', 'error');
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.hidden = true;
  const disposisi = event.submitter?.dataset.action === 'disposition';
  const target = [...document.querySelectorAll('input[name="tujuanBidang"]:checked')].map(
    (input) => input.value
  );
  if (disposisi && !target.length) return tampilError('Pilih minimal satu bidang tujuan disposisi.');

  const data = payloadForm();
  if (!form.elements.tglTerima.value || !form.elements.tglSurat.value) {
    return tampilError('Tanggal terima dan tanggal surat wajib diisi.');
  }
  if (!data.noSurat || !data.asal || !data.hal || !data.isiRingkas) {
    return tampilError('Semua field surat wajib diisi.');
  }
  if (data.sifat === 'rahasia' && !data.aksesBidang.length) {
    return tampilError('Pilih minimal satu bidang untuk surat rahasia.');
  }
  const file = form.elements.scan.files[0];
  if (
    file &&
    (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024)
  ) {
    return tampilError('Scan harus PDF/JPG/PNG dan maksimal 5 MB.');
  }

  saveButton.disabled = true;
  try {
    const id = form.elements.id.value;
    const tersimpan = id ? await ubahSuratMasuk(id, data) : await tambahSuratMasuk(data);
    if (file) await unggahScanMasuk(tersimpan.id, file);
    if (disposisi) {
      await disposisiSuratMasuk(tersimpan.id, {
        kepada: target,
        diputuskanOleh: form.elements.diputuskanOleh.value,
        catatan: form.elements.catatanDisposisi.value
      });
    }
    tutupForm();
    showToast(id ? 'Surat masuk diperbarui.' : 'Surat masuk disimpan.');
    halaman = 1;
    await muat();
  } catch (error) {
    tampilError(error.message || 'Surat tidak dapat disimpan.');
  } finally {
    saveButton.disabled = false;
  }
});

downloadButton.addEventListener('click', () => {
  const id = downloadButton.dataset.id;
  if (id) window.open(urlBerkasMasuk(id), '_blank', 'noopener');
});

try {
  bidang = await daftarBidang(false);
} catch {
  bidang = [];
}
await muat();
