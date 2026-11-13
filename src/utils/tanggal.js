const ZONA = 'Asia/Jakarta';

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

export const tanggalInput = (nilai) => {
  const bagian = bagianJakarta(nilai);
  return `${bagian.year}-${String(bagian.month).padStart(2, '0')}-${String(bagian.day).padStart(2, '0')}`;
};

export const validasiRentang = (mulai, selesai) => {
  if (!mulai || !selesai) return true;
  return mulai.getTime() <= selesai.getTime();
};
