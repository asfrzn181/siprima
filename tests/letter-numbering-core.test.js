import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GOLONGAN,
  defaultFormatGolongan,
  formatSequence,
  golonganUsesKode,
  monthRoman,
  normalizeFormatGolongan,
  normalizeGolongan,
  renderNomor,
  scopeKeyFor,
  stripKodeToken
} from '../js/services/letter-numbering-core.js';

test('bulan dikonversi ke angka romawi berdasarkan tanggal kalender', () => {
  assert.equal(monthRoman(1), 'I');
  assert.equal(monthRoman(4), 'IV');
  assert.equal(monthRoman(12), 'XII');
  assert.equal(monthRoman(0), '');
});

test('padding urutan minimal tiga digit dan bertambah setelah 999', () => {
  assert.equal(formatSequence(1), '001');
  assert.equal(formatSequence(999), '999');
  assert.equal(formatSequence(1000), '1000');
  assert.equal(formatSequence(10001), '10001');
});

test('golongan dinormalisasi dan defaultnya surat lainnya', () => {
  assert.equal(DEFAULT_GOLONGAN, 'LAINNYA');
  assert.equal(normalizeGolongan(undefined), 'LAINNYA');
  assert.equal(normalizeGolongan('surat keputusan'), 'SK');
  assert.equal(normalizeGolongan(' SK '), 'SK');
  assert.equal(normalizeGolongan('Surat Edaran'), 'SE');
  assert.equal(normalizeGolongan('surat lainnya'), 'LAINNYA');
  assert.equal(normalizeGolongan('tidak dikenal'), 'LAINNYA');
});

test('hanya SE yang tidak memuat kode klasifikasi', () => {
  assert.equal(golonganUsesKode('SK'), true);
  assert.equal(golonganUsesKode('LAINNYA'), true);
  assert.equal(golonganUsesKode('SE'), false);
});

test('format SE tidak menyisakan token kode atau pemisah ganda', () => {
  assert.equal(stripKodeToken('{KODE}/SE/{URUT:3}/{UNIT}/{TAHUN}'), 'SE/{URUT:3}/{UNIT}/{TAHUN}');
  assert.equal(stripKodeToken('{KODE}/{KODE}/X'), 'X');
  assert.equal(normalizeFormatGolongan('', 'SK'), defaultFormatGolongan('SK'));
  assert.equal(normalizeFormatGolongan('{KODE}/{URUT:3}/{UNIT}/{TAHUN}', 'SE'), '{URUT:3}/{UNIT}/{TAHUN}');
  assert.equal(
    normalizeFormatGolongan('{KODE}/SE/{URUT:3}/{UNIT}/{TAHUN}', 'SE'),
    'SE/{URUT:3}/{UNIT}/{TAHUN}'
  );
});

test('scope key memisahkan urutan SK, SE, dan surat lainnya', () => {
  assert.equal(scopeKeyFor({ golongan: 'SK', kode: '800.1.1', scope: 'GLOBAL_PER_TAHUN' }), 'SK');
  assert.equal(scopeKeyFor({ golongan: 'SE', kode: '800.1.1', scope: 'GLOBAL_PER_TAHUN' }), 'SE');
  assert.equal(scopeKeyFor({ golongan: 'LAINNYA', kode: '005', scope: 'GLOBAL_PER_TAHUN' }), 'LAINNYA');
  assert.equal(scopeKeyFor({ golongan: 'LAINNYA', kode: '005', scope: 'PER_KLASIFIKASI' }), 'LAINNYA_005');
  assert.equal(scopeKeyFor({ golongan: 'SE', kode: '005', scope: 'PER_KLASIFIKASI' }), 'SE');
});

test('nomor dirender sesuai golongan', () => {
  const values = {
    KODE: '005',
    GOLONGAN: 'LAINNYA',
    UNIT: 'BKPSDMD',
    TAHUN: 2026,
    BULAN: '02',
    BULAN_ROMAWI: 'II',
    URUT: 12
  };
  assert.equal(renderNomor('{KODE}/{URUT:3}/{UNIT}/{TAHUN}', values), '005/012/BKPSDMD/2026');
  assert.equal(
    renderNomor('{KODE}/SK/{URUT:3}/{UNIT}/{TAHUN}', { ...values, GOLONGAN: 'SK' }),
    '005/SK/012/BKPSDMD/2026'
  );
  assert.equal(
    renderNomor('SE/{URUT:3}/{UNIT}/{TAHUN}', { ...values, GOLONGAN: 'SE' }),
    'SE/012/BKPSDMD/2026'
  );
  assert.equal(
    renderNomor('{KODE}/SE/{URUT:3}/{UNIT}/{TAHUN}', { ...values, GOLONGAN: 'SE' }),
    'SE/012/BKPSDMD/2026'
  );
  assert.equal(renderNomor('{URUT:4}/{GOLONGAN}/{TAHUN}', { ...values, URUT: 7 }), '0007/LAINNYA/2026');
});
