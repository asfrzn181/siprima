import { AKSI_AUDIT, PAGINATION, PERAN, SIFAT, STATUS_MASUK } from '../constants/index.js';
import { catatAudit } from '../repositories/audit.repository.js';
import {
  buatSuratMasuk,
  cariSuratMasuk,
  daftarSuratMasuk,
  simpanDisposisi,
  simpanTindakLanjut,
  ubahSuratMasuk,
  setBerkasSuratMasuk
} from '../repositories/suratMasuk.repository.js';
import { AppError, galatAkses, galatTidakDitemukan } from '../utils/AppError.js';
import {
  adalahAdmin,
  adalahBidang,
  adalahOperator,
  adalahPengelola,
  bolehAksesDaftarBidang,
  bolehBacaSurat,
  bolehBuatSuratMasuk,
  bolehTindakLanjut,
  bolehUbahSuratMasuk,
  lingkupData
} from '../utils/akses.js';
import { potongHalaman } from '../utils/pagination.js';
import { serialisasi } from '../utils/serialisasi.js';
import { tanggalInput } from '../utils/tanggal.js';

const modeUntuk = (profil, sifat) => {
  if (profil.role !== PERAN.BIDANG) return sifat === 'semua' ? ['semua'] : [sifat];
  if (sifat === SIFAT.BIASA || sifat === SIFAT.RAHASIA) return [sifat];
  return [SIFAT.BIASA, SIFAT.RAHASIA];
};

const whereMode = (profil, mode, filter = {}) => {
  const daftar = [];
  const lingkup = lingkupData(profil);
  if (filter.status && filter.status !== 'semua') daftar.push(['status', '==', filter.status]);
  if (mode === SIFAT.BIASA) daftar.push(['sifat', '==', SIFAT.BIASA]);
  if (mode === SIFAT.RAHASIA) {
    daftar.push(['sifat', '==', SIFAT.RAHASIA]);
    if (adalahBidang(profil) && profil.bidang) {
      daftar.push(['aksesBidang', 'array-contains', profil.bidang]);
    }
  }
  if (!lingkup.semua) {
    if (!lingkup.bidang) return [['status', '==', '__TANPA_BIDANG__']];
    if (mode !== SIFAT.RAHASIA) {
      daftar.push(['aksesBidang', 'array-contains', lingkup.bidang]);
    }
  } else if (filter.bidang && filter.bidang !== 'semua') {
    daftar.push(['aksesBidang', 'array-contains', filter.bidang]);
  }
  if (filter.tglMulai) daftar.push(['tglTerima', '>=', filter.tglMulai]);
  if (filter.tglSelesai) daftar.push(['tglTerima', '<=', filter.tglSelesai]);
  return daftar;
};

const urutkan = (items, field) =>
  items.sort((a, b) => {
    const nilaiA = a[field];
    const nilaiB = b[field];
    // Tanggal dokumen berupa string YYYY-MM-DD; timestamp tetap Date.
    if (typeof nilaiA === 'string' && typeof nilaiB === 'string') {
      return nilaiB.localeCompare(nilaiA);
    }
    const waktu = (nilai) => {
      if (nilai instanceof Date) return nilai.getTime();
      const hasil = Date.parse(nilai);
      return Number.isNaN(hasil) ? 0 : hasil;
    };
    return waktu(nilaiB) - waktu(nilaiA);
  });

const cariPrefix = async (profil, filter) => {
  const kunci = filter.search;
  const medan = ['noSurat', 'hal', 'asal', 'tujuan'];
  const hasil = [];
  for (const medanCari of medan) {
    for (const mode of modeUntuk(profil, filter.sifat)) {
      const where = [
        ...whereMode(profil, mode, { status: filter.status, bidang: filter.bidang }),
        [medanCari, '>=', kunci],
        [medanCari, '<=', `${kunci}\uf8ff`]
      ];
      try {
        const potongan = await daftarSuratMasuk({
          where,
          field: medanCari,
          arah: 'asc',
          limit: 100
        });
        hasil.push(...potongan);
      } catch {
        // Abaikan medan yang belum memiliki indeks komposit; medan lain tetap dicari.
      }
    }
  }
  const unik = new Map(hasil.map((item) => [item.id, item]));
  return urutkan([...unik.values()], 'dibuatPada');
};

