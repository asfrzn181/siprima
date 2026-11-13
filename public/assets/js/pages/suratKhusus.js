import { punyaIzin, wajibMasuk } from '../api/client.js';
import {
  daftarSuratKhusus,
  hapusSuratKhusus,
  tambahSuratKhusus,
  ubahSuratKhusus
} from '../api/suratKhusus.api.js';
import { renderShell, showToast } from '../components/ui.js';
import { pesanTabel } from '../utils/dom.js';
import { eksporExcel } from '../utils/excel.js';
import { formatTanggal, inputTanggal, tanggalIso } from '../utils/format.js';

export const initSuratKhusus = async ({ jenis, judul, labelTentang, labelNomor }) => {
  const sesi = await wajibMasuk();
  const kunci = jenis.toLowerCase();
  if (!punyaIzin(sesi.profile, `${kunci}.lihat`)) {
    window.location.replace('./dashboard.html');
    throw new Error(`Akses ${judul} dibatasi.`);
  }
  renderShell({ active: kunci, session: sesi, title: judul });

  const bolehTulis = punyaIzin(sesi.profile, `${kunci}.tulis`);
  const bolehHapus = punyaIzin(sesi.profile, `${kunci}.hapus`);
  const bolehCetak = punyaIzin(sesi.profile, `${kunci}.cetak`);

  const body = document.querySelector('#list-body');
  const note = document.querySelector('#list-note');
  const pageLabel = document.querySelector('#page-label');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const panel = document.querySelector('#form-panel');
  const form = document.querySelector('#form');
  const formError = document.querySelector('#form-error');
  const saveButton = document.querySelector('#save');
  const exportButton = document.querySelector('#export');

  let halaman = 1;
  let totalHalaman = 1;
  let items = [];
  let filter = { search: '' };

  const sel = (label, teks) => {
    const td = document.createElement('td');
    td.dataset.label = label;
    td.textContent = teks || '—';
    return td;
  };

  const render = () => {
    if (!items.length) {
      pesanTabel(body, 6, 'Tidak ada data sesuai filter.', 'Ubah kata kunci atau tambah data baru.');
      return;
    }
    const mulai = (halaman - 1) * 20;
    body.replaceChildren(
      ...items.map((item, index) => {
        const baris = document.createElement('tr');
        baris.dataset.id = item.id;

        const aksi = document.createElement('td');
        const detail = document.createElement('button');
        detail.className = 'button small secondary';
        detail.type = 'button';
        detail.textContent = bolehTulis ? 'Ubah' : 'Lihat';
        detail.addEventListener('click', () => buka(item, !bolehTulis));
        aksi.append(detail);

        if (bolehHapus) {
          const hapus = document.createElement('button');
          hapus.className = 'button small secondary';
          hapus.type = 'button';
          hapus.textContent = 'Hapus';
          hapus.style.marginLeft = '0.4rem';
          hapus.addEventListener('click', () => hapusData(item));
          aksi.append(hapus);
        }

        const kolom = [sel('No. Urut', String(mulai + index + 1))];
        if (jenis === 'SK') {
          kolom.push(sel(labelTentang, item.tentang), sel(labelNomor, item.nomor));
        } else {
          kolom.push(sel(labelNomor, item.nomor), sel(labelTentang, item.tentang));
        }
        kolom.push(sel('Tanggal', formatTanggal(item.tanggal)), sel('Keterangan', item.keterangan), aksi);
        baris.append(...kolom);
        return baris;
      })
    );
  };

  const muat = async () => {
    note.textContent = 'Memuat…';
    try {
      const hasil = await daftarSuratKhusus(jenis, { ...filter, page: halaman });
      items = hasil.items;
      totalHalaman = hasil.pagination.totalPages;
      render();
      prev.disabled = halaman <= 1;
      next.disabled = halaman >= totalHalaman;
      pageLabel.textContent = `Halaman ${halaman} dari ${totalHalaman}`;
      note.textContent = `${hasil.pagination.total} data ditemukan.`;
    } catch (error) {
      pesanTabel(body, 6, 'Data gagal dimuat.', error.message);
      note.textContent = 'Gagal memuat data.';
    }
  };

  const buka = (item = null, bacaSaja = false) => {
    formError.hidden = true;
    form.reset();
    panel.hidden = false;
    document.querySelector('#form-title').textContent = item
      ? bacaSaja
        ? `Detail ${judul}`
        : `Ubah ${judul}`
      : `Tambah ${judul}`;
    form.elements.id.value = item?.id || '';
    form.elements.tentang.value = item?.tentang || '';
    form.elements.nomor.value = item?.nomor || '';
    form.elements.tanggal.value = inputTanggal(item?.tanggal || new Date());
    form.elements.keterangan.value = item?.keterangan || '';
    form.querySelectorAll('input, textarea').forEach((field) => {
      field.disabled = bacaSaja;
    });
    saveButton.hidden = bacaSaja || !bolehTulis;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tutup = () => {
    panel.hidden = true;
    form.querySelectorAll('input, textarea').forEach((field) => {
      field.disabled = false;
    });
  };

  const hapusData = async (item) => {
    if (!confirm(`Hapus ${judul} "${item.tentang}"?`)) return;
    try {
      await hapusSuratKhusus(jenis, item.id);
      showToast(`${judul} dihapus.`);
      await muat();
    } catch (error) {
      showToast(error.message || 'Data gagal dihapus.', 'error');
    }
  };

  document.querySelector('#new-button').hidden = !bolehTulis;
  document.querySelector('#new-button').addEventListener('click', () => buka());
  document.querySelector('#close-form').addEventListener('click', tutup);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') tutup();
  });

  document.querySelector('#filter-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    filter = { search: event.currentTarget.elements.search.value.trim() };
    halaman = 1;
    await muat();
  });

  document.querySelector('#reset-filter').addEventListener('click', async () => {
    document.querySelector('#filter-form').reset();
    filter = { search: '' };
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

  if (!bolehCetak) exportButton.hidden = true;
  exportButton.addEventListener('click', async () => {
    try {
      const hasil = await daftarSuratKhusus(jenis, { ...filter, page: 1, limit: 100 });
      const rows = hasil.items.map((item, index) => ({
        'No. Urut': index + 1,
        [labelNomor]: item.nomor,
        [labelTentang]: item.tentang,
        'Tanggal': formatTanggal(item.tanggal),
        Keterangan: item.keterangan
      }));
      await eksporExcel(rows, `${kunci}.xlsx`, jenis);
    } catch (error) {
      showToast(error.message || 'Ekspor gagal.', 'error');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.hidden = true;
    const id = form.elements.id.value;
    const data = {
      tentang: form.elements.tentang.value.trim(),
      nomor: form.elements.nomor.value.trim(),
      tanggal: tanggalIso(form.elements.tanggal.value),
      keterangan: form.elements.keterangan.value.trim()
    };
    if (!data.tentang || !data.nomor || !data.tanggal) {
      formError.textContent = `${labelTentang}, ${labelNomor}, dan tanggal wajib diisi.`;
      formError.hidden = false;
      return;
    }
    saveButton.disabled = true;
    try {
      if (id) await ubahSuratKhusus(jenis, id, data);
      else await tambahSuratKhusus(jenis, data);
      tutup();
      halaman = 1;
      await muat();
      showToast(id ? `${judul} diperbarui.` : `${judul} disimpan.`);
    } catch (error) {
      formError.textContent = error.message || 'Data gagal disimpan.';
      formError.hidden = false;
    } finally {
      saveButton.disabled = false;
    }
  });

  await muat();
};
