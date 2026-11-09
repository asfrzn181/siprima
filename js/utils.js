export const pad2 = (value) => String(value).padStart(2, '0');
export const formatDate = (date) => { const d = date?.toDate ? date.toDate() : new Date(date); return Number.isNaN(d.getTime()) ? '—' : `${pad2(d.getDate())}-${pad2(d.getMonth()+1)}-${d.getFullYear()}`; };
export const bulanRomawi = (month) => ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][Number(month) - 1] || '';
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
export const exportRowsToExcel = async (rows, filename, sheetName = 'Data') => {
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
};
