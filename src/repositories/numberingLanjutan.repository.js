import { Timestamp } from 'firebase-admin/firestore';
import { KOLEKSI, STATUS_NOMOR } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';
import { bagianJakarta, keTanggal } from '../utils/tanggal.js';
import { normalizeGolongan } from '../utils/nomor.js';
import { jalankanTransaksi, queryKoleksi, refDokumen, refKoleksi } from './base.repository.js';
import { bacaAuditHead, tulisAuditDalamTransaksi } from './numberingAudit.repository.js';

const dataAktor = (aktor = {}) => ({
  uid: aktor.uid || '',
  nama: aktor.nama || aktor.email || '',
  role: aktor.profile?.role || ''
});

export const voidNomor = async ({ letterNumberId, reason, aktor, replacedById = null, suratId = null }) => {
  const alasan = String(reason || '').trim() || 'Surat dibatalkan';
  return jalankanTransaksi(async (transaction) => {
    const letterRef = refDokumen(KOLEKSI.LETTER_NUMBERS, letterNumberId);
    const letterSnap = await transaction.get(letterRef);
    if (!letterSnap.exists) {
      throw new AppError(404, 'NOMOR_TIDAK_DITEMUKAN', 'Nomor surat tidak ditemukan.');
    }
    const before = letterSnap.data();
    if (![STATUS_NOMOR.RESERVED, STATUS_NOMOR.ISSUED].includes(before.status)) {
      throw new AppError(409, 'NOMOR_SUDAH_DIBATALKAN', 'Nomor sudah dibatalkan.');
    }
    const suratTertaut = suratId || before.letter_id;
    const suratSnap = suratTertaut
      ? await transaction.get(refDokumen(KOLEKSI.SURAT_KELUAR, suratTertaut))
      : null;
    const auditHead = await bacaAuditHead(transaction);
    const now = Timestamp.now();
    const pengganti = replacedById || before.replaced_by_id || null;
    const after = {
      ...before,
      status: STATUS_NOMOR.VOID,
      voided_at: now,
      voided_by: dataAktor(aktor),
      void_reason: alasan,
      replaced_by_id: pengganti,
      row_version: Number(before.row_version || 1) + 1
    };

    transaction.update(letterRef, {
      status: STATUS_NOMOR.VOID,
      voided_at: now,
      voided_by: dataAktor(aktor),
      void_reason: alasan,
      replaced_by_id: pengganti,
      row_version: after.row_version
    });
    if (suratTertaut && suratSnap?.exists) {
      transaction.update(refDokumen(KOLEKSI.SURAT_KELUAR, suratTertaut), {
        status: 'Dibatalkan',
        alasanBatal: alasan,
        letterRowVersion: after.row_version
      });
    }
    await tulisAuditDalamTransaksi(transaction, {
      letterId: letterNumberId,
      action: 'VOID',
      actor: aktor,
      before,
      after,
      previousHash: auditHead
    });
    return after;
  });
};

export const gunakanUlangNomor = async ({ letterNumberId, payload, aktor }) =>
  jalankanTransaksi(async (transaction) => {
    const letterRef = refDokumen(KOLEKSI.LETTER_NUMBERS, letterNumberId);
    const letterSnap = await transaction.get(letterRef);
    if (!letterSnap.exists) {
      throw new AppError(404, 'NOMOR_TIDAK_DITEMUKAN', 'Register nomor tidak ditemukan.');
    }
    const before = letterSnap.data();
    if (before.status !== STATUS_NOMOR.VOID) {
      throw new AppError(409, 'NOMOR_BUKAN_VOID', 'Hanya nomor VOID yang dapat digunakan kembali.');
    }
    const tanggal = keTanggal(payload.tglSurat);
    const tanggalLama = before.letter_date?.toDate ? before.letter_date.toDate() : null;
    const lama = tanggalLama ? bagianJakarta(tanggalLama) : null;
    const baru = bagianJakarta(tanggal);
    if (lama && (lama.year !== baru.year || lama.month !== baru.month || lama.day !== baru.day)) {
      throw new AppError(
        400,
        'TANGGAL_TIDAK_SAMA',
        'Tanggal penerbitan harus sama persis dengan tanggal nomor yang dibatalkan.'
      );
    }
    const suratRef = before.letter_id
      ? refDokumen(KOLEKSI.SURAT_KELUAR, before.letter_id)
      : refKoleksi(KOLEKSI.SURAT_KELUAR).doc();
    const suratSnap = before.letter_id ? await transaction.get(suratRef) : null;
    if (before.letter_id && !suratSnap.exists) {
      throw new AppError(409, 'SURAT_TIDAK_DITEMUKAN', 'Surat terkait nomor VOID tidak ditemukan.');
    }
    if (suratSnap?.exists && suratSnap.data().dikirimKeLuar === true) {
      throw new AppError(
        409,
        'SURAT_SUDAH_DIKIRIM',
        'Nomor tidak dapat digunakan kembali karena surat sudah dikirim ke pihak luar.'
      );
    }
    const auditHead = await bacaAuditHead(transaction);
    const now = Timestamp.now();
    const versiBaru = Number(before.row_version || 1) + 1;
    const after = {
      ...before,
      status: STATUS_NOMOR.ISSUED,
      letter_id: suratRef.id,
      letter_date: payload.tglSurat,
      perihal: payload.hal,
      tujuan: payload.tujuan,
      issued_at: now,
      reused_at: now,
      reused_by: dataAktor(aktor),
      reuse_count: Number(before.reuse_count || 0) + 1,
      reuse_reason: 'Nomor VOID digunakan kembali oleh admin pada tanggal yang sama',
      row_version: versiBaru
    };
    const suratData = {
      ...(suratSnap?.exists ? suratSnap.data() : {}),
      noSurat: before.full_number,
      jenisId: before.jenisId,
      golongan: normalizeGolongan(before.golongan),
      tglSurat: payload.tglSurat,
      tujuan: payload.tujuan,
      hal: payload.hal,
      isiRingkas: payload.isiRingkas,
      sifat: payload.sifat,
      tandaTangan: payload.tandaTangan || 'BASAH',
      fileId: suratSnap?.data()?.fileId || '',
      fileUrl: suratSnap?.data()?.fileUrl || String(payload.fileUrl || '').trim(),
      bidangPembuat: before.unit,
      dibuatOleh: suratSnap?.data()?.dibuatOleh || { uid: aktor.uid, nama: aktor.nama || '' },
      status: 'Aktif',
      alasanBatal: '',
      aksesBidang:
        payload.sifat === 'rahasia' ? [...new Set([...(payload.aksesBidang || []), before.unit])] : [],
      dikirimKeLuar: false,
      letterNumberId,
      letterRowVersion: versiBaru,
      dibuatPada: suratSnap?.data()?.dibuatPada || now,
      diubahPada: now
    };
    transaction.update(letterRef, {
      status: STATUS_NOMOR.ISSUED,
      letter_id: suratRef.id,
      letter_date: payload.tglSurat,
      perihal: payload.hal,
      tujuan: payload.tujuan,
      issued_at: now,
      reused_at: now,
      reused_by: dataAktor(aktor),
      reuse_count: after.reuse_count,
      reuse_reason: after.reuse_reason,
      row_version: versiBaru
    });
    if (suratSnap?.exists) {
      transaction.update(suratRef, suratData);
    } else {
      transaction.set(suratRef, suratData);
    }
    await tulisAuditDalamTransaksi(transaction, {
      letterId: letterNumberId,
      action: 'REUSE_VOID',
      actor: aktor,
      before,
      after,
      previousHash: auditHead
    });
    return { id: suratRef.id, ...suratData };
  });

