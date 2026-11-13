export const tanggalQuery = (nilai, akhir = false) => {
  const teks = String(nilai || '').trim();
  if (!teks) return '';
  if (teks.includes('T')) return teks;
  return `${teks}T${akhir ? '23:59:59' : '00:00:00'}+07:00`;
};

export const bangunQuery = (objek = {}) => {
  const params = new URLSearchParams();
  Object.entries(objek).forEach(([kunci, nilai]) => {
    if (nilai === null || nilai === undefined || nilai === '') return;
    params.set(kunci, String(nilai));
  });
  const teks = params.toString();
  return teks ? `?${teks}` : '';
};
