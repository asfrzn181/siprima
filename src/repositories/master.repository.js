import { KOLEKSI } from '../constants/index.js';
import { ambilDokumen, commitBatch, queryKoleksi, refDokumen, simpanDokumen } from './base.repository.js';

export const daftarBidang = ({ hanyaAktif = false } = {}) =>
  queryKoleksi(KOLEKSI.MASTER_BIDANG, {
    where: hanyaAktif ? [['aktif', '==', true]] : [],
    orderBy: { field: 'nama', arah: 'asc' }
  });

export const cariBidangByKode = async (kode) => {
  const hasil = await queryKoleksi(KOLEKSI.MASTER_BIDANG, {
    where: [['kode', '==', String(kode || '').trim()]],
    limit: 1
  });
  return hasil[0] || null;
};

export const simpanBidang = (id, data) => simpanDokumen(KOLEKSI.MASTER_BIDANG, id, data, { merge: true });

export const daftarNomor = () =>
  queryKoleksi(KOLEKSI.MASTER_NOMOR, { orderBy: { field: 'nama', arah: 'asc' } });

export const cariNomor = (id) => ambilDokumen(KOLEKSI.MASTER_NOMOR, id);

export const cariNomorByKodeAtauNama = async (kataKunci, maksimal = 5) => {
  const kunci = String(kataKunci || '').trim();
  if (kunci.length < 3) return [];
  const variasiNama = [
    ...new Set([
      kunci,
      kunci.toUpperCase(),
      `${kunci.charAt(0).toUpperCase()}${kunci.slice(1).toLowerCase()}`
    ])
  ];
  const [berdasarkanKode, ...berdasarkanNama] = await Promise.all([
    queryKoleksi(KOLEKSI.MASTER_NOMOR, {
      where: [
        ['kode', '>=', kunci],
        ['kode', '<=', `${kunci}\uf8ff`]
      ],
      orderBy: { field: 'kode', arah: 'asc' },
      limit: maksimal
    }),
    ...variasiNama.map((nama) =>
      queryKoleksi(KOLEKSI.MASTER_NOMOR, {
        where: [
          ['nama', '>=', nama],
          ['nama', '<=', `${nama}\uf8ff`]
        ],
        orderBy: { field: 'nama', arah: 'asc' },
        limit: maksimal
      })
    )
  ]);
  const unik = new Map([berdasarkanKode, ...berdasarkanNama].flat().map((item) => [item.id, item]));
  return [...unik.values()]
    .filter((item) => item.aktif !== false && item.kode && item.nama)
    .sort((a, b) => `${a.kode} ${a.nama}`.localeCompare(`${b.kode} ${b.nama}`, 'id', { numeric: true }))
    .slice(0, maksimal);
};

export const simpanNomor = (id, data) => simpanDokumen(KOLEKSI.MASTER_NOMOR, id, data, { merge: false });

export const simpanNomorBatch = async (baris) => {
  const ukuran = 400;
  for (let mulai = 0; mulai < baris.length; mulai += ukuran) {
    const potongan = baris.slice(mulai, mulai + ukuran);
    await commitBatch((batch) => {
      potongan.forEach(({ id, data }) => {
        batch.set(refDokumen(KOLEKSI.MASTER_NOMOR, id), data);
      });
    });
  }
  return baris.length;
};

export const hapusNomor = (id) => refDokumen(KOLEKSI.MASTER_NOMOR, id).delete();