export const daftarMasuk = async (profil, filter) => {
  const punyaTanggal = Boolean(filter.tglMulai || filter.tglSelesai);
  let semua;
  if (filter.search) {
    semua = await cariPrefix(profil, filter);
  } else {
    const hasil = await Promise.all(
      modeUntuk(profil, filter.sifat).map((mode) =>
        daftarSuratMasuk({
          where: whereMode(profil, mode, filter),
          field: punyaTanggal ? 'tglTerima' : 'dibuatPada',
          limit: PAGINATION.MAX_SCAN
        })
      )
    );
    const unik = new Map(hasil.flat().map((item) => [item.id, item]));
    semua = urutkan([...unik.values()], punyaTanggal ? 'tglTerima' : 'dibuatPada');
  }
  const { items, pagination } = potongHalaman(semua, { page: filter.page, limit: filter.limit });
  return { items: items.map((item) => serialisasi(item)), pagination };
};

export const ambilMasuk = async (id, profil) => {
  const surat = await cariSuratMasuk(id);
  if (
    !surat ||
    !bolehBacaSurat(profil, surat) ||
    !bolehAksesDaftarBidang(profil, surat.aksesBidang)
  ) {
    throw galatTidakDitemukan('Surat tidak ditemukan atau Anda tidak berhak membacanya.');
  }
  return serialisasi(surat);
};

export const tambahMasuk = async (payload, profil) => {
  if (!bolehBuatSuratMasuk(profil)) throw galatAkses('Anda tidak berhak menambah surat masuk.');
  if (payload.sifat === SIFAT.RAHASIA && payload.aksesBidang.length === 0) {
    throw new AppError(400, 'VALIDASI_GAGAL', 'Surat rahasia wajib memiliki minimal satu bidang akses.', [
      { field: 'aksesBidang', message: 'Pilih minimal satu bidang.' }
    ]);
  }
  const surat = await buatSuratMasuk(payload, {
    uid: profil.uid,
    nama: profil.nama || profil.email
  });
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: AKSI_AUDIT.TAMBAH_SURAT_MASUK,
    koleksi: 'suratMasuk',
    docId: surat.id,
    sesudah: surat
  });
  return serialisasi(surat);
};

export const ubahMasuk = async (id, payload, profil) => {
  if (!bolehUbahSuratMasuk(profil)) throw galatAkses();
  const lama = await cariSuratMasuk(id);
  if (!lama) throw galatTidakDitemukan('Surat masuk tidak ditemukan.');
  if (!bolehAksesDaftarBidang(profil, lama.aksesBidang)) {
    throw galatTidakDitemukan('Surat masuk tidak ditemukan.');
  }
  const perubahan = {
    tglTerima: payload.tglTerima,
    tglSurat: payload.tglSurat,
    noSurat: payload.noSurat,
    asal: payload.asal,
    tujuan: payload.tujuan || '',
    hal: payload.hal,
    isiRingkas: payload.isiRingkas,
    sifat: payload.sifat,
    aksesBidang: payload.aksesBidang,
    fileUrl: payload.fileUrl
  };
  await ubahSuratMasuk(id, perubahan);
  const sesudah = { ...lama, ...perubahan };
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: AKSI_AUDIT.UBAH_SURAT_MASUK,
    koleksi: 'suratMasuk',
    docId: id,
    sebelum: lama,
    sesudah
  });
  return serialisasi(sesudah);
};

