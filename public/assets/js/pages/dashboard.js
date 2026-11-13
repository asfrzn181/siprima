import { wajibIzin } from '../api/client.js';
import { ringkasanDashboard } from '../api/admin.api.js';
import { badge, renderShell, showToast, skeletonRows } from '../components/ui.js';
import { formatTanggal, formatStatusKind } from '../utils/format.js';

const session = await wajibIzin('dashboard.baca');
renderShell({ active: 'dashboard', session, title: 'Dashboard' });
document.querySelector('#welcome').textContent =
  `Selamat datang, ${session.profile.nama || session.user.email}.`;

const masukBody = document.querySelector('#masuk-body');
const keluarBody = document.querySelector('#keluar-body');
const refresh = document.querySelector('#refresh');

const barisKosong = (tbody, pesan, detail) => {
  const baris = document.createElement('tr');
  const sel = document.createElement('td');
  sel.colSpan = 6;
  const kotak = document.createElement('div');
  kotak.className = 'empty-state';
  kotak.append(Object.assign(document.createElement('strong'), { textContent: pesan }));
  if (detail) kotak.append(Object.assign(document.createElement('span'), { textContent: detail }));
  sel.append(kotak);
  baris.append(sel);
  tbody.replaceChildren(baris);
};

const tampilkanSkeleton = (tbody) => {
  tbody.replaceChildren();
  for (let i = 0; i < 4; i += 1) {
    const baris = document.createElement('tr');
    const sel = document.createElement('td');
    sel.colSpan = 6;
    sel.append(skeletonRows(1));
    baris.append(sel);
    tbody.append(baris);
  }
};

const renderBaris = (tbody, items, pemetaan, pesanKosong, detailKosong) => {
  if (!items.length) {
    barisKosong(tbody, pesanKosong, detailKosong);
    return;
  }
  tbody.replaceChildren(
    ...items.map((item, index) => {
      const baris = document.createElement('tr');
      const nomorSel = document.createElement('td');
      nomorSel.dataset.label = 'No. Urut';
      nomorSel.textContent = String(index + 1);
      baris.append(nomorSel);
      pemetaan(item).forEach((sel) => {
        const td = document.createElement('td');
        td.dataset.label = sel.label;
        if (sel.node) td.append(sel.node);
        else td.textContent = sel.text || '—';
        baris.append(td);
      });
      return baris;
    })
  );
};

const selNomor = (nilai) => {
  const kotak = document.createElement('div');
  kotak.className = 'number-cell';
  kotak.textContent = nilai || '—';
  return kotak;
};

const muat = async () => {
  refresh.disabled = true;
  tampilkanSkeleton(masukBody);
  tampilkanSkeleton(keluarBody);
  try {
    const stats = await ringkasanDashboard();
    document.querySelector('#masuk-hari-ini').textContent = stats.masukHariIni;
    document.querySelector('#keluar-hari-ini').textContent = stats.keluarHariIni;
    document.querySelector('#belum-diproses').textContent = stats.belumDiproses;
    document.querySelector('#masuk-bulan').textContent = `Bulan ini: ${stats.masukBulan} surat`;
    document.querySelector('#keluar-bulan').textContent = `Bulan ini: ${stats.keluarBulan} surat`;

    renderBaris(
      masukBody,
      stats.suratMasukTerbaru,
      (item) => [
        { label: 'Nomor surat', node: selNomor(item.noSurat) },
        { label: 'Tanggal', text: formatTanggal(item.tglTerima || item.tglSurat) },
        { label: 'Asal', text: item.asal },
        { label: 'Perihal', text: item.hal },
        { label: 'Status', node: badge(item.status || 'Baru', formatStatusKind(item.status)) }
      ],
      'Belum ada surat masuk tercatat.',
      'Tambahkan lewat menu Surat masuk.'
    );

    renderBaris(
      keluarBody,
      stats.suratKeluarTerbaru,
      (item) => [
        { label: 'Nomor surat', node: selNomor(item.noSurat) },
        { label: 'Tanggal', text: formatTanggal(item.tglSurat) },
        { label: 'Tujuan', text: item.tujuan },
        { label: 'Perihal', text: item.hal },
        { label: 'Status', node: badge(item.status || 'Aktif', formatStatusKind(item.status)) }
      ],
      'Belum ada surat keluar tercatat.',
      'Terbitkan nomor lewat menu Surat keluar.'
    );
  } catch (error) {
    showToast(error.message || 'Ringkasan gagal dimuat.', 'error');
    barisKosong(masukBody, 'Ringkasan gagal dimuat.', 'Periksa koneksi lalu muat ulang.');
    barisKosong(keluarBody, 'Ringkasan gagal dimuat.', 'Periksa koneksi lalu muat ulang.');
  } finally {
    refresh.disabled = false;
  }
};

refresh.addEventListener('click', muat);
await muat();
