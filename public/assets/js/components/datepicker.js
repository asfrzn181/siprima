import { BULAN_ID, formatTanggalPanjang, keIsoTanggal, pad2 } from '../utils/format.js';

// Datepicker Indonesia tanpa dependensi eksternal.
// Input asli (mis. <input type="date" name="tglSurat">) diubah menjadi hidden
// berisi nilai ISO, lalu ditambah kolom teks yang menampilkan "1 Maret 2026".
// Dengan begitu kode form yang membaca form.elements.<nama>.value tetap jalan.

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

let pop = null;
let kisi = null;
let keterangan = null;
let aktif = null;

const elemen = (tag, opsi = {}) => Object.assign(document.createElement(tag), opsi);

const hariIni = () => {
  const sekarang = new Date();
  return { tahun: sekarang.getFullYear(), bulan: sekarang.getMonth() + 1, tanggal: sekarang.getDate() };
};

const geser = (delta) => {
  if (!aktif) return;
  let bulan = aktif.bulan + delta;
  let tahun = aktif.tahun;
  if (bulan < 1) {
    bulan = 12;
    tahun -= 1;
  } else if (bulan > 12) {
    bulan = 1;
    tahun += 1;
  }
  aktif.bulan = bulan;
  aktif.tahun = tahun;
  gambar();
};

const posisi = () => {
  if (!aktif || !pop || pop.hidden) return;
  const kotak = aktif.tampil.getBoundingClientRect();
  const lebar = pop.offsetWidth || 280;
  const kiri = Math.min(Math.max(8, kotak.left), Math.max(8, window.innerWidth - lebar - 8));
  const bawah = kotak.bottom + 6;
  const tinggi = pop.offsetHeight || 300;
  const atas = bawah + tinggi > window.innerHeight - 8 ? Math.max(8, kotak.top - tinggi - 6) : bawah;
  pop.style.left = `${kiri}px`;
  pop.style.top = `${atas}px`;
};

const tutup = () => {
  if (pop) pop.hidden = true;
  aktif = null;
};

const pilih = (tanggal) => {
  if (!aktif) return;
  const iso = `${aktif.tahun}-${pad2(aktif.bulan)}-${pad2(tanggal)}`;
  aktif.tersembunyi.value = iso;
  aktif.tampil.value = formatTanggalPanjang(iso);
  aktif.tersembunyi.dispatchEvent(new Event('input', { bubbles: true }));
  aktif.tersembunyi.dispatchEvent(new Event('change', { bubbles: true }));
  tutup();
};

const gambar = () => {
  if (!aktif) return;
  keterangan.textContent = `${BULAN_ID[aktif.bulan - 1]} ${aktif.tahun}`;
  kisi.replaceChildren();
  HARI.forEach((nama) => kisi.append(elemen('span', { className: 'datepicker-dow', textContent: nama })));
  const hariPertama = new Date(aktif.tahun, aktif.bulan - 1, 1).getDay();
  const jumlahHari = new Date(aktif.tahun, aktif.bulan, 0).getDate();
  const ini = hariIni();
  const terpilih = keIsoTanggal(aktif.tersembunyi.value);
  for (let i = 0; i < hariPertama; i += 1) {
    kisi.append(elemen('span', { className: 'datepicker-kosong' }));
  }
  for (let tanggal = 1; tanggal <= jumlahHari; tanggal += 1) {
    const iso = `${aktif.tahun}-${pad2(aktif.bulan)}-${pad2(tanggal)}`;
    const tombol = elemen('button', {
      className: 'datepicker-day',
      type: 'button',
      textContent: String(tanggal)
    });
    if (iso === terpilih) tombol.classList.add('selected');
    if (ini.tanggal === tanggal && ini.bulan === aktif.bulan && ini.tahun === aktif.tahun) {
      tombol.classList.add('today');
    }
    tombol.addEventListener('click', () => pilih(tanggal));
    kisi.append(tombol);
  }
};

const buka = (status) => {
  aktif = status;
  const iso = keIsoTanggal(status.tersembunyi.value);
  if (iso) {
    const [tahun, bulan] = iso.split('-').map(Number);
    status.tahun = tahun;
    status.bulan = bulan;
  } else {
    const sekarang = hariIni();
    status.tahun = sekarang.tahun;
    status.bulan = sekarang.bulan;
  }
  pop.hidden = false;
  gambar();
  posisi();
};

const buatPop = () => {
  pop = elemen('div', { className: 'datepicker-pop' });
  pop.hidden = true;
  const kepala = elemen('div', { className: 'datepicker-head' });
  const mundur = elemen('button', { className: 'datepicker-nav', type: 'button', textContent: '‹' });
  const maju = elemen('button', { className: 'datepicker-nav', type: 'button', textContent: '›' });
  mundur.setAttribute('aria-label', 'Bulan sebelumnya');
  maju.setAttribute('aria-label', 'Bulan berikutnya');
  keterangan = elemen('span', { className: 'datepicker-caption' });
  kepala.append(mundur, keterangan, maju);
  kisi = elemen('div', { className: 'datepicker-grid' });
  pop.append(kepala, kisi);
  mundur.addEventListener('click', () => geser(-1));
  maju.addEventListener('click', () => geser(1));
  document.body.append(pop);
};

const segarkan = (input, tampil) => {
  tampil.value = formatTanggalPanjang(input.value);
};

const pasangSatu = (input) => {
  if (input.dataset.datepickerBound) return;
  input.dataset.datepickerBound = '1';

  const bungkus = elemen('span', { className: 'datepicker' });
  const tampil = elemen('input', { className: 'datepicker-field', type: 'text' });
  tampil.readOnly = true;
  tampil.placeholder = 'Pilih tanggal';
  tampil.value = formatTanggalPanjang(input.value);
  const labelTeks = input.closest('label')?.textContent?.trim() || 'Pilih tanggal';
  tampil.setAttribute('aria-label', labelTeks.split('\n')[0].slice(0, 80));
  const tombol = elemen('button', { className: 'datepicker-toggle', type: 'button', textContent: '▾' });
  tombol.setAttribute('aria-label', 'Buka kalender');

  input.type = 'hidden';
  input.before(bungkus);
  bungkus.append(input, tampil, tombol);

  const status = { tersembunyi: input, tampil };
  tombol.addEventListener('click', () => {
    if (pop && !pop.hidden && aktif?.tersembunyi === input) return tutup();
    return buka(status);
  });
  tampil.addEventListener('click', () => buka(status));

  const form = input.closest('form');
  if (form) {
    form.addEventListener('reset', () => {
      window.setTimeout(() => segarkan(input, tampil), 0);
    });
  }
};

export const pasangDatepicker = (scope = document) => {
  if (!pop) buatPop();
  scope.querySelectorAll('input[type="date"]').forEach(pasangSatu);
};

// Segarkan tampilan seluruh datepicker (dipakai setelah form diisi program).
export const sinkronDatepicker = (scope = document) => {
  scope.querySelectorAll('input[data-datepicker-bound]').forEach((input) => {
    const tampil = input.parentElement?.querySelector('.datepicker-field');
    if (tampil) segarkan(input, tampil);
  });
};

if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    if (!pop || pop.hidden || !aktif) return;
    if (pop.contains(event.target)) return;
    if (aktif.tampil === event.target) return;
    if (event.target.classList?.contains('datepicker-toggle')) return;
    tutup();
  });
  window.addEventListener('scroll', posisi, true);
  window.addEventListener('resize', posisi);
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !pop || pop.hidden) return;
      event.stopPropagation();
      tutup();
    },
    true
  );
}
