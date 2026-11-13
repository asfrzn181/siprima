import { wajibPeran } from '../api/client.js';
import { renderShell } from '../components/ui.js';
import { initAudit } from './admin/audit.js';
import { initBidang } from './admin/bidang.js';
import { initCleaner } from './admin/cleaner.js';
import { initNomor } from './admin/nomor.js';
import { initPengaturan } from './admin/pengaturan.js';
import { pasangModal } from './admin/shared.js';
import { initUsers } from './admin/users.js';

const sesi = await wajibPeran('admin');
renderShell({ active: 'admin', session: sesi, title: 'Administrasi' });
pasangModal();

const inisialisasi = {
  users: initUsers,
  bidang: initBidang,
  nomor: initNomor,
  settings: initPengaturan,
  audit: initAudit,
  cleaner: initCleaner
};

const sudah = new Set();

const bukaTab = async (nama, tombol) => {
  document.querySelectorAll('.tab-button').forEach((item) => {
    item.classList.toggle('active', item === tombol);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.hidden = panel.id !== `tab-${nama}`;
  });
  if (sudah.has(nama) || !inisialisasi[nama]) return;
  sudah.add(nama);
  await inisialisasi[nama]();
};

document.querySelectorAll('[data-tab]').forEach((tombol) => {
  tombol.addEventListener('click', () => bukaTab(tombol.dataset.tab, tombol));
});

await bukaTab('users', document.querySelector('[data-tab="users"]'));
