import { logout, navUntuk } from '../api/client.js';
import { pasangPilihanBerkas } from './berkas.js';
import { pasangDatepicker } from './datepicker.js';

export const badge = (label, kind = 'muted') => {
  const node = document.createElement('span');
  node.className = `badge ${kind}`;
  node.textContent = label;
  return node;
};

const LEWATI_WAJIB = ['hidden', 'checkbox', 'radio', 'submit', 'button', 'reset', 'file'];

// Tambahkan penanda bintang merah untuk setiap field yang wajib diisi.
export const tandaiWajib = (scope = document) => {
  scope.querySelectorAll('input[required], select[required], textarea[required]').forEach((field) => {
    const tipe = (field.getAttribute('type') || field.tagName.toLowerCase()).toLowerCase();
    if (LEWATI_WAJIB.includes(tipe)) return;
    const label = field.closest('label');
    if (!label || label.querySelector('.req')) return;
    const bintang = document.createElement('span');
    bintang.className = 'req';
    bintang.setAttribute('aria-hidden', 'true');
    bintang.textContent = '*';
    field.before(bintang);
  });
};

const berkasSekarang = () => window.location.pathname.split('/').pop() || 'index.html';

const nodeAktif = (node) => {
  if (!node?.href) return false;
  const url = new URL(node.href, document.baseURI);
  const ini = new URL(window.location.href);
  if (url.pathname !== ini.pathname) return false;
  const jenisNode = url.searchParams.get('jenis');
  if (jenisNode && jenisNode !== ini.searchParams.get('jenis')) return false;
  const hashIni = ini.hash || (berkasSekarang() === 'admin.html' ? '#users' : '');
  if (url.hash && url.hash !== hashIni) return false;
  return true;
};

const adaAnakAktif = (node) =>
  nodeAktif(node) || (node.children || []).some((anak) => adaAnakAktif(anak));

const cariLabel = (nodes, active) => {
  for (const node of nodes) {
    if (nodeAktif(node) || node.kunci === active) return node.label;
    if (node.children?.length) {
      const dalam = cariLabel(node.children, active);
      if (dalam) return dalam;
    }
  }
  return '';
};

const buildSidebar = ({ nav, active, session }) => {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.setAttribute('aria-label', 'Navigasi utama');

  const brand = document.createElement('a');
  brand.className = 'sidebar-brand';
  brand.href = session.profile.role === 'bidang' ? './surat-keluar.html' : './dashboard.html';
  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = 'SP';
  const brandText = document.createElement('span');
  brandText.textContent = 'SiPrima';
  brand.append(mark, brandText);

  const links = document.createElement('nav');
  links.className = 'sidebar-nav';

  const buatTautan = (node) => {
    const tautan = document.createElement('a');
    tautan.className = 'nav-link';
    tautan.href = `./${node.href}`;
    tautan.textContent = node.label;
    if (nodeAktif(node) || node.kunci === active) tautan.setAttribute('aria-current', 'page');
    return tautan;
  };

  const buatGrup = (node) => {
    const grup = document.createElement('div');
    grup.className = 'nav-group';
    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = 'nav-group-toggle';
    const judul = document.createElement('span');
    judul.textContent = node.label;
    const caret = document.createElement('span');
    caret.className = 'nav-caret';
    caret.setAttribute('aria-hidden', 'true');
    caret.textContent = '▾';
    tombol.append(judul, caret);

    const submenu = document.createElement('div');
    submenu.className = 'nav-submenu';
    const aktifDiSini = (node.children || []).some((anak) => adaAnakAktif(anak));
    submenu.hidden = !aktifDiSini;
    tombol.setAttribute('aria-expanded', String(aktifDiSini));
    if (aktifDiSini) grup.classList.add('active');

    (node.children || []).forEach((anak) => {
      if (anak.children?.length) submenu.append(buatGrup(anak));
      else submenu.append(buatTautan(anak));
    });

    tombol.addEventListener('click', () => {
      const akanBuka = submenu.hidden;
      submenu.hidden = !akanBuka;
      tombol.setAttribute('aria-expanded', String(akanBuka));
    });

    grup.append(tombol, submenu);
    return grup;
  };

  nav.forEach((node) => {
    if (node.children?.length) links.append(buatGrup(node));
    else links.append(buatTautan(node));
  });

  const foot = document.createElement('div');
  foot.className = 'sidebar-foot';
  const nama = document.createElement('p');
  nama.className = 'muted nowrap';
  nama.style.margin = '0 0 8px';
  nama.textContent = session.profile.nama || session.user.email;
  const keluar = document.createElement('button');
  keluar.className = 'button secondary small';
  keluar.type = 'button';
  keluar.textContent = 'Keluar';
  keluar.addEventListener('click', async () => {
    keluar.disabled = true;
    keluar.textContent = 'Mengeluarkan…';
    try {
      await logout();
    } finally {
      window.location.href = './index.html';
    }
  });
  foot.append(nama, keluar);

  sidebar.append(brand, links, foot);
  return sidebar;
};

