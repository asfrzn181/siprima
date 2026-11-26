import { api } from '../../api/client.js';
import { showToast } from '../../components/ui.js';

const bodyNomor = document.querySelector('#counter-nomor-body');
const bodyAgenda = document.querySelector('#counter-agenda-body');

const selKosong = (tbody, kolom, teks) => {
  const baris = document.createElement('tr');
  const sel = document.createElement('td');
  sel.colSpan = kolom;
  sel.className = 'muted';
  sel.style.textAlign = 'center';
  sel.textContent = teks;
  baris.append(sel);
  tbody.replaceChildren(baris);
};

const simpanNomor = async (tahun, scopeKey, input) => {
  const nilai = Number(input.value);
  if (!Number.isInteger(nilai) || nilai < 0) {
    showToast('Nomor urut tidak valid.', 'error');
    return;
  }
  try {
    await api.put('/nomor/counter', { jenis: 'nomor', tahun, scopeKey, lastSeq: nilai });
    showToast('Counter nomor diperbarui.');
    await muat();
  } catch (error) {
    showToast(error.message || 'Gagal memperbarui counter.', 'error');
  }
};

const simpanAgenda = async (tahun, input) => {
  const nilai = Number(input.value);
  if (!Number.isInteger(nilai) || nilai < 0) {
    showToast('Nomor urut tidak valid.', 'error');
    return;
  }
  try {
    await api.put('/nomor/counter', { jenis: 'agenda', tahun, lastSeq: nilai });
    showToast('Counter agenda diperbarui.');
    await muat();
  } catch (error) {
    showToast(error.message || 'Gagal memperbarui counter.', 'error');
  }
};

const muat = async () => {
  selKosong(bodyNomor, 5, 'Memuat counter nomor...');
  selKosong(bodyAgenda, 3, 'Memuat counter agenda...');
  try {
    const res = await api.get('/nomor/counter');
    const nomor = res?.data?.nomor || [];
    const agenda = res?.data?.agenda || [];

    const tahunSekarang = new Date().getFullYear();
    const jenisNomor = ['SURAT_KELUAR', 'SK', 'SE'];
    for (const jenis of jenisNomor) {
      if (!nomor.some((row) => Number(row.tahun) === tahunSekarang && row.scope_key === jenis)) {
        nomor.push({ tahun: tahunSekarang, scope_key: jenis, last_seq: 0, updated_at: '—' });
      }
    }
    if (!agenda.some((row) => row.name === `agendaMasuk_${tahunSekarang}`)) {
      agenda.push({ name: `agendaMasuk_${tahunSekarang}`, nilai: 0 });
    }

    bodyNomor.replaceChildren();
    nomor.forEach((row) => {
      const baris = document.createElement('tr');
      const tahun = document.createElement('td');
      tahun.textContent = row.tahun;
      const jenis = document.createElement('td');
      jenis.textContent = row.scope_key;
      const nilai = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.value = row.last_seq;
      input.style.width = '120px';
      nilai.append(input);
      const diperbarui = document.createElement('td');
      diperbarui.textContent = row.updated_at || '—';
      const aksi = document.createElement('td');
      const tombol = document.createElement('button');
      tombol.className = 'button small primary';
      tombol.type = 'button';
      tombol.textContent = 'Simpan';
      tombol.addEventListener('click', () => simpanNomor(row.tahun, row.scope_key, input));
      aksi.append(tombol);
      baris.append(tahun, jenis, nilai, diperbarui, aksi);
      bodyNomor.append(baris);
    });

    bodyAgenda.replaceChildren();
    agenda.forEach((row) => {
      const tahun = row.name.replace('agendaMasuk_', '');
      const baris = document.createElement('tr');
      const nama = document.createElement('td');
      nama.textContent = row.name;
      const nilai = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.value = row.nilai;
      input.style.width = '120px';
      nilai.append(input);
      const aksi = document.createElement('td');
      const tombol = document.createElement('button');
      tombol.className = 'button small primary';
      tombol.type = 'button';
      tombol.textContent = 'Simpan';
      tombol.addEventListener('click', () => simpanAgenda(tahun, input));
      aksi.append(tombol);
      baris.append(nama, nilai, aksi);
      bodyAgenda.append(baris);
    });
  } catch (error) {
    selKosong(bodyNomor, 5, error.message || 'Gagal memuat counter nomor.');
    selKosong(bodyAgenda, 3, error.message || 'Gagal memuat counter agenda.');
  }
};

export const initCounter = async () => {
  await muat();
};
