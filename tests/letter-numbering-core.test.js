import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSequence, monthRoman } from '../js/services/letter-numbering-core.js';

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
