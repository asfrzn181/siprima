import assert from 'node:assert/strict';
import test from 'node:test';
import { PERAN, SIFAT, STATUS_KELUAR } from '../src/constants/index.js';
import {
  adalahAdmin,
  adalahBidang,
  adalahPengelola,
  bolehBacaSurat,
  bolehBuatSuratKeluar,
  bolehTindakLanjut,
  bolehUbahSuratKeluar,
  bolehUbahSuratMasuk
} from '../src/utils/akses.js';
import { izinkan } from '../src/middlewares/role.js';
import { kirimError, kirimSukses } from '../src/utils/response.js';

const profil = (role, bidang = '') => ({ role, bidang, aktif: true });

test('peran dasar dikenali dengan benar', () => {
  assert.equal(adalahAdmin(profil(PERAN.ADMIN)), true);
  assert.equal(adalahPengelola(profil(PERAN.PIMPINAN)), true);
  assert.equal(adalahPengelola(profil(PERAN.BIDANG)), false);
  assert.equal(adalahBidang(profil(PERAN.BIDANG, 'SEK')), true);
  assert.equal(bolehUbahSuratMasuk(profil(PERAN.PIMPINAN)), true);
  assert.equal(bolehUbahSuratMasuk(profil(PERAN.BIDANG)), false);
  assert.equal(bolehBuatSuratKeluar(profil(PERAN.BIDANG)), true);
  assert.equal(bolehBuatSuratKeluar(profil(PERAN.PIMPINAN)), false);
});

test('surat biasa dapat dibaca semua peran aktif', () => {
  const surat = { sifat: SIFAT.BIASA };
  [PERAN.ADMIN, PERAN.PIMPINAN, PERAN.BIDANG].forEach((role) => {
    assert.equal(bolehBacaSurat(profil(role, 'SEK'), surat), true, role);
  });
});

test('surat rahasia hanya untuk pengelola atau bidang yang berhak', () => {
  const surat = { sifat: SIFAT.RAHASIA, aksesBidang: ['SEK'] };
  assert.equal(bolehBacaSurat(profil(PERAN.ADMIN), surat), true);
  assert.equal(bolehBacaSurat(profil(PERAN.PIMPINAN), surat), true);
  assert.equal(bolehBacaSurat(profil(PERAN.BIDANG, 'SEK'), surat), true);
  assert.equal(bolehBacaSurat(profil(PERAN.BIDANG, 'UMUM'), surat), false);
  assert.equal(bolehBacaSurat({ ...profil(PERAN.ADMIN), aktif: false }, surat), false);
});

test('tindak lanjut hanya untuk bidang yang didisposisikan', () => {
  const surat = { sifat: SIFAT.RAHASIA, aksesBidang: ['SEK'] };
  assert.equal(bolehTindakLanjut(profil(PERAN.BIDANG, 'SEK'), surat), true);
  assert.equal(bolehTindakLanjut(profil(PERAN.BIDANG, 'UMUM'), surat), false);
  assert.equal(bolehTindakLanjut(profil(PERAN.PIMPINAN), surat), false);
});

test('bidang hanya boleh mengubah surat keluar miliknya yang masih aktif', () => {
  const surat = { bidangPembuat: 'SEK', status: STATUS_KELUAR.AKTIF };
  assert.equal(bolehUbahSuratKeluar(profil(PERAN.ADMIN), surat), true);
  assert.equal(bolehUbahSuratKeluar(profil(PERAN.BIDANG, 'SEK'), surat), true);
  assert.equal(bolehUbahSuratKeluar(profil(PERAN.BIDANG, 'UMUM'), surat), false);
  assert.equal(
    bolehUbahSuratKeluar(profil(PERAN.BIDANG, 'SEK'), { ...surat, status: STATUS_KELUAR.DIBATALKAN }),
    false
  );
  assert.equal(bolehUbahSuratKeluar(profil(PERAN.PIMPINAN), surat), false);
});

test('middleware izinkan menolak peran yang tidak berhak dengan 403', () => {
  const jalankan = (role) => {
    let hasil;
    izinkan(PERAN.ADMIN)({ profile: { role } }, {}, (error) => {
      hasil = error;
    });
    return hasil;
  };
  assert.equal(jalankan(PERAN.ADMIN), undefined);
  const error = jalankan(PERAN.BIDANG);
  assert.equal(error.status, 403);
  assert.equal(error.kode, 'AKSES_DITOLAK');
});

test('format respons sukses dan gagal konsisten', () => {
  const sukses = {
    statusCode: 200,
    body: null,
    status(kode) {
      this.statusCode = kode;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  kirimSukses(sukses, { data: { id: 1 } });
  assert.deepEqual(sukses.body, {
    status: 'success',
    message: 'Berhasil.',
    data: { id: 1 },
    errors: null
  });

  const gagal = { ...sukses, body: null };
  kirimError(gagal, { status: 403, message: 'Tidak boleh.', errors: [{ code: 'AKSES_DITOLAK' }] });
  assert.equal(gagal.statusCode, 403);
  assert.equal(gagal.body.status, 'error');
  assert.equal(gagal.body.data, null);
});
