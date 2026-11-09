import { signOutUser } from '../services/auth.js';
import { collection, getDocs, limit, query, where } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from '../services/firebase.js';
export const badge = (label, kind = 'muted') => { const el = document.createElement('span'); el.className = `badge ${kind}`; el.textContent = label; return el; };
export const renderShell = ({ active, session }) => {
  const shell = document.querySelector('#app-shell');
  const isBidang = session.profile.role === 'bidang';

  let nav = [];
  if (isBidang) {
    nav = [
      ['surat-keluar.html', 'Surat keluar', 'keluar']
    ];
  } else {
    nav = [
      ['dashboard.html', 'Dashboard', 'dashboard'],
      ['surat-masuk.html', 'Surat masuk', 'masuk'],
      ['surat-keluar.html', 'Surat keluar', 'keluar'],
      ['laporan.html', 'Laporan', 'laporan']
    ];
    if (session.profile.role === 'admin') nav.push(['admin.html', 'Admin', 'admin']);
  }

  const header = document.createElement('header'); header.className = 'app-header';
  const inner = document.createElement('div'); inner.className = 'nav-inner';
  const brand = document.createElement('a'); brand.className = 'brand-link';
  brand.href = isBidang ? './surat-keluar.html' : './dashboard.html';
  brand.textContent = 'SiPrima';
  inner.append(brand);
  const links = document.createElement('nav'); links.className = 'nav-links'; links.setAttribute('aria-label','Navigasi utama');
  nav.forEach(([href, label, key]) => {
    const a = document.createElement('a');
    a.href = `./${href}`;
    a.textContent = label;
    if (active === key) a.classList.add('active');
    links.append(a);
  });
  inner.append(links);
  const user = document.createElement('div'); user.className = 'user-menu'; const name = document.createElement('span'); name.textContent = session.profile.nama || session.user.email; const out = document.createElement('button'); out.className = 'button small secondary'; out.textContent = 'Keluar'; out.type = 'button'; out.addEventListener('click', async () => { await signOutUser(); window.location.href = './index.html'; }); user.append(name, out); inner.append(user); header.append(inner); shell.replaceChildren(header);
};
const loadInboxBadge = async (session, target) => {
  try {
    const snap = await getDocs(query(collection(db, 'suratMasuk'), where('aksesBidang', 'array-contains', session.profile.bidang), limit(100)));
    const count = snap.docs.reduce((total, item) => { const data = item.data(); return total + (data.tindakLanjut?.[session.profile.bidang]?.status === 'Sudah' ? 0 : 1); }, 0);
    target.textContent = count > 99 ? '99+' : String(count); target.setAttribute('aria-label', `${count} surat belum ditindaklanjuti`); target.hidden = count === 0;
  } catch { target.hidden = true; }
};
export const showToast = (message) => { const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message; document.body.append(toast); setTimeout(() => toast.remove(), 2600); };
