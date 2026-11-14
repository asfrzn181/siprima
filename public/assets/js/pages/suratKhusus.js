import { punyaIzin, wajibMasuk } from '../api/client.js';
import { cariNomor } from '../api/master.api.js';
import {
  batalkanSuratKhusus,
  daftarSuratKhusus,
  nomorTersediaSuratKhusus,
  tambahSuratKhusus,
  ubahSuratKhusus
} from '../api/suratKhusus.api.js';
import { createAutocomplete } from '../components/autocomplete.js';
import { badge, dialogInput, renderShell, showToast } from '../components/ui.js';
import { pesanTabel } from '../utils/dom.js';
import { eksporExcel } from '../utils/excel.js';
import { formatStatusKind, formatTanggal, inputTanggal, tanggalIso } from '../utils/format.js';

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
  const perluJenis = jenis === 'SK';

  const body = document.querySelector('#list-body');
  const note = document.querySelector('#list-note');
  const pageLabel = document.querySelector('#page-label');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const panel = document.querySelector('#form-panel');
  const form = document.querySelector('#form');
  const formError = document.querySelector('#form-error');
  const saveButton = document.querySelector('#save');
  const cancelButton = document.querySelector('#cancel-record');
  const exportButton = document.querySelector('#export');
  const jenisCari = form.elements.jenisCari || null;
  const jenisId = form.elements.jenisId || null;

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
      pesanTabel(body, 7, 'Tidak ada data sesuai filter.', 'Ubah kata kunci atau tambah data baru.');
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
        detail.textContent = bolehTulis && item.status !== 'Dibatalkan' ? 'Ubah' : 'Lihat';
        detail.addEventListener('click', () => buka(item, !bolehTulis || item.status === 'Dibatalkan'));
        aksi.append(detail);

        if (bolehHapus && item.status !== 'Dibatalkan') {
          const hapus = document.createElement('button');
          hapus.className = 'button small secondary';
          hapus.type = 'button';
          hapus.textContent = 'Batalkan';
          hapus.style.marginLeft = '0.4rem';
          hapus.addEventListener('click', () => batalkanData(item));
          aksi.append(hapus);
        }

        const kolom = [sel('No. Urut', String(mulai + index + 1))];
        if (jenis === 'SK') {
          kolom.push(sel(labelTentang, item.tentang), sel(labelNomor, item.nomor));
        } else {
          kolom.push(sel(labelNomor, item.nomor), sel(labelTentang, item.tentang));
        }
        const status = document.createElement('td');
        status.dataset.label = 'Status';
        status.append(badge(item.status || 'Aktif', formatStatusKind(item.status)));
        kolom.push(
          sel('Tanggal', formatTanggal(item.tanggal)),
          sel('Keterangan', item.keterangan),
          status,
          aksi
        );
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
      pesanTabel(body, 7, 'Data gagal dimuat.', error.message);
      note.textContent = 'Gagal memuat data.';
    }
  };

  const muatTersedia = async () => {
    if (!form.elements.tanggal.value) return;
    if (perluJenis && !jenisId?.value) {
      form.elements.nomorGenerated.value = '';
      return;
    }
    try {
      const hasil = await nomorTersediaSuratKhusus(jenis, {
        jenisId: jenisId?.value || undefined,
        tanggal: tanggalIso(form.elements.tanggal.value)
      });
      form.elements.nomorGenerated.value = hasil.items?.length
        ? hasil.items[0].nomor
        : hasil.nomorBerikutnya || '';
    } catch (error) {
      form.elements.nomorGenerated.value = '';
      formError.textContent = error.message || 'Daftar nomor tersedia gagal dimuat.';
      formError.hidden = false;
    }
  };

  const buka = (item = null, bacaSaja = false) => {
    formError.hidden = true;
    form.reset();
    panel.hidden = false;
    const dibatalkan = item?.status === 'Dibatalkan';
    document.querySelector('#form-title').textContent = item
      ? bacaSaja
        ? `Detail ${judul}`
        : `Ubah ${judul}`
      : `Tambah ${judul}`;
    form.elements.id.value = item?.id || '';
    form.elements.tentang.value = item?.tentang || '';
    form.elements.tanggal.value = inputTanggal(item?.tanggal || new Date());
    form.elements.keterangan.value = item?.keterangan || '';
    form.elements.nomorGenerated.value = item?.nomor || '';

    if (perluJenis) {
      jenisId.replaceChildren();
      if (item?.jenisId) {
        jenisId.append(new Option(String(item.jenisId), item.jenisId));
        jenisId.value = item.jenisId;
      }
      jenisCari.value = item?.nomor ? item.nomor.split('/')[0] : '';
      jenisCari.disabled = Boolean(item) || bacaSaja || !bolehTulis;
      jenisId.disabled = Boolean(item) || bacaSaja;
    }

    form.querySelectorAll('input[name="tentang"], input[name="tanggal"], textarea[name="keterangan"]').forEach(
      (field) => {
        field.disabled = bacaSaja || dibatalkan;
      }
    );
    saveButton.hidden = bacaSaja || dibatalkan || !bolehTulis;
    cancelButton.hidden = !item || dibatalkan || !bolehHapus;
    cancelButton.textContent = `Batalkan ${jenis}`;
    if (!item && bolehTulis) muatTersedia();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tutup = () => {
    panel.hidden = true;
  };

  if (perluJenis) {
    createAutocomplete({
      input: jenisCari,
      loadSuggestions: (kataKunci) => cariNomor(kataKunci, 5),
      renderItem: (item) => {
        const wadah = document.createElement('span');
        wadah.append(
          Object.assign(document.createElement('strong'), { textContent: item.kode || '—' }),
          Object.assign(document.createElement('small'), { textContent: item.nama || 'Tanpa keterangan' })
        );
        return wadah;
      },
      formatSelected: (item) => `${item.kode || ''} — ${item.nama || 'Tanpa keterangan'}`,
      onSelect: (item) => {
        let opsi = [...jenisId.options].find((option) => option.value === String(item.id));
        if (!opsi) {
          opsi = new Option(item.kode || item.nama || String(item.id), item.id);
          jenisId.append(opsi);
        }
        jenisId.value = item.id;
        muatTersedia();
      }
    });
    jenisCari.addEventListener('input', () => {
      if (!jenisCari.value.trim()) {
        jenisId.replaceChildren();
        form.elements.nomorGenerated.value = '';
      }
    });
  }

  form.elements.tanggal.addEventListener('change', muatTersedia);

  const batalkanData = async (item) => {
    const alasan = await dialogInput({
      judul: 'Batalkan Nomor',
      nomor: item.nomor ? `Nomor: ${item.nomor}` : '',
      deskripsi: `${judul} "${item.tentang || '—'}" akan ditandai batal. Data tidak dihapus.`,
      label: 'Keterangan pembatalan',
      placeholder: 'Tuliskan alasan pembatalan nomor…',
      teksKonfirmasi: 'Batalkan Nomor',
      teksBatal: 'Kembali',
      pesanWajib: 'Keterangan pembatalan wajib diisi.'
    });
    if (!alasan) return;
    try {
      await batalkanSuratKhusus(jenis, item.id, alasan);
      showToast(`${judul} dibatalkan.`);
      await muat();
    } catch (error) {
      showToast(error.message || 'Data gagal dibatalkan.', 'error');
    }
  };

  document.querySelector('#new-button').hidden = !bolehTulis;
  document.querySelector('#new-button').addEventListener('click', () => buka());
  document.querySelector('#close-form').addEventListener('click', tutup);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') tutup();
  });

  cancelButton.addEventListener('click', async () => {
    const id = form.elements.id.value;
    const item = items.find((row) => String(row.id) === String(id));
    if (item) await batalkanData(item);
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
        Tanggal: formatTanggal(item.tanggal),
        Keterangan: item.keterangan,
        Status: item.status
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
      tanggal: tanggalIso(form.elements.tanggal.value),
      keterangan: form.elements.keterangan.value.trim()
    };
    if (perluJenis) data.jenisId = jenisId.value || undefined;
    if (!data.tentang || !data.tanggal) {
      formError.textContent = `${labelTentang} dan tanggal wajib diisi.`;
      formError.hidden = false;
      return;
    }
    if (perluJenis && !data.jenisId) {
      formError.textContent = 'Jenis nomor (klasifikasi) wajib dipilih.';
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
