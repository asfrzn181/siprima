import { wajibPeran } from '../api/client.js';
import { renderShell } from '../components/ui.js';
import { initAsalTujuan } from './admin/asalTujuan.js';
import { initAudit } from './admin/audit.js';
import { initBidang } from './admin/bidang.js';
import { initCleaner } from './admin/cleaner.js';
import { initMenu } from './admin/menu.js';
import { initNomor } from './admin/nomor.js';
import { initPengaturan } from './admin/pengaturan.js';
import { initPeran } from './admin/peran.js';
import { pasangModal } from './admin/shared.js';
import { initUsers } from './admin/users.js';

const sesi = await wajibPeran('admin');
renderShell({ active: 'admin', session: sesi, title: 'Administrasi' });
pasangModal();

const inisialisasi = {
  users: initUsers,
  bidang: initBidang,
  'asal-tujuan': initAsalTujuan,
  nomor: initNomor,
  peran: initPeran,
  settings: initPengaturan,
  audit: initAudit,
  cleaner: initCleaner,
  menu: initMenu
};

const sudah = new Set();

const bukaTab = async (nama, tombol) => {
  document.querySelectorAll('.tab-button').forEach((item) => {
    item.classList.toggle('active', item === tombol);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.hidden = panel.id !== `tab-${nama}`;
  });
  if (!sudah.has(nama) && inisialisasi[nama]) {
    sudah.add(nama);
    await inisialisasi[nama]();
  }
};

const tabDari = (nilai) => (nilai && inisialisasi[nilai] ? nilai : 'users');

const bukaDariHash = async (perbaruiHash = true) => {
  const nama = tabDari(decodeURIComponent(window.location.hash.replace('#', '')));
  if (perbaruiHash) window.history.replaceState(null, '', `#${nama}`);
  await bukaTab(nama, document.querySelector(`[data-tab="${nama}"]`));
};

document.querySelectorAll('[data-tab]').forEach((tombol) => {
  tombol.addEventListener('click', async () => {
    window.history.replaceState(null, '', `#${tombol.dataset.tab}`);
    await bukaTab(tombol.dataset.tab, tombol);
  });
});

window.addEventListener('hashchange', () => bukaDariHash(false));

await bukaDariHash();