export const disposisiMasuk = async (id, payload, profil) => {
  if (!adalahPengelola(profil)) throw galatAkses();
  const lama = await cariSuratMasuk(id);
  if (!lama) throw galatTidakDitemukan('Surat masuk tidak ditemukan.');
  const tindakLanjut = { ...(lama.tindakLanjut || {}) };
  payload.kepada.forEach((kode) => {
    if (!tindakLanjut[kode]) tindakLanjut[kode] = { status: 'Belum', tanggal: null, catatan: '' };
  });
  const perubahan = {
    aksesBidang: payload.kepada,
    disposisi: {
      kepada: payload.kepada,
      diputuskanOleh: payload.diputuskanOleh,
      dicatatOleh: { uid: profil.uid, nama: profil.nama || '' },
      tanggal: new Date(),
      catatan: payload.catatan || ''
    },
    tindakLanjut,
    status: STATUS_MASUK.DIDISPOSISIKAN
  };
  await simpanDisposisi(id, perubahan);
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: AKSI_AUDIT.DISPOSISI,
    koleksi: 'suratMasuk',
    docId: id,
    sebelum: lama,
    sesudah: { ...lama, ...perubahan }
  });
  return serialisasi({ ...lama, ...perubahan });
};

export const tindakLanjutMasuk = async (id, payload, profil) => {
  const lama = await cariSuratMasuk(id);
  if (!lama) throw galatTidakDitemukan('Surat masuk tidak ditemukan.');
  if (!bolehTindakLanjut(profil, lama)) {
    throw galatAkses('Surat ini tidak ditujukan ke bidang Anda.');
  }
  const tindakLanjut = {
    ...(lama.tindakLanjut || {}),
    [profil.bidang]: { status: 'Sudah', tanggal: new Date(), catatan: payload.catatan || '' }
  };
  const semua = Array.isArray(lama.aksesBidang) ? lama.aksesBidang : [];
  const selesai = semua.length > 0 && semua.every((kode) => tindakLanjut[kode]?.status === 'Sudah');
  const perubahan = {
    tindakLanjut,
    status: selesai ? STATUS_MASUK.SELESAI : STATUS_MASUK.DIDISPOSISIKAN
  };
  await simpanTindakLanjut(id, perubahan);
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: AKSI_AUDIT.TINDAK_LANJUT,
    koleksi: 'suratMasuk',
    docId: id,
    sebelum: lama,
    sesudah: { ...lama, ...perubahan }
  });
  return serialisasi({ ...lama, ...perubahan });
};

export const lampirkanScanMasuk = async (id, file, profil) => {
  if (!adalahAdmin(profil) && !adalahOperator(profil)) {
    throw galatAkses('Anda tidak berhak mengunggah scan surat masuk.');
  }
  const surat = await cariSuratMasuk(id);
  if (!surat) throw galatTidakDitemukan('Surat masuk tidak ditemukan.');
  await setBerkasSuratMasuk(id, { fileId: file.filename, fileUrl: '' });
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: 'unggah scan surat masuk',
    koleksi: 'suratMasuk',
    docId: id,
    sesudah: { fileId: file.filename }
  });
  return { id, fileId: file.filename };
};

export const berkasMasuk = async (id, profil) => {
  const surat = await cariSuratMasuk(id);
  if (
    !surat ||
    !bolehBacaSurat(profil, surat) ||
    !bolehAksesDaftarBidang(profil, surat.aksesBidang)
  ) {
    throw galatTidakDitemukan('Surat tidak ditemukan atau Anda tidak berhak membacanya.');
  }
  if (!surat.fileId && !surat.fileUrl) throw galatTidakDitemukan('Scan surat belum tersedia.');
  return {
    fileId: surat.fileId,
    fileUrl: surat.fileUrl || '',
    namaUnduhan: `scan-masuk-${surat.noAgenda || id}-${tanggalInput(surat.tglTerima)}`
  };
};

export const eksporMasuk = async (profil, filter) => {
  const hasil = await daftarMasuk(profil, { ...filter, page: 1, limit: PAGINATION.MAX_EXPORT });
  return hasil.items;
};
