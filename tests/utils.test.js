import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultFormatGolongan,
  formatSequence,
  monthRoman,
  normalizeFormatGolongan,
  normalizeGolongan,
  renderNomor,
  scopeKeyFor
} from '../src/utils/nomor.js';
import { potongHalaman } from '../src/utils/pagination.js';
import { serialisasi } from '../src/utils/serialisasi.js';

test('normalisasi golongan dan format default', () => {
  assert.equal(normalizeGolongan('surat keputusan'), 'SK');
  assert.equal(normalizeGolongan('SURAT EDARAN'), 'SE');
  assert.equal(normalizeGolongan('apa saja'), 'LAINNYA');
  assert.equal(defaultFormatGolongan('SK'), '{KODE}/SK/{URUT:3}/{UNIT}/{TAHUN}');
  assert.equal(defaultFormatGolongan('SE'), 'SE/{URUT:3}/{UNIT}/{TAHUN}');
});

test('format SE tidak memakai token kode', () => {
  assert.equal(normalizeFormatGolongan('{KODE}/{URUT:3}/{UNIT}/{TAHUN}', 'SE'), '{URUT:3}/{UNIT}/{TAHUN}');
  assert.equal(
    normalizeFormatGolongan('{KODE}/{URUT:3}/{UNIT}/BKPSDMD/{TAHUN}', 'LAINNYA'),
    '{KODE}/{URUT:3}/BKPSDMD/{UNIT}/{TAHUN}'
  );
});

test('render nomor mengisi semua variabel termasuk padding urut', () => {
  const hasil = renderNomor('{KODE}/SK/{URUT:4}/{UNIT}/{BULAN_ROMAWI}/{TAHUN}', {
    KODE: '800',
    GOLONGAN: 'SK',
    URUT: 7,
    UNIT: 'SEK',
    BULAN: 3,
    BULAN_ROMAWI: monthRoman(3),
    TAHUN: 2026
  });
  assert.equal(hasil, '800/SK/0007/SEK/III/2026');
  assert.equal(formatSequence(7, 3), '007');
  assert.equal(monthRoman(12), 'XII');
  assert.equal(monthRoman(13), '');
});

test('scope key mengikuti klasifikasi hanya jika diminta', () => {
  assert.equal(scopeKeyFor({ golongan: 'SK', kode: '800', scope: 'GLOBAL_PER_TAHUN' }), 'SK');
  assert.equal(scopeKeyFor({ golongan: 'SK', kode: '800', scope: 'PER_KLASIFIKASI' }), 'SK_800');
  assert.equal(scopeKeyFor({ golongan: 'SE', kode: 'SE', scope: 'PER_KLASIFIKASI' }), 'SE');
});

test('pagination memotong data dan melaporkan metadata', () => {
  const hasil = potongHalaman([1, 2, 3, 4, 5], { page: 2, limit: 2 });
  assert.deepEqual(hasil.items, [3, 4]);
  assert.equal(hasil.pagination.total, 5);
  assert.equal(hasil.pagination.totalPages, 3);
  assert.equal(hasil.pagination.hasPrev, true);
  assert.equal(hasil.pagination.hasNext, true);
});

test('serialisasi mengubah Timestamp menjadi ISO dan mempertahankan struktur', () => {
  const tiruan = { seconds: 1767323045, toDate: () => new Date('2026-01-02T03:04:05.000Z') };
  const hasil = serialisasi({ id: 'a', waktu: tiruan, daftar: [tiruan], kosong: null });
  assert.equal(hasil.id, 'a');
  assert.equal(hasil.waktu, '2026-01-02T03:04:05.000Z');
  assert.deepEqual(hasil.daftar, ['2026-01-02T03:04:05.000Z']);
  assert.equal(hasil.kosong, null);
});
