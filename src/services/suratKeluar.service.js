import { AKSI_AUDIT, PAGINATION, PERAN, SIFAT, STATUS_KELUAR } from '../constants/index.js';
import { catatAudit } from '../repositories/audit.repository.js';
import {
  cariSuratKeluar,
  daftarSuratKeluar,
  tandaiDibatalkan,
  ubahSuratKeluar
} from '../repositories/suratKeluar.repository.js';
import { AppError, galatAkses, galatTidakDitemukan } from '../utils/AppError.js';
import {
  adalahAdmin,
  adalahBidang,
  adalahPengelola,
  bolehAksesBidang,
  bolehBacaSurat,
  bolehBuatSuratKeluar,
  bolehUbahSuratKeluar,
  lingkupData
} from '../utils/akses.js';
import { potongHalaman } from '../utils/pagination.js';
import { serialisasi } from '../utils/serialisasi.js';
import { tanggalInput } from '../utils/tanggal.js';
import {
  batalkanNomor,
  koreksi as koreksiNomor,
  pakaiUlang,
  perbaruiMetadata,
  terbitkanSuratKeluar
} from './numbering.service.js';

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
    daftar.push(['bidangPembuat', '==', lingkup.bidang]);
  } else if (filter.bidang && filter.bidang !== 'semua') {
    daftar.push(['bidangPembuat', '==', filter.bidang]);
  }
  if (filter.tglMulai) daftar.push(['tglSurat', '>=', filter.tglMulai]);
  if (filter.tglSelesai) daftar.push(['tglSurat', '<=', filter.tglSelesai]);
  return daftar;
};

const urutkan = (items) =>
  items.sort((a, b) => {
    const nilaiA = a.tglSurat?.toDate?.() ?? new Date(a.tglSurat || 0);
    const nilaiB = b.tglSurat?.toDate?.() ?? new Date(b.tglSurat || 0);
    return nilaiB.getTime() - nilaiA.getTime();
  });

const cariPrefix = async (profil, filter) => {
  const hasil = [];
  for (const medan of ['noSurat', 'hal', 'tujuan']) {
    for (const mode of modeUntuk(profil, filter.sifat)) {
      try {
        hasil.push(
          ...(await daftarSuratKeluar({
            where: [
              ...whereMode(profil, mode, { status: filter.status, bidang: filter.bidang }),
              [medan, '>=', filter.search],
              [medan, '<=', `${filter.search}\uf8ff`]
            ],
            field: medan,
            arah: 'asc',
            limit: 100
          }))
        );
      } catch {
        // Abaikan medan tanpa indeks komposit; medan lain tetap dicari.
      }
    }
  }
  const unik = new Map(hasil.map((item) => [item.id, item]));
  return urutkan([...unik.values()]);
};

export const daftarKeluar = async (profil, filter) => {
  let semua;
  if (filter.search) {
    semua = await cariPrefix(profil, filter);
  } else {
    const hasil = await Promise.all(
      modeUntuk(profil, filter.sifat).map((mode) =>
        daftarSuratKeluar({
          where: whereMode(profil, mode, filter),
          limit: PAGINATION.MAX_SCAN
        })
      )
    );
    const unik = new Map(hasil.flat().map((item) => [item.id, item]));
    semua = urutkan([...unik.values()]);
  }
  const { items, pagination } = potongHalaman(semua, { page: filter.page, limit: filter.limit });
  return { items: items.map((item) => serialisasi(item)), pagination };
};

export const ambilKeluar = async (id, profil) => {
  const surat = await cariSuratKeluar(id);
  if (!surat || !bolehBacaSurat(profil, surat) || !bolehAksesBidang(profil, surat.bidangPembuat)) {
    throw galatTidakDitemukan('Surat tidak ditemukan atau Anda tidak berhak membacanya.');
  }
  return serialisasi(surat);
};

const tentukanBidang = (payload, profil) => {
  if (profil.role === PERAN.BIDANG) {
    if (!profil.bidang) throw new AppError(400, 'BIDANG_KOSONG', 'Akun belum memiliki kode bidang.');
    return profil.bidang;
  }
  const kode = String(payload.bidangPembuat || profil.bidang || '').trim();
  if (!kode) throw new AppError(400, 'BIDANG_KOSONG', 'Bidang pembuat wajib dipilih.');
  return kode;
};

export const tambahKeluar = async (payload, profil) => {
  if (!bolehBuatSuratKeluar(profil)) throw galatAkses();
  const bidang = tentukanBidang(payload, profil);
  // Nomor final ditentukan di dalam transaksi Simpan, bukan dari pratinjau
  // atau nilai yang dikirim klien.
  const surat = await terbitkanSuratKeluar({
    jenisId: payload.jenisId,
    bidangKode: bidang,
    tanggal: payload.tglSurat,
    payload: { ...payload, bidangPembuat: bidang },
    profil
  });
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: AKSI_AUDIT.TAMBAH_SURAT_KELUAR,
    koleksi: 'suratKeluar',
    docId: surat.id,
    sesudah: surat
  });
  return serialisasi(surat);
};

