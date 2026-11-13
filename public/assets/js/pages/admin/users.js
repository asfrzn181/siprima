import { buatPengguna, daftarPengguna, ubahPengguna } from '../../api/admin.api.js';
import { daftarBidang } from '../../api/master.api.js';
import { badge, showToast } from '../../components/ui.js';
import { bukaModal, pesanBaris, renderPager, selTeks, tutupModal } from './shared.js';

const body = document.querySelector('#users-body');
const pager = document.querySelector('#users-pager');
const form = document.querySelector('#user-form');
const error = document.querySelector('#user-error');
const bidangSelect = form.elements.bidang;

let halaman = 1;

const isiBidang = (daftar, terpilih = '') => {
  bidangSelect.replaceChildren(new Option('Pilih bidang', ''));
  daftar
    .filter((item) => item.aktif !== false && item.kode)
    .forEach((item) => {
      const opsi = new Option(`${item.nama} (${item.kode})`, item.kode);
      opsi.selected = item.kode === terpilih;
      bidangSelect.append(opsi);
    });
};

const aturBidang = () => {
  const perlu = form.elements.role.value === 'bidang';
  bidangSelect.disabled = !perlu;
  if (!perlu) bidangSelect.value = '';
};

const buka = (item, daftarBidangAktif) => {
  error.hidden = true;
  form.reset();
  isiBidang(daftarBidangAktif, item?.bidang || '');
  document.querySelector('#user-modal-title').textContent = item ? 'Edit pengguna' : 'Tambah pengguna';
  form.elements.id.value = item?.id || '';
  form.elements.email.value = item?.email || '';
  form.elements.email.disabled = Boolean(item);
  form.elements.password.closest('label').hidden = Boolean(item);
  form.elements.password.required = !item;
  form.elements.password.value = '';
  form.elements.nama.value = item?.nama || '';
  form.elements.role.value = item?.role || 'bidang';
  form.elements.aktif.checked = item?.aktif !== false;
  aturBidang();
  bukaModal('user-modal');
};

export const muatPengguna = async (daftarBidangAktif) => {
  pesanBaris(body, 6, 'Memuat…');
  try {
    const hasil = await daftarPengguna(halaman);
    body.replaceChildren();
    if (!hasil.items.length) pesanBaris(body, 6, 'Belum ada pengguna.');
    hasil.items.forEach((item) => {
      const baris = document.createElement('tr');
      const status = document.createElement('td');
      status.append(badge(item.aktif ? 'Aktif' : 'Nonaktif', item.aktif ? 'success' : 'muted'));
      const aksi = document.createElement('td');
      const edit = document.createElement('button');
      edit.className = 'button small secondary';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => buka(item, daftarBidangAktif));
      aksi.append(edit);
      baris.append(
        selTeks(item.nama),
        selTeks(item.email),
        selTeks(item.role),
        selTeks(item.bidang),
        status,
        aksi
      );
      body.append(baris);
    });
    renderPager(pager, hasil.pagination, (halamanBaru) => {
      halaman = halamanBaru;
      muatPengguna(daftarBidangAktif);
    });
  } catch (galat) {
    pesanBaris(body, 6, galat.message || 'Gagal memuat pengguna.');
  }
};

export const initUsers = async () => {
  let daftar = [];
  try {
    daftar = await daftarBidang(true);
  } catch {
    daftar = [];
  }

  document.querySelector('#new-user').addEventListener('click', () => buka(null, daftar));
  form.elements.role.addEventListener('change', aturBidang);

  document.querySelector('#toggle-password').addEventListener('click', () => {
    const tampil = form.elements.password.type === 'text';
    form.elements.password.type = tampil ? 'password' : 'text';
    document.querySelector('#toggle-password').textContent = tampil ? 'Tampilkan' : 'Sembunyikan';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    const id = form.elements.id.value;
    const data = {
      nama: form.elements.nama.value.trim(),
      role: form.elements.role.value,
      bidang: form.elements.role.value === 'bidang' ? form.elements.bidang.value : '',
      aktif: form.elements.aktif.checked
    };
    if (data.role === 'bidang' && !data.bidang) {
      error.textContent = 'Kode bidang wajib diisi untuk peran bidang.';
      error.hidden = false;
      return;
    }
    try {
      if (id) {
        await ubahPengguna(id, data);
      } else {
        await buatPengguna({
          ...data,
          email: form.elements.email.value.trim(),
          password: form.elements.password.value
        });
      }
      tutupModal('user-modal');
      if (!id) halaman = 1;
      await muatPengguna(daftar);
      showToast(id ? 'Profil pengguna diperbarui.' : 'Akun pengguna dibuat.');
    } catch (galat) {
      error.textContent = galat.message || 'Pengguna gagal disimpan.';
      error.hidden = false;
    }
  });

  await muatPengguna(daftar);
};
