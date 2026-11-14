import { one, query } from '../config/db.js';
import { cariNomor } from './master.repository.js';
import {
  bangunNomor,
  petaNomor,
  siapkanKonteks,
  tersediaNomor
} from './numbering.repository.js';
import { defaultFormatMenu, monthRoman, normalizeGolongan, renderNomor } from '../utils/nomor.js';

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

export const pratinjauNomor = async ({ menu, jenisId, bidangKode, tanggal }) => {
  const konteks = await siapkanKonteks({ menu, jenisId, bidangKode });
  const daftar = await tersediaNomor({ menu: konteks.menu, jenisId, bidangKode, tanggal });
  const tanggalBagian = daftar.tahun;
  const seqBerikut = daftar.berikutnya;
  const nomorBerikut = seqBerikut
    ? bangunNomor({
        menu: konteks.menu,
        master: konteks.master,
        bidangKode: konteks.bidangKode,
        seq: seqBerikut,
        date: tanggal
      }).full_number
    : '';
  const terpilih = daftar.items.length
    ? daftar.items[0]
    : { seq: seqBerikut, nomor: nomorBerikut };
  return {
    noSurat: terpilih.nomor || '',
    next: terpilih.seq,
    previous: daftar.items.length ? null : seqBerikut,
    year: tanggalBagian,
    menu: konteks.menu,
    golongan: konteks.menu === 'SK' ? 'SK' : konteks.menu === 'SE' ? 'SE' : 'LAINNYA',
    unit: konteks.bidangKode,
    unitNama: konteks.bidang ? konteks.bidang.nama : '',
    tersedia: daftar.items,
    berikutnya: seqBerikut
  };
};

const ambilMasterAman = async (jenisId) => {
  try {
    return await cariNomor(jenisId);
  } catch {
    return null;
  }
};

const bandingkanUrutan = (a, b) => Number(a.seq) - Number(b.seq);

export const verifikasiUrutan = async (tahun, scopeKey = null) => {
  const rows = (
    await query(
      `SELECT * FROM letter_numbers WHERE tahun = ? ${scopeKey ? 'AND (scope_key = ? OR menu = ?)' : ''}`,
      scopeKey ? [Number(tahun), scopeKey, scopeKey] : [Number(tahun)]
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
    const menu = row.menu || 'SURAT_KELUAR';
    const identitas = `${menu}:${row.seq}`;
    if (digunakan.has(identitas)) {
      issues.push({ type: 'DUPLICATE_SEQUENCE', id: row.id, identity: identitas, seq: row.seq });
    }
    digunakan.add(identitas);

    const master = masters.get(row.jenisId);
    const golongan = normalizeGolongan(row.golongan || master?.golongan);
    const expected = renderNomor(defaultFormatMenu(menu), {
      KODE: row.klasifikasi,
      GOLONGAN: golongan,
      URUT: row.seq,
      UNIT: row.kode_bidang || row.unit,
      BIDANG: row.kode_bidang || row.unit,
      TAHUN: row.tahun,
      BULAN: String(row.bulan ?? '').padStart(2, '0'),
      BULAN_ROMAWI: row.bulan_romawi || monthRoman(row.bulan)
    });
    if (row.full_number !== expected) {
      issues.push({ type: 'NUMBER_MISMATCH', id: row.id, expected, actual: row.full_number, seq: row.seq });
    }

    const kunciGrup = `${row.tahun}:${menu}`;
    if (!groups.has(kunciGrup)) groups.set(kunciGrup, new Map());
    groups.get(kunciGrup).set(Number(row.seq), row);
  }

  const celah = [];
  for (const [grup, isi] of groups) {
    const maks = Math.max(...isi.keys());
    for (let seq = 1; seq <= maks; seq += 1) {
      if (!isi.has(seq)) celah.push({ group: grup, seq });
    }
  }

  return { tahun: Number(tahun), total: rows.length, issues, celah };
};
