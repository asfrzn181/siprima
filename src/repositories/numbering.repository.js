import { Timestamp } from 'firebase-admin/firestore';
import { KOLEKSI, SCOPE_NOMOR, STATUS_NOMOR } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';
import { bagianJakarta, keTanggal } from '../utils/tanggal.js';
import {
  normalizeFormatGolongan,
  normalizeGolongan,
  monthRoman,
  renderNomor,
  scopeKeyFor
} from '../utils/nomor.js';
import { jalankanTransaksi, refDokumen, refKoleksi } from './base.repository.js';
import { cariBidangByKode } from './master.repository.js';
import { ambilPengaturan } from './settings.repository.js';
import { bacaAuditHead, tulisAuditDalamTransaksi } from './numberingAudit.repository.js';

const kunci = (nilai) => encodeURIComponent(String(nilai || ''));
const batasExpiry = (menit) => Timestamp.fromDate(new Date(Date.now() + menit * 60000));
const dataAktor = (aktor = {}) => ({
  uid: aktor.uid || '',
  nama: aktor.nama || aktor.email || '',
  role: aktor.profile?.role || ''
});

const ambilMaster = async (jenisId) => {
  const snap = await refDokumen(KOLEKSI.MASTER_NOMOR, jenisId).get();
  if (!snap.exists || snap.data().aktif !== true) {
    throw new AppError(400, 'MASTER_NOMOR_TIDAK_AKTIF', 'Jenis nomor surat tidak aktif.');
  }
  const mentah = snap.data();
  const golongan = normalizeGolongan(mentah.golongan);
  return {
    id: snap.id,
    ...mentah,
    golongan,
    format: normalizeFormatGolongan(mentah.format, golongan)
  };
};

const ambilBidang = async (kode) => {
  const bidang = await cariBidangByKode(String(kode || '').trim());
  if (!bidang || bidang.aktif !== true) {
    throw new AppError(
      400,
      'BIDANG_TIDAK_AKTIF',
      `Bidang dengan kode ${kode} belum terdaftar atau tidak aktif.`
    );
  }
  return bidang;
};

const ambilPengaturanNomor = async () => {
  const pengaturan = await ambilPengaturan();
  return {
    scope:
      pengaturan.numberingScope === SCOPE_NOMOR.PER_KLASIFIKASI
        ? SCOPE_NOMOR.PER_KLASIFIKASI
        : SCOPE_NOMOR.GLOBAL_PER_TAHUN,
    reservationMinutes: Math.max(1, Number(pengaturan.reservationMinutes || 15))
  };
};

const bangunNomor = ({ master, unit, seq, seqSuffix = null, date, scopeKey }) => {
  const bagian = bagianJakarta(date);
  const golongan = normalizeGolongan(master.golongan);
  return {
    seq: Number(seq),
    seq_suffix: seqSuffix === null || seqSuffix === undefined ? null : String(seqSuffix),
    klasifikasi: String(master.kode || ''),
    golongan,
    unit: String(unit),
    bulan: bagian.month,
    bulan_romawi: monthRoman(bagian.month),
    tahun: bagian.year,
    scope_key: scopeKey,
    full_number: renderNomor(master.format, {
      KODE: master.kode,
      GOLONGAN: golongan,
      URUT: seq,
      URUT_SUFFIX: seqSuffix ? `.${seqSuffix}` : '',
      UNIT: unit,
      TAHUN: bagian.year,
      BULAN: String(bagian.month).padStart(2, '0'),
      BULAN_ROMAWI: monthRoman(bagian.month),
      BIDANG: unit
    })
  };
};

