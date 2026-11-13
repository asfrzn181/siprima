import { daftarPeran, ubahIzinPeran } from '../../api/admin.api.js';
import { showToast } from '../../components/ui.js';

const body = document.querySelector('#peran-body');

const renderKartu = (peran, izin) => {
  const kartu = document.createElement('form');
  kartu.className = 'peran-card';
  kartu.dataset.nama = peran.nama;

  const judul = document.createElement('h3');
  judul.textContent = peran.label || peran.nama;
  const keterangan = document.createElement('p');
  keterangan.className = 'muted';
  keterangan.textContent = `Peran: ${peran.nama}`;

  const grid = document.createElement('div');
  grid.className = 'peran-izin';
  izin.forEach((hak) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'izin';
    input.value = hak.nama;
    input.checked = peran.izin.includes(hak.nama);
    label.append(
      input,
      Object.assign(document.createElement('span'), { textContent: hak.label || hak.nama })
    );
    grid.append(label);
  });

  const aksi = document.createElement('div');
  aksi.className = 'form-actions';
  const simpan = document.createElement('button');
  simpan.className = 'button primary';
  simpan.type = 'submit';
  simpan.textContent = 'Simpan hak akses';
  aksi.append(simpan);

  kartu.append(judul, keterangan, grid, aksi);

  kartu.addEventListener('submit', async (event) => {
    event.preventDefault();
    simpan.disabled = true;
    try {
      const terpilih = [...kartu.querySelectorAll('input[name="izin"]:checked')].map((input) => input.value);
      await ubahIzinPeran(peran.nama, terpilih);
      showToast(`Hak akses ${judul.textContent} disimpan.`);
    } catch (galat) {
      showToast(galat.message || 'Gagal menyimpan hak akses.', 'error');
    } finally {
      simpan.disabled = false;
    }
  });

  return kartu;
};

const muat = async () => {
  body.replaceChildren();
  const info = document.createElement('p');
  info.className = 'muted';
  info.textContent = 'Memuat…';
  body.append(info);
  try {
    const { peran, izin } = await daftarPeran();
    body.replaceChildren(...peran.map((item) => renderKartu(item, izin)));
  } catch (galat) {
    info.textContent = galat.message || 'Gagal memuat peran.';
    body.replaceChildren(info);
  }
};

export const initPeran = async () => {
  document.querySelector('#refresh-peran').addEventListener('click', muat);
  await muat();
};
