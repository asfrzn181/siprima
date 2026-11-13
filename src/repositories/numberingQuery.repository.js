import { one, query } from '../config/db.js';
import { cariBidangByKode, cariNomor } from './master.repository.js';
import { ambilPengaturan } from './settings.repository.js';
import { petaNomor } from './numbering.repository.js';
import {
  monthRoman,
  normalizeFormatGolongan,
  normalizeGolongan,
  renderNomor,
  scopeKeyFor
} from '../utils/nomor.js';
import { bagianJakarta, keTanggal } from '../utils/tanggal.js';
import { AppError } from '../utils/AppError.js';

export const cariNomorByFullNumber = async (fullNumber) => {
  const row = await one('SELECT * FROM letter_numbers WHERE full_number = ? LIMIT 1', [
    String(fullNumber || '').trim()
  ]);
  return row ? petaNomor(row) : null;
};

export const cariRegisterNomor = async (id) => {
  const row = await one('SELECT * FROM letter_numbers WHERE id = ?', [id]);
  return row ? petaNomor(row) : null;
};

export const pratinjauNomor = async ({ jenisId, bidangKode, tanggal }) => {
  const master = await cariNomor(Number(jenisId));
  if (!master || master.aktif !== true) {
    throw new AppError(400, 'MASTER_NOMOR_TIDAK_AKTIF', 'Pilih jenis nomor surat yang aktif.');
  }
  const bidang = await cariBidangByKode(bidangKode);
  if (!bidang || bidang.aktif !== true) {
    throw new AppError(
      400,
      'BIDANG_TIDAK_AKTIF',
      `Bidang dengan kode ${bidangKode} belum terdaftar atau tidak aktif.`
    );
  }
  const tanggalSurat = keTanggal(tanggal);
  if (!tanggalSurat) throw new AppError(400, 'TANGGAL_TIDAK_VALID', 'Tanggal surat tidak valid.');
  const pengaturan = await ambilPengaturan();
  const scope = pengaturan.numberingScope === 'PER_KLASIFIKASI' ? 'PER_KLASIFIKASI' : 'GLOBAL_PER_TAHUN';
  const scopeKey = scopeKeyFor({ golongan: master.golongan, kode: master.kode, scope });
  const bagian = bagianJakarta(tanggalSurat);
  const counter = await one(
    'SELECT last_seq FROM letter_counters WHERE tahun = ? AND scope_key = ?',
    [bagian.year, scopeKey]
  );
  const sebelumnya = counter ? Number(counter.last_seq || 0) : 0;
  const berikutnya = sebelumnya + 1;
  const format = normalizeFormatGolongan(master.format, master.golongan);
  return {
    noSurat: renderNomor(format, {
      KODE: master.kode,
      GOLONGAN: normalizeGolongan(master.golongan),
      UNIT: bidang.kode,
      TAHUN: bagian.year,
      BULAN: String(bagian.month).padStart(2, '0'),
      BULAN_ROMAWI: monthRoman(bagian.month),
      BIDANG: bidang.kode,
      URUT: berikutnya
    }),
    next: berikutnya,
    previous: sebelumnya,
    year: bagian.year,
    golongan: normalizeGolongan(master.golongan),
    scopeKey,
    unit: bidang.kode,
    unitNama: bidang.nama
  };
};

const ambilMasterAman = async (jenisId) => {
  try {
    return await cariNomor(jenisId);
  } catch {
    return null;
  }
};

const bandingkanUrutan = (a, b) =>
  Number(a.seq) - Number(b.seq) || String(a.seq_suffix || '').localeCompare(String(b.seq_suffix || ''));

export const verifikasiUrutan = async (tahun, scopeKey = null) => {
  const rows = (
    await query(
      `SELECT * FROM letter_numbers WHERE tahun = ? ${scopeKey ? 'AND scope_key = ?' : ''}`,
      scopeKey ? [Number(tahun), scopeKey] : [Number(tahun)]
    )
  )
    .map(petaNomor)
    .sort(bandingkanUrutan);

  const groups = new Map();
  const digunakan = new Set();
  const issues = [];
  const masters = new Map();

  for (const jenisId of [...new Set(rows.map((row) => row.jenisId).filter(Boolean))]) {
    masters.set(jenisId, await ambilMasterAman(jenisId));
  }

  for (const row of rows) {
    const identitas = `${row.scope_key}:${row.seq}:${row.seq_suffix || ''}`;
    if (digunakan.has(identitas)) {
      issues.push({ type: 'DUPLICATE_SEQUENCE', id: row.id, identity: identitas, seq: row.seq });
    }
    digunakan.add(identitas);

    const master = masters.get(row.jenisId);
    const golongan = normalizeGolongan(row.golongan || master?.golongan);
    const format = master?.format || normalizeFormatGolongan('', golongan);
    const expected = renderNomor(format, {
      KODE: row.klasifikasi,
      GOLONGAN: golongan,
      URUT: row.seq,
      URUT_SUFFIX: row.seq_suffix ? `.${row.seq_suffix}` : '',
      UNIT: row.unit,
      TAHUN: row.tahun,
      BULAN: String(row.bulan ?? '').padStart(2, '0'),
      BULAN_ROMAWI: row.bulan_romawi || monthRoman(row.bulan)
    });
    if (row.full_number !== expected) {
      issues.push({ type: 'NUMBER_MISMATCH', id: row.id, expected, actual: row.full_number, seq: row.seq });
    }

    const kunciGrup = `${row.tahun}:${row.scope_key}`;
    if (!groups.has(kunciGrup)) groups.set(kunciGrup, new Map());
    groups.get(kunciGrup).set(Number(row.seq), row);
  }

  for (const [grup, isi] of groups) {
    const maks = Math.max(...isi.keys());
    for (let seq = 1; seq <= maks; seq += 1) {
      if (!isi.has(seq)) issues.push({ type: 'GAP_WITHOUT_VOID', group: grup, seq });
    }
  }

  return { tahun: Number(tahun), total: rows.length, issues };
};
