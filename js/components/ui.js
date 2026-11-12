import { signOutUser } from '../services/auth.js';
import { collection, getDocs, limit, query, where } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from '../services/firebase.js';

const NAV = [
  { href: 'dashboard.html', label: 'Dashboard', key: 'dashboard' },
  { href: 'surat-masuk.html', label: 'Surat masuk', key: 'masuk' },
  { href: 'surat-keluar.html', label: 'Surat keluar', key: 'keluar' },
  { href: 'laporan.html', label: 'Laporan', key: 'laporan' },
  { href: 'admin.html', label: 'Admin', key: 'admin', adminOnly: true }
];

const BIDANG_NAV = [{ href: 'surat-keluar.html', label: 'Surat keluar', key: 'keluar' }];

export const badge = (label, kind = 'muted') => {
  const el = document.createElement('span');
  el.className = `badge ${kind}`;
  el.textContent = label;
  return el;
};

const navItemsFor = (session) => {
  const role = session.profile.role;
  if (role === 'bidang') return BIDANG_NAV;
  return NAV.filter((item) => !item.adminOnly || role === 'admin');
};

const buildSidebar = ({ nav, active, isBidang, session }) => {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.setAttribute('aria-label', 'Navigasi utama');

  const brand = document.createElement('a');
  brand.className = 'sidebar-brand';
  brand.href = isBidang ? './surat-keluar.html' : './dashboard.html';
  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = 'SP';
  const brandText = document.createElement('span');
  brandText.textContent = 'SiPrima';
  brand.append(mark, brandText);

  const links = document.createElement('nav');
  links.className = 'sidebar-nav';
  nav.forEach((item) => {
    const a = document.createElement('a');
    a.href = `./${item.href}`;
    a.textContent = item.label;
    if (active === item.key) a.setAttribute('aria-current', 'page');
    links.append(a);
  });

  const foot = document.createElement('div');
  foot.className = 'sidebar-foot';
  const name = document.createElement('p');
  name.className = 'muted nowrap';
  name.style.margin = '0 0 8px';
  name.textContent = session.profile.nama || session.user.email;
  const out = document.createElement('button');
  out.className = 'button secondary small';
  out.type = 'button';
  out.textContent = 'Keluar';
  out.addEventListener('click', async () => {
    out.disabled = true;
    out.textContent = 'Mengeluarkan…';
    try { await signOutUser(); } finally { window.location.href = './index.html'; }
  });
  foot.append(name, out);

  sidebar.append(brand, links, foot);
  return sidebar;
};

export const renderShell = ({ active, session, title, subtitle }) => {
  const shell = document.querySelector('#app-shell');
  if (!shell) return;

  const isBidang = session.profile.role === 'bidang';
  const nav = navItemsFor(session);
  const current = nav.find((item) => item.key === active);

  const skip = document.createElement('a');
  skip.className = 'skip-link';
  skip.href = '#main-content';
  skip.textContent = 'Lewati ke konten utama';

  const sidebar = buildSidebar({ nav, active, isBidang, session });

  const scrim = document.createElement('button');
  scrim.className = 'scrim';
  scrim.type = 'button';
  scrim.hidden = true;
  scrim.setAttribute('aria-label', 'Tutup navigasi');

  const main = document.createElement('div');
  main.className = 'app-main';

  const topbar = document.createElement('header');
  topbar.className = 'topbar';
  const toggle = document.createElement('button');
  toggle.className = 'nav-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'sidebar');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span class="sr-only">Buka navigasi</span><span aria-hidden="true">&#9776;</span>';
  const heading = document.createElement('div');
  heading.className = 'topbar-title';
  heading.textContent = title || current?.label || 'SiPrima';
  if (subtitle) {
    const sub = document.createElement('small');
    sub.textContent = subtitle;
    heading.append(sub);
  }
  const user = document.createElement('div');
  user.className = 'topbar-user';
  const roleLabel = document.createElement('span');
  roleLabel.textContent = session.profile.nama || session.user.email;
  user.append(roleLabel);
  topbar.append(toggle, heading, user);

  const container = document.createElement('main');
  container.className = 'page-container';
  container.id = 'main-content';
  container.tabIndex = -1;
  const adjacent = shell.nextElementSibling?.tagName === 'MAIN' ? shell.nextElementSibling : null;
  const existing = shell.querySelector('main') || adjacent;
  if (existing) {
    container.append(...existing.childNodes);
    existing.remove();
  } else if (shell.childNodes.length) {
    container.append(...shell.childNodes);
  }

  main.append(topbar, container);
  shell.replaceChildren(skip, sidebar, scrim, main);

  const closeNav = () => {
    sidebar.classList.remove('open');
    scrim.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', open);
    scrim.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) sidebar.querySelector('a')?.focus();
  });
  scrim.addEventListener('click', closeNav);
  sidebar.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeNav(); });
};

export const showToast = (message, kind = 'success') => {
  let region = document.querySelector('#toast-region');
  if (!region) {
    region = document.createElement('div');
    region.id = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }
  const toast = document.createElement('div');
  toast.className = `toast${kind === 'error' ? ' error' : ''}`;
  toast.textContent = message;
  region.append(toast);
  setTimeout(() => toast.remove(), 3200);
};

/** Klik baris tabel membuka detail tanpa kehilangan posisi gulir. */
export const attachRowNavigation = (tbody, onOpen) => {
  tbody.addEventListener('click', (event) => {
    if (event.target.closest('button, a, input, select, textarea')) return;
    const row = event.target.closest('tr[data-id]');
    if (row) onOpen(row.dataset.id, row);
  });
  tbody.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('tr[data-id]');
    if (!row) return;
    event.preventDefault();
    onOpen(row.dataset.id, row);
  });
};

export const copyToClipboard = async (text, onDone) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Nomor surat disalin.');
    onDone?.(true);
  } catch {
    showToast('Nomor gagal disalin. Salin manual dari kolom nomor.', 'error');
    onDone?.(false);
  }
};

export const skeletonRows = (count = 4, columns = 1) => {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < count; index += 1) {
    const row = document.createElement('div');
    row.className = 'skeleton row';
    row.style.width = `${40 + ((index * 17) % 45)}%`;
    row.dataset.columns = String(columns);
    fragment.append(row);
  }
  return fragment;
};

const loadInboxBadge = async (session, target) => {
  try {
    const snap = await getDocs(query(collection(db, 'suratMasuk'), where('aksesBidang', 'array-contains', session.profile.bidang), limit(100)));
    const count = snap.docs.reduce((total, item) => {
      const data = item.data();
      return total + (data.tindakLanjut?.[session.profile.bidang]?.status === 'Sudah' ? 0 : 1);
    }, 0);
    target.textContent = count > 99 ? '99+' : String(count);
    target.setAttribute('aria-label', `${count} surat belum ditindaklanjuti`);
    target.hidden = count === 0;
  } catch {
    target.hidden = true;
  }
};
