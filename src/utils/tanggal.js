const ZONA = 'Asia/Jakarta';
const POLA_TANGGAL = /^(\d{4})-(\d{2})-(\d{2})$/;

const hariDalamBulan = (tahun, bulan) => {
  if (bulan === 2) {
    const kabisat = (tahun % 4 === 0 && tahun % 100 !== 0) || tahun % 400 === 0;
    return kabisat ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(bulan) ? 30 : 31;
};

// Tanggal dokumen diperlakukan sebagai string murni YYYY-MM-DD. Tidak ada
// konversi ke Date, toISOString(), atau zona waktu di jalur ini sehingga
// tanggal yang dipilih pengguna tersimpan dan tampil persis sama.
// Untuk kompatibilitas dengan klien lama yang mengirim stempel waktu lengkap,
// nilai tersebut diubah ke tanggal kalender Jakarta terlebih dahulu.
export const tanggalMurni = (nilai) => {
  if (nilai === null || nilai === undefined || nilai === '') return null;
  if (nilai instanceof Date) {
    return Number.isNaN(nilai.getTime()) ? null : tanggalInput(nilai);
  }
  const teks = String(nilai).trim();
  const iso = teks.slice(0, 10);
  if (!POLA_TANGGAL.test(iso)) return null;
  if (teks.length === 10) {
    const tahun = Number(iso.slice(0, 4));
    const bulan = Number(iso.slice(5, 7));
    const hari = Number(iso.slice(8, 10));
    if (bulan < 1 || bulan > 12 || hari < 1 || hari > hariDalamBulan(tahun, bulan)) return null;
    return iso;
  }
  const hasil = tanggalInput(teks);
  if (!POLA_TANGGAL.test(hasil)) return null;
  const tahun = Number(hasil.slice(0, 4));
  const bulan = Number(hasil.slice(5, 7));
  const hari = Number(hasil.slice(8, 10));
  if (bulan < 1 || bulan > 12 || hari < 1 || hari > hariDalamBulan(tahun, bulan)) return null;
  return hasil;
};

export const bagianTanggal = (nilai) => {
  const tanggal = tanggalMurni(nilai);
  if (!tanggal) return null;
  const [year, month, day] = tanggal.split('-').map(Number);
  return { year, month, day };
};

export const tahunTanggal = (nilai) => bagianTanggal(nilai)?.year ?? null;

// Perbandingan tanggal ISO (YYYY-MM-DD) aman dilakukan secara leksikografis.
// Batas yang kosong berarti tidak ada batas.
export const tanggalDalamRentang = (nilai, batasBawah, batasAtas) => {
  const tanggal = tanggalMurni(nilai);
  if (!tanggal) return false;
  const bawah = tanggalMurni(batasBawah);
  const atas = tanggalMurni(batasAtas);
  if (bawah && tanggal < bawah) return false;
  if (atas && tanggal > atas) return false;
  return true;
};

export const keTanggal = (nilai) => {
  if (nilai === null || nilai === undefined || nilai === '') return null;
  if (nilai instanceof Date) return Number.isNaN(nilai.getTime()) ? null : nilai;
  if (typeof nilai?.toDate === 'function') return nilai.toDate();
  const teks = String(nilai).trim();
  const lengkap = /^\d{4}-\d{2}-\d{2}$/.test(teks) ? `${teks}T00:00:00+07:00` : teks;
  const tanggal = new Date(lengkap);
  return Number.isNaN(tanggal.getTime()) ? null : tanggal;
};

export const mulaiHari = (nilai) => {
  const tanggal = keTanggal(nilai);
  if (!tanggal) return null;
  const hasil = new Date(tanggal);
  hasil.setHours(0, 0, 0, 0);
  return hasil;
};

export const akhirHari = (nilai) => {
  const tanggal = keTanggal(nilai);
  if (!tanggal) return null;
  const hasil = new Date(tanggal);
  hasil.setHours(23, 59, 59, 999);
  return hasil;
};

export const bagianJakarta = (nilai) => {
  const tanggal = keTanggal(nilai) || new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
    .formatToParts(tanggal)
    .reduce((hasil, part) => ({ ...hasil, [part.type]: part.value }), {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day)
  };
};

export const tahunJakarta = (nilai) => bagianJakarta(nilai).year;

export const keIso = (nilai) => {
  const tanggal = keTanggal(nilai);
  return tanggal ? tanggal.toISOString() : null;
};

// Untuk tanggal dokumen, nilai ISO dipertahankan apa adanya. Konversi Jakarta
// hanya dipakai untuk objek Date (mis. "hari ini") atau timestamp.
export const tanggalInput = (nilai) => {
  if (nilai === null || nilai === undefined || nilai === '') return '';
  if (typeof nilai === 'string') {
    const teks = nilai.trim();
    if (POLA_TANGGAL.test(teks)) return teks;
    if (POLA_TANGGAL.test(teks.slice(0, 10)) && teks.length > 10) {
      let kandidat = teks;
      if (!/[zZ]|[+-]\\d{2}:?\\d{2}$/.test(kandidat)) {
        kandidat = `${kandidat}+07:00`;
      }
      const bagian = bagianJakarta(kandidat);
      return `${bagian.year}-${String(bagian.month).padStart(2, '0')}-${String(bagian.day).padStart(2, '0')}`;
    }
  }
  const bagian = bagianJakarta(nilai);
  return `${bagian.year}-${String(bagian.month).padStart(2, '0')}-${String(bagian.day).padStart(2, '0')}`;
};

export const tanggalHariIniJakarta = () => tanggalInput(new Date());

export const validasiRentang = (mulai, selesai) => {
  if (!mulai || !selesai) return true;
  return mulai.getTime() <= selesai.getTime();
};
