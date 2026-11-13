const adalahTimestamp = (nilai) =>
  nilai && typeof nilai.toDate === 'function' && typeof nilai.seconds === 'number';

export const serialisasi = (nilai) => {
  if (nilai === null || nilai === undefined) return nilai;
  if (adalahTimestamp(nilai)) return nilai.toDate().toISOString();
  if (nilai instanceof Date) return nilai.toISOString();
  if (Array.isArray(nilai)) return nilai.map(serialisasi);
  if (typeof nilai === 'object') {
    if (typeof nilai.toJSON === 'function') return serialisasi(nilai.toJSON());
    return Object.fromEntries(Object.entries(nilai).map(([kunci, isi]) => [kunci, serialisasi(isi)]));
  }
  return nilai;
};