export const renderShell = ({ active, session, title, subtitle }) => {
  const shell = document.querySelector('#app-shell');
  if (!shell) return;

  const nav = navUntuk(session.profile);
  const current = cariLabel(nav, active);

  const skip = document.createElement('a');
  skip.className = 'skip-link';
  skip.href = '#main-content';
  skip.textContent = 'Lewati ke konten utama';

  const sidebar = buildSidebar({ nav, active, session });

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
  heading.textContent = title || current || 'SiPrima';
  if (subtitle) heading.append(Object.assign(document.createElement('small'), { textContent: subtitle }));
  const user = document.createElement('div');
  user.className = 'topbar-user';
  user.textContent = session.profile.nama || session.user.email;
  topbar.append(toggle, heading, user);

  const container = document.createElement('main');
  container.className = 'page-container';
  container.id = 'main-content';
  container.tabIndex = -1;
  const kandidat = shell.nextElementSibling?.tagName === 'MAIN' ? shell.nextElementSibling : null;
  const existing = shell.querySelector('main') || kandidat;
  if (existing) {
    container.append(...existing.childNodes);
    existing.remove();
  } else if (shell.childNodes.length) {
    container.append(...shell.childNodes);
  }

  main.append(topbar, container);
  shell.replaceChildren(skip, sidebar, scrim, main);

  tandaiWajib(document);
  pasangDatepicker(document);
  pasangPilihanBerkas(document);

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
  sidebar.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNav();
  });
};

export const dialogInput = ({
  judul = 'Konfirmasi',
  deskripsi = '',
  nomor = '',
  label = 'Keterangan',
  placeholder = '',
  teksKonfirmasi = 'Simpan',
  teksBatal = 'Kembali',
  pesanWajib = 'Keterangan wajib diisi.'
} = {}) =>
  new Promise((selesai) => {
    const overlay = document.createElement('section');
    overlay.className = 'dialog-overlay';

    const kartu = document.createElement('div');
    kartu.className = 'dialog-card';
    kartu.setAttribute('role', 'dialog');
    kartu.setAttribute('aria-modal', 'true');

    const judulNode = document.createElement('h2');
    judulNode.className = 'dialog-title';
    judulNode.textContent = judul;

    const isi = [judulNode];
    if (nomor) {
      const nomorNode = document.createElement('p');
      nomorNode.className = 'dialog-number';
      nomorNode.textContent = nomor;
      isi.push(nomorNode);
    }
    if (deskripsi) {
      const ket = document.createElement('p');
      ket.className = 'muted dialog-desc';
      ket.textContent = deskripsi;
      isi.push(ket);
    }

    const labelNode = document.createElement('label');
    labelNode.className = 'dialog-field';
    labelNode.append(
      Object.assign(document.createElement('span'), { textContent: label }),
      Object.assign(document.createElement('textarea'), {
        name: 'keterangan',
        rows: 3,
        maxLength: 300,
        placeholder
      })
    );
    const area = labelNode.querySelector('textarea');
    isi.push(labelNode);

    const galat = document.createElement('p');
    galat.className = 'form-error';
    galat.setAttribute('role', 'alert');
    galat.hidden = true;
    isi.push(galat);

    const aksi = document.createElement('div');
    aksi.className = 'dialog-actions';
    const batal = document.createElement('button');
    batal.type = 'button';
    batal.className = 'button secondary';
    batal.textContent = teksBatal;
    const konfirmasi = document.createElement('button');
    konfirmasi.type = 'button';
    konfirmasi.className = 'button primary';
    konfirmasi.textContent = teksKonfirmasi;
    aksi.append(batal, konfirmasi);
    isi.push(aksi);

    kartu.append(...isi);
    overlay.append(kartu);
    document.body.append(overlay);

    const sebelumnya = document.activeElement;
    const tutup = (nilai) => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      if (sebelumnya?.focus) sebelumnya.focus();
      selesai(nilai);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        tutup(null);
      }
    };
    const cobaKonfirmasi = () => {
      const nilai = area.value.trim();
      if (!nilai) {
        galat.textContent = pesanWajib;
        galat.hidden = false;
        area.focus();
        return;
      }
      tutup(nilai);
    };

    batal.addEventListener('click', () => tutup(null));
    konfirmasi.addEventListener('click', cobaKonfirmasi);
    area.addEventListener('input', () => {
      if (!galat.hidden) galat.hidden = true;
    });
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) tutup(null);
    });
    document.addEventListener('keydown', onKey);
    area.focus();
  });

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

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Nomor surat disalin.');
  } catch {
    showToast('Nomor gagal disalin. Salin manual dari kolom nomor.', 'error');
  }
};

export const skeletonRows = (count = 4) => {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < count; index += 1) {
    const row = document.createElement('div');
    row.className = 'skeleton row';
    row.style.width = `${40 + ((index * 17) % 45)}%`;
    fragment.append(row);
  }
  return fragment;
};