export const reservasiNomor = async ({
  jenisId,
  bidangKode,
  tanggal,
  aktor,
  idempotencyKey,
  metadata = {}
}) => {
  const [master, bidang, pengaturan] = await Promise.all([
    ambilMaster(jenisId),
    ambilBidang(bidangKode),
    ambilPengaturanNomor()
  ]);
  const tanggalSurat = keTanggal(tanggal);
  if (!tanggalSurat) throw new AppError(400, 'TANGGAL_TIDAK_VALID', 'Tanggal surat tidak valid.');
  const bagian = bagianJakarta(tanggalSurat);
  const scopeKey = scopeKeyFor({ golongan: master.golongan, kode: master.kode, scope: pengaturan.scope });
  const idemId = kunci(idempotencyKey || `${aktor.uid}_${master.id}_${tanggalSurat.toISOString()}`);
  const idemRef = refDokumen(KOLEKSI.LETTER_IDEMPOTENCY, idemId);
  const counterRef = refDokumen(KOLEKSI.LETTER_COUNTERS, kunci(`${bagian.year}_${scopeKey}`));
  const letterRef = refKoleksi(KOLEKSI.LETTER_NUMBERS).doc();

  return jalankanTransaksi(async (transaction) => {
    const idem = await transaction.get(idemRef);
    if (idem.exists) {
      const existing = await transaction.get(refDokumen(KOLEKSI.LETTER_NUMBERS, idem.data().letter_id));
      if (!existing.exists) {
        throw new AppError(409, 'IDEMPOTENSI_RUSAK', 'Kunci idempotensi menunjuk nomor yang tidak ada.');
      }
      return { id: existing.id, ...existing.data() };
    }

    const counter = await transaction.get(counterRef);
    const auditHead = await bacaAuditHead(transaction);
    const seq = counter.exists ? Number(counter.data().last_seq || 0) + 1 : 1;
    const nomor = bangunNomor({ master, unit: bidang.kode, seq, date: tanggalSurat, scopeKey });
    const indexRef = refDokumen(KOLEKSI.LETTER_NUMBER_INDEX, kunci(nomor.full_number));
    const index = await transaction.get(indexRef);
    if (index.exists) {
      throw new AppError(409, 'NOMOR_DUPLIKAT', 'Nomor surat sudah terdaftar. Ulangi Generate Nomor.');
    }

    const now = Timestamp.now();
    const after = {
      id: letterRef.id,
      ...nomor,
      jenisId: master.id,
      status: STATUS_NOMOR.RESERVED,
      letter_date: Timestamp.fromDate(tanggalSurat),
      perihal: metadata.perihal || '',
      tujuan: metadata.tujuan || '',
      created_by: dataAktor(aktor),
      issued_at: null,
      voided_at: null,
      voided_by: null,
      void_reason: '',
      replaced_by_id: null,
      replacement_of_id: null,
      reservation_expires_at: batasExpiry(pengaturan.reservationMinutes),
      idempotency_key: idempotencyKey || idemId,
      row_version: 1,
      created_at: now
    };
    if (counter.exists) {
      transaction.update(counterRef, { last_seq: seq, updated_at: now });
    } else {
      transaction.set(counterRef, {
        tahun: bagian.year,
        scope: pengaturan.scope,
        scope_key: scopeKey,
        last_seq: seq,
        updated_at: now
      });
    }
    transaction.set(letterRef, after);
    transaction.set(indexRef, { letter_id: letterRef.id, full_number: nomor.full_number, created_at: now });
    transaction.set(idemRef, { letter_id: letterRef.id, created_at: now });
    await tulisAuditDalamTransaksi(transaction, {
      letterId: letterRef.id,
      action: 'RESERVE',
      actor: aktor,
      before: null,
      after,
      previousHash: auditHead
    });
    return after;
  });
};

export const terbitkanNomor = async ({ reservationId, payload, aktor }) =>
  jalankanTransaksi(async (transaction) => {
    const letterRef = refDokumen(KOLEKSI.LETTER_NUMBERS, reservationId);
    const letterSnap = await transaction.get(letterRef);
    if (!letterSnap.exists) {
      throw new AppError(409, 'RESERVASI_TIDAK_ADA', 'Reservasi nomor tidak ditemukan.');
    }
    const before = letterSnap.data();
    if (before.status === STATUS_NOMOR.ISSUED) {
      const existing = before.letter_id
        ? await transaction.get(refDokumen(KOLEKSI.SURAT_KELUAR, before.letter_id))
        : null;
      return existing?.exists
        ? { id: existing.id, ...existing.data(), letterNumberId: letterSnap.id }
        : { id: letterSnap.id, ...before };
    }
    if (before.status !== STATUS_NOMOR.RESERVED) {
      throw new AppError(409, 'STATUS_NOMOR_TIDAK_VALID', 'Nomor tidak dapat diterbitkan dari status ini.');
    }
    const kedaluwarsa = before.reservation_expires_at?.toDate?.();
    if (kedaluwarsa && kedaluwarsa.getTime() < Date.now()) {
      throw new AppError(
        409,
        'RESERVASI_KEDALUWARSA',
        'Reservasi nomor sudah kedaluwarsa. Generate nomor baru.'
      );
    }

    const suratRef = refKoleksi(KOLEKSI.SURAT_KELUAR).doc();
    const auditHead = await bacaAuditHead(transaction);
    const now = Timestamp.now();
    const after = {
      ...before,
      status: STATUS_NOMOR.ISSUED,
      letter_id: suratRef.id,
      perihal: payload.hal,
      tujuan: payload.tujuan,
      letter_date: payload.tglSurat,
      issued_at: now,
      row_version: Number(before.row_version || 1) + 1
    };
    const surat = {
      noSurat: before.full_number,
      jenisId: payload.jenisId,
      golongan: normalizeGolongan(before.golongan),
      tglSurat: payload.tglSurat,
      tujuan: payload.tujuan,
      hal: payload.hal,
      isiRingkas: payload.isiRingkas,
      sifat: payload.sifat,
      tandaTangan: payload.tandaTangan || 'BASAH',
      fileId: '',
      fileUrl: String(payload.fileUrl || '').trim(),
      bidangPembuat: before.unit,
      dibuatOleh: { uid: aktor.uid, nama: aktor.nama || '' },
      status: 'Aktif',
      alasanBatal: '',
      aksesBidang:
        payload.sifat === 'rahasia' ? [...new Set([...(payload.aksesBidang || []), before.unit])] : [],
      letterNumberId: letterRef.id,
      letterRowVersion: after.row_version,
      dibuatPada: now
    };
    transaction.set(suratRef, surat);
    transaction.update(letterRef, after);
    await tulisAuditDalamTransaksi(transaction, {
      letterId: letterRef.id,
      action: 'ISSUE',
      actor: aktor,
      before,
      after,
      previousHash: auditHead
    });
    return { id: suratRef.id, ...surat, letterNumberId: letterRef.id };
  });

export { reservasiNomor as reserveLetterNumber, terbitkanNomor as issueLetterNumber };