export const perbaruiMetadataNomor = async ({
  letterNumberId,
  changes,
  aktor,
  expectedVersion,
  suratId = null
}) =>
  jalankanTransaksi(async (transaction) => {
    const ref = refDokumen(KOLEKSI.LETTER_NUMBERS, letterNumberId);
    const snap = await transaction.get(ref);
    if (!snap.exists) {
      throw new AppError(404, 'NOMOR_TIDAK_DITEMUKAN', 'Register nomor tidak ditemukan.');
    }
    const before = snap.data();
    if (Number(before.row_version || 1) !== Number(expectedVersion)) {
      throw new AppError(409, 'VERSI_BERUBAH', 'Data sudah berubah. Muat ulang sebelum menyimpan.');
    }
    const suratTertaut = suratId || before.letter_id;
    const suratRef = suratTertaut ? refDokumen(KOLEKSI.SURAT_KELUAR, suratTertaut) : null;
    const suratSnap = suratRef ? await transaction.get(suratRef) : null;
    const auditHead = await bacaAuditHead(transaction);
    const after = {
      ...before,
      perihal: changes.perihal ?? before.perihal,
      tujuan: changes.tujuan ?? before.tujuan,
      letter_date: changes.letter_date ?? before.letter_date,
      row_version: Number(before.row_version || 1) + 1
    };
    transaction.update(ref, {
      perihal: after.perihal,
      tujuan: after.tujuan,
      letter_date: after.letter_date,
      row_version: after.row_version
    });
    if (suratRef && suratSnap?.exists) {
      transaction.update(suratRef, {
        ...(changes.tujuan === null || changes.tujuan === undefined ? {} : { tujuan: changes.tujuan }),
        ...(changes.perihal === null || changes.perihal === undefined ? {} : { hal: changes.perihal }),
        ...(changes.letter_date === null || changes.letter_date === undefined
          ? {}
          : { tglSurat: changes.letter_date }),
        letterRowVersion: after.row_version
      });
    }
    await tulisAuditDalamTransaksi(transaction, {
      letterId: letterNumberId,
      action: 'EDIT_METADATA',
      actor: aktor,
      before,
      after,
      previousHash: auditHead
    });
    return after;
  });

export { voidNomor as voidLetterNumber, gunakanUlangNomor as reuseVoidedLetterNumber };

export const kedaluwarsakanReservasi = async (aktor) => {
  const snap = await queryKoleksi(KOLEKSI.LETTER_NUMBERS, {
    where: [
      ['status', '==', STATUS_NOMOR.RESERVED],
      ['reservation_expires_at', '<=', Timestamp.now()]
    ],
    orderBy: { field: 'reservation_expires_at', arah: 'asc' },
    limit: 100
  });
  const hasil = [];
  for (const item of snap) {
    hasil.push(
      await voidNomor({
        letterNumberId: item.id,
        reason: 'Reservasi kedaluwarsa otomatis',
        aktor
      })
    );
  }
  return hasil;
};
