let pemuatan = null;

const muatXlsx = () => {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (pemuatan) return pemuatan;
  pemuatan = new Promise((resolve, reject) => {
    const skrip = document.createElement('script');
    skrip.src = 'assets/vendor/xlsx.full.min.js';
    skrip.onload = () => resolve(window.XLSX);
    skrip.onerror = () => reject(new Error('Pustaka Excel gagal dimuat.'));
    document.head.append(skrip);
  });
  return pemuatan;
};

export const eksporExcel = async (rows, namaBerkas, namaSheet = 'Data') => {
  if (!rows.length) throw new Error('Tidak ada data untuk diekspor.');
  const XLSX = await muatXlsx();
  const lembar = XLSX.utils.json_to_sheet(rows);
  const buku = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(buku, lembar, namaSheet);
  XLSX.writeFile(buku, namaBerkas);
};
