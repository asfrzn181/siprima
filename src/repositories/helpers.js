const OPERATOR = Object.freeze({
  '==': '=',
  '!=': '<>',
  '>=': '>=',
  '<=': '<=',
  '>': '>',
  '<': '<'
});

// Menerjemahkan filter gaya Firestore [field, operator, nilai] menjadi SQL.
// `peta` memetakan nama field domain ke nama kolom, atau ke objek relasi
// { tabel, fk, kolom, induk } untuk operator array-contains.
export const terjemahWhere = (daftar = [], peta = {}) => {
  const bagian = [];
  const params = [];

  for (const [field, operator, nilai] of daftar) {
    const target = peta[field];
    if (!target) throw new Error(`Field filter tidak dikenal: ${field}`);

    if (operator === 'array-contains') {
      bagian.push(
        `EXISTS (SELECT 1 FROM ${target.tabel} rel WHERE rel.${target.fk} = ${target.induk} AND rel.${target.kolom} = ?)`
      );
      params.push(nilai);
      continue;
    }

    const simbol = OPERATOR[operator];
    if (!simbol) throw new Error(`Operator filter tidak dikenal: ${operator}`);
    bagian.push(`${target} ${simbol} ?`);
    params.push(nilai);
  }

  return {
    sql: bagian.length ? `WHERE ${bagian.join(' AND ')}` : '',
    params
  };
};

export const kolomUrut = (field, peta, bawaan) => {
  const kolom = peta[field] || peta[bawaan];
  if (!kolom) throw new Error(`Field urutan tidak dikenal: ${field}`);
  return kolom;
};

export const arahUrut = (arah) => (String(arah).toLowerCase() === 'asc' ? 'ASC' : 'DESC');

export const batasLimit = (limit, bawaan = 100) => {
  const angka = Number(limit);
  return Number.isFinite(angka) && angka > 0 ? Math.min(Math.floor(angka), 10000) : bawaan;
};

export const jsonAtauNull = (nilai) => (nilai === undefined ? null : JSON.stringify(nilai));

export const parseJson = (nilai, bawaan = null) => {
  if (nilai === null || nilai === undefined) return bawaan;
  if (typeof nilai === 'object') return nilai;
  try {
    return JSON.parse(nilai);
  } catch {
    return bawaan;
  }
};

export const daftarId = (rows) => rows.map((row) => row.id);