export const ubahKeluar = async (id, perubahan, profil) => {
  const lama = await cariSuratKeluar(id);
  if (!lama) throw galatTidakDitemukan('Surat keluar tidak ditemukan.');
  if (!bolehUbahSuratKeluar(profil, lama)) {
    throw galatAkses('Anda tidak berhak mengubah surat ini.');
  }
  if (lama.status === STATUS_KELUAR.DIBATALKAN) {
    throw new AppError(409, 'SURAT_DIBATALKAN', 'Surat yang dibatalkan tidak dapat diubah.');
  }

  const bolehField = adalahAdmin(profil)
    ? perubahan
    : Object.fromEntries(
        Object.entries(perubahan).filter(([kunci]) =>
          ['tujuan', 'hal', 'isiRingkas', 'tglSurat', 'fileId', 'fileUrl'].includes(kunci)
        )
      );

  if (
    lama.letterNumberId &&
    ((bolehField.hal !== null && bolehField.hal !== undefined) ||
      (bolehField.tujuan !== null && bolehField.tujuan !== undefined) ||
      (bolehField.tglSurat !== null && bolehField.tglSurat !== undefined))
  ) {
    await perbaruiMetadata({
      surat: lama,
      changes: {
        ...(bolehField.hal === null || bolehField.hal === undefined ? {} : { perihal: bolehField.hal }),
        ...(bolehField.tujuan === null || bolehField.tujuan === undefined
          ? {}
          : { tujuan: bolehField.tujuan }),
        ...(bolehField.tglSurat === null || bolehField.tglSurat === undefined
          ? {}
          : { letter_date: bolehField.tglSurat })
      },
      profil
    });
  }

  const sisa = { ...bolehField };
  delete sisa.hal;
  delete sisa.tujuan;
  delete sisa.tglSurat;
  delete sisa.letterNumberId;
  if (Object.keys(sisa).length) await ubahSuratKeluar(id, sisa);

  const sesudah = { ...lama, ...bolehField };
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: AKSI_AUDIT.UBAH_SURAT_KELUAR,
    koleksi: 'suratKeluar',
    docId: id,
    sebelum: lama,
    sesudah
  });
  return serialisasi(sesudah);
};

export const batalkanKeluar = async (id, alasan, profil) => {
  if (!adalahPengelola(profil)) throw galatAkses('Pembatalan hanya untuk admin atau pimpinan.');
  const lama = await cariSuratKeluar(id);
  if (!lama) throw galatTidakDitemukan('Surat keluar tidak ditemukan.');
  if (lama.status === STATUS_KELUAR.DIBATALKAN) {
    throw new AppError(409, 'SURAT_DIBATALKAN', 'Surat sudah dibatalkan.');
  }
  if (lama.letterNumberId) {
    await batalkanNomor({ letterNumberId: lama.letterNumberId, alasan, profil, suratId: id });
  } else {
    await tandaiDibatalkan(id, alasan);
  }
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: AKSI_AUDIT.BATAL_SURAT_KELUAR,
    koleksi: 'suratKeluar',
    docId: id,
    sebelum: lama,
    sesudah: { ...lama, status: STATUS_KELUAR.DIBATALKAN, alasanBatal: alasan }
  });
  return { id, status: STATUS_KELUAR.DIBATALKAN };
};

export const koreksiKeluar = async ({ id, payload, reason, profil }) => {
  if (!adalahPengelola(profil)) throw galatAkses();
  const hasil = await koreksiNomor({ suratId: id, payload, reason, profil });
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: AKSI_AUDIT.KOREKSI_SURAT_KELUAR,
    koleksi: 'suratKeluar',
    docId: id,
    sesudah: hasil
  });
  return serialisasi(hasil);
};

export const pakaiUlangNomor = async ({ id, payload, profil }) => {
  const hasil = await pakaiUlang({ suratId: id, payload, profil });
  await catatAudit({
    uid: profil.uid,
    nama: profil.nama,
    aksi: 'gunakan ulang nomor surat keluar',
    koleksi: 'suratKeluar',
    docId: hasil.id,
    sesudah: hasil
  });
  return serialisasi(hasil);
};

export const berkasKeluar = async (id, profil) => {
  const surat = await cariSuratKeluar(id);
  if (
    !surat ||
    !bolehBacaSurat(profil, surat) ||
    !bolehAksesBidang(profil, surat.bidangPembuat)
  ) {
    throw galatTidakDitemukan('Surat tidak ditemukan atau Anda tidak berhak membacanya.');
  }
  if (!surat.fileId && !surat.fileUrl) throw galatTidakDitemukan('Scan surat belum tersedia.');
  return {
    fileId: surat.fileId,
    fileUrl: surat.fileUrl || '',
    namaUnduhan: `scan-keluar-${String(surat.noSurat || id).replace(/[^\w.-]+/g, '_')}-${tanggalInput(surat.tglSurat)}`
  };
};

export const eksporKeluar = async (profil, filter) => {
  const hasil = await daftarKeluar(profil, { ...filter, page: 1, limit: PAGINATION.MAX_EXPORT });
  return hasil.items;
};
