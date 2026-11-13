import { KOLEKSI, PERAN, STATUS_MASUK } from '../constants/index.js';
import { hitungKoleksi, queryKoleksi } from '../repositories/base.repository.js';
import { serialisasi } from '../utils/serialisasi.js';
import { bagianJakarta, keTanggal } from '../utils/tanggal.js';

const scopeMasuk = (profil) =>
  profil.role === PERAN.BIDANG ? [['aksesBidang', 'array-contains', profil.bidang]] : [];

const scopeKeluar = (profil) =>
  profil.role === PERAN.BIDANG ? [['bidangPembuat', '==', profil.bidang]] : [];

const awalHari = (sekarang) => {
  const bagian = bagianJakarta(sekarang);
  return keTanggal(
    `${bagian.year}-${String(bagian.month).padStart(2, '0')}-${String(bagian.day).padStart(2, '0')}`
  );
};

const awalBulan = (sekarang) => {
  const bagian = bagianJakarta(sekarang);
  return keTanggal(`${bagian.year}-${String(bagian.month).padStart(2, '0')}-01`);
};

export const ringkasanDashboard = async (profil) => {
  const sekarang = new Date();
  const hariIni = awalHari(sekarang);
  const bulanIni = awalBulan(sekarang);
  const masuk = scopeMasuk(profil);
  const keluar = scopeKeluar(profil);

  const [masukHariIni, masukBulan, belumDiproses, keluarHariIni, keluarBulan, masukTerbaru, keluarTerbaru] =
    await Promise.all([
      hitungKoleksi(KOLEKSI.SURAT_MASUK, [...masuk, ['tglTerima', '>=', hariIni]]),
      hitungKoleksi(KOLEKSI.SURAT_MASUK, [...masuk, ['tglTerima', '>=', bulanIni]]),
      hitungKoleksi(KOLEKSI.SURAT_MASUK, [...masuk, ['status', '==', STATUS_MASUK.BARU]]),
      hitungKoleksi(KOLEKSI.SURAT_KELUAR, [...keluar, ['tglSurat', '>=', hariIni]]),
      hitungKoleksi(KOLEKSI.SURAT_KELUAR, [...keluar, ['tglSurat', '>=', bulanIni]]),
      queryKoleksi(KOLEKSI.SURAT_MASUK, {
        where: masuk,
        orderBy: { field: 'dibuatPada', arah: 'desc' },
        limit: 10
      }),
      queryKoleksi(KOLEKSI.SURAT_KELUAR, {
        where: keluar,
        orderBy: { field: 'tglSurat', arah: 'desc' },
        limit: 10
      })
    ]);

  return {
    masukHariIni,
    masukBulan,
    belumDiproses,
    keluarHariIni,
    keluarBulan,
    suratMasukTerbaru: masukTerbaru.map(serialisasi),
    suratKeluarTerbaru: keluarTerbaru.map(serialisasi)
  };
};
