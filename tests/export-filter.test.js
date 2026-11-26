import test from 'node:test';
import assert from 'node:assert/strict';
import { skemaFilterSuratMasuk, skemaFilterEksporMasuk } from '../src/validators/suratMasuk.validator.js';
import { skemaFilterSuratKeluar, skemaFilterEksporKeluar } from '../src/validators/suratKeluar.validator.js';

const queryEkspor = {
  sifat: 'semua',
  status: 'semua',
  bidang: 'semua',
  page: '1',
  limit: '5000'
};

test('daftar surat menolak limit di atas batas pagination', () => {
  assert.equal(skemaFilterSuratMasuk.safeParse(queryEkspor).success, false);
  assert.equal(skemaFilterSuratKeluar.safeParse(queryEkspor).success, false);
});

test('ekspor surat masuk menerima limit besar dan mengabaikan pagination', () => {
  const hasil = skemaFilterEksporMasuk.safeParse(queryEkspor);
  assert.equal(hasil.success, true);
  assert.equal(hasil.data.limit, undefined);
  assert.equal(hasil.data.page, undefined);
  assert.equal(hasil.data.sifat, 'semua');
  assert.equal(hasil.data.status, 'semua');
});

test('ekspor surat keluar menerima limit besar dan mengabaikan pagination', () => {
  const hasil = skemaFilterEksporKeluar.safeParse(queryEkspor);
  assert.equal(hasil.success, true);
  assert.equal(hasil.data.limit, undefined);
  assert.equal(hasil.data.page, undefined);
  assert.equal(hasil.data.sifat, 'semua');
  assert.equal(hasil.data.status, 'semua');
});
