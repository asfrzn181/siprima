import { STATUS_MASUK } from '../constants/index.js';
import { daftarSuratMasuk, hitungSuratMasuk } from '../repositories/suratMasuk.repository.js';
import { daftarSuratKeluar, hitungSuratKeluar } from '../repositories/suratKeluar.repository.js';
import { lingkupData } from '../utils/akses.js';
import { serialisasi } from '../utils/serialisasi.js';
import { tanggalHariIniJakarta } from '../utils/tanggal.js';

const scopeMasuk = (profil) => {
  const lingkup = lingkupData(profil);
  if (lingkup.semua) return [];
  if (!lingkup.bidang) return [['status', '==', '__TANPA_BIDANG__']];
  return [['aksesBidang', 'array-contains', lingkup.bidang]];
};

const scopeKeluar = (profil) => {
  const lingkup = lingkupData(profil);
  if (lingkup.semua) return [];
  if (!lingkup.bidang) return [['status', '==', '__TANPA_BIDANG__']];
  return [['bidangPembuat', '==', lingkup.bidang]];
};

const awalHari = () => tanggalHariIniJakarta();

const awalBulan = () => `${tanggalHariIniJakarta().slice(0, 7)}-01`;

export const ringkasanDashboard = async (profil) => {
  const hariIni = awalHari();
  const bulanIni = awalBulan();
  const masuk = scopeMasuk(profil);
  const keluar = scopeKeluar(profil);

  const [masukHariIni, masukBulan, belumDiproses, keluarHariIni, keluarBulan, masukTerbaru, keluarTerbaru] =
    await Promise.all([
      hitungSuratMasuk([...masuk, ['tglTerima', '>=', hariIni]]),
      hitungSuratMasuk([...masuk, ['tglTerima', '>=', bulanIni]]),
      hitungSuratMasuk([...masuk, ['status', '==', STATUS_MASUK.BARU]]),
      hitungSuratKeluar([...keluar, ['tglSurat', '>=', hariIni]]),
      hitungSuratKeluar([...keluar, ['tglSurat', '>=', bulanIni]]),
      daftarSuratMasuk({ where: masuk, field: 'dibuatPada', arah: 'desc', limit: 10 }),
      daftarSuratKeluar({ where: keluar, field: 'tglSurat', arah: 'desc', limit: 10 })
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
