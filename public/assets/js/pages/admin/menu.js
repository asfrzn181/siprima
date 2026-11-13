import { daftarPeran } from '../../api/admin.api.js';
import { hapusMenu, semuaMenu, simpanMenu } from '../../api/menu.api.js';
import { badge, showToast } from '../../components/ui.js';
import { bukaModal, pesanBaris, selTeks, tutupModal } from './shared.js';

const body = document.querySelector('#menu-body');
const form = document.querySelector('#menu-form');
const error = document.querySelector('#menu-error');
const indukSelect = form.elements.parentId;
const izinSelect = form.elements.izin;

let daftar = [];

const ratakan = (nodes, level = 0, hasil = []) => {
  nodes.forEach((node) => {
    hasil.push({ ...node, level });
    if (node.children?.length) ratakan(node.children, level + 1, hasil);
  });
  return hasil;
};

const isiInduk = (kecualiId) => {
  indukSelect.replaceChildren(new Option('— Tanpa induk (menu utama) —', ''));
  daftar
    .filter((item) => String(item.id) !== String(kecualiId))
    .forEach((item) => indukSelect.append(new Option(`${'— '.repeat(item.level)}${item.label}`, item.id)));
};

const isiIzin = async () => {
  if (izinSelect.options.length > 1) return;
  try {
    const { izin } = await daftarPeran();
    izin.forEach((hak) => izinSelect.append(new Option(hak.label || hak.nama, hak.nama)));
  } catch {
    /* abaikan: daftar izin opsional */
  }
};

const buka = (item = null) => {
  error.hidden = true;
  form.reset();
  form.elements.id.value = item?.id || '';
  form.elements.label.value = item?.label || '';
  form.elements.kunci.value = item?.kunci || '';
  form.elements.href.value = item?.href || '';
  form.elements.urutan.value = item?.urutan ?? 0;
  form.elements.aktif.checked = item?.aktif !== false;
  isiInduk(item?.id);
  indukSelect.value = item?.parentId || '';
  izinSelect.value = item?.izin || '';
  document.querySelector('#menu-title').textContent = item ? 'Ubah menu' : 'Tambah menu';
  bukaModal('menu-modal');
};

export const muatMenu = async () => {
  pesanBaris(body, 8, 'Memuat…');
  try {
    daftar = ratakan(await semuaMenu());
    body.replaceChildren();
    if (!daftar.length) pesanBaris(body, 8, 'Belum ada menu.');
    const peta = new Map(daftar.map((item) => [String(item.id), item.label]));
    daftar.forEach((item) => {
      const baris = document.createElement('tr');

      const labelSel = document.createElement('td');
      labelSel.textContent = `${'— '.repeat(item.level)}${item.label}`;

      const status = document.createElement('td');
      status.append(badge(item.aktif ? 'Aktif' : 'Nonaktif', item.aktif ? 'success' : 'muted'));

      const aksi = document.createElement('td');
      const edit = document.createElement('button');
      edit.className = 'button small secondary';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => buka(item));
      const buang = document.createElement('button');
      buang.className = 'button small secondary';
      buang.type = 'button';
      buang.textContent = 'Hapus';
      buang.style.marginLeft = '0.4rem';
      buang.addEventListener('click', async () => {
        if (!confirm(`Hapus menu "${item.label}" beserta anaknya?`)) return;
        try {
          await hapusMenu(item.id);
          showToast('Menu dihapus.');
          await muatMenu();
        } catch (galat) {
          showToast(galat.message || 'Menu gagal dihapus.', 'error');
        }
      });
      aksi.append(edit, buang);

      baris.append(
        labelSel,
        selTeks(item.kunci),
        selTeks(item.parentId ? peta.get(String(item.parentId)) : '—'),
        selTeks(item.href),
        selTeks(item.izin || '—'),
        selTeks(String(item.urutan)),
        status,
        aksi
      );
      body.append(baris);
    });
  } catch (galat) {
    pesanBaris(body, 8, galat.message || 'Gagal memuat menu.');
  }
};

export const initMenu = async () => {
  document.querySelector('#new-menu').addEventListener('click', () => buka());
  await isiIzin();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    const id = form.elements.id.value;
    const data = {
      kunci: form.elements.kunci.value.trim(),
      label: form.elements.label.value.trim(),
      parentId: indukSelect.value ? Number(indukSelect.value) : null,
      href: form.elements.href.value.trim(),
      izin: izinSelect.value || null,
      urutan: Number(form.elements.urutan.value) || 0,
      aktif: form.elements.aktif.checked
    };
    if (!data.kunci || !data.label) {
      error.textContent = 'Label dan kunci wajib diisi.';
      error.hidden = false;
      return;
    }
    try {
      await simpanMenu(id || null, data);
      tutupModal('menu-modal');
      await muatMenu();
      showToast('Menu tersimpan.');
    } catch (galat) {
      error.textContent = galat.message || 'Menu gagal disimpan.';
      error.hidden = false;
    }
  });

  await muatMenu();
};
