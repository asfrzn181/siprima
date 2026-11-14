import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MENU_NOMOR,
  bolehPakaiUlangNomor,
  defaultFormatMenu,
  renderNomor
} from '../src/utils/nomor.js';

const nomor = (menu, values) =>
  renderNomor(defaultFormatMenu(menu), {
    GOLONGAN: menu === MENU_NOMOR.SK ? 'SK' : menu === MENU_NOMOR.SE ? 'SE' : 'LAINNYA',
    ...values
  });

test('pola nomor tiap menu sesuai ketentuan', () => {
  assert.equal(
    nomor(MENU_NOMOR.SURAT_KELUAR, { KODE: '900', URUT: 4, BIDANG: 'III', TAHUN: 2026 }),
    '900/4/BKPSDMD/III/2026'
  );
  assert.equal(
    nomor(MENU_NOMOR.SK, { KODE: '800', URUT: 12, TAHUN: 2026 }),
    '800/12/BKPSDMD/2026'
  );
  assert.equal(nomor(MENU_NOMOR.SE, { URUT: 7, TAHUN: 2026 }), '7 TAHUN 2026');
});

test('nomor urut tidak memakai nol di depan', () => {
  assert.equal(
    nomor(MENU_NOMOR.SURAT_KELUAR, { KODE: '800', URUT: 1, BIDANG: 'III', TAHUN: 2026 }),
    '800/1/BKPSDMD/III/2026'
  );
  assert.equal(
    nomor(MENU_NOMOR.SURAT_KELUAR, { KODE: '800', URUT: 333, BIDANG: 'III', TAHUN: 2026 }),
    '800/333/BKPSDMD/III/2026'
  );
});

test('mengganti jenis hanya mengubah kode klasifikasi', () => {
  const seq = 4;
  const nilai = {
    URUT: seq,
    BIDANG: 'III',
    TAHUN: 2026
  };
  const pertama = nomor(MENU_NOMOR.SURAT_KELUAR, { ...nilai, KODE: '900' });
  const kedua = nomor(MENU_NOMOR.SURAT_KELUAR, { ...nilai, KODE: '800' });
  assert.equal(pertama, '900/4/BKPSDMD/III/2026');
  assert.equal(kedua, '800/4/BKPSDMD/III/2026');
  assert.equal(pertama.split('/')[1], kedua.split('/')[1]);
});

test('surat keluar memakai Tanggal Surat, bukan tanggal sistem', () => {
  const terbit = new Date('2026-03-10T10:00:00+07:00');
  const dasar = {
    menu: MENU_NOMOR.SURAT_KELUAR,
    status: 'VOID',
    voidedAt: new Date('2026-03-20T10:00:00+07:00'),
    letterDate: terbit,
    tahunNomor: 2026,
    tahunAcuan: 2026
  };
  // Hari ini bisa berbeda (mis. 20 Nov); yang menentukan adalah Tanggal Surat.
  assert.equal(bolehPakaiUlangNomor({ ...dasar, tanggalAcuan: terbit }), true);
  assert.equal(
    bolehPakaiUlangNomor({ ...dasar, tanggalAcuan: new Date('2026-03-11T08:00:00+07:00') }),
    false
  );
  assert.equal(
    bolehPakaiUlangNomor({ ...dasar, tanggalAcuan: new Date('2026-01-01T08:00:00+07:00') }),
    false
  );
});

test('SK dan SE boleh pakai ulang kapan saja dalam tahun yang sama', () => {
  const dasar = {
    status: 'VOID',
    voidedAt: new Date('2026-03-10T10:00:00+07:00'),
    letterDate: new Date('2026-03-10T10:00:00+07:00'),
    tahunNomor: 2026,
    tahunAcuan: 2026
  };
  assert.equal(
    bolehPakaiUlangNomor({ ...dasar, menu: MENU_NOMOR.SK, tanggalAcuan: new Date('2026-12-05T10:00:00+07:00') }),
    true
  );
  assert.equal(
    bolehPakaiUlangNomor({ ...dasar, menu: MENU_NOMOR.SE, tanggalAcuan: new Date('2026-12-05T10:00:00+07:00') }),
    true
  );
  assert.equal(
    bolehPakaiUlangNomor({ ...dasar, menu: MENU_NOMOR.SK, tahunAcuan: 2027 }),
    false
  );
});

test('nomor aktif atau belum dibatalkan tidak masuk daftar tersedia', () => {
  const dasar = {
    menu: MENU_NOMOR.SK,
    voidedAt: new Date('2026-03-10T10:00:00+07:00'),
    letterDate: new Date('2026-03-10T10:00:00+07:00'),
    tahunNomor: 2026,
    tahunAcuan: 2026,
    tanggalAcuan: new Date('2026-03-10T10:00:00+07:00')
  };
  assert.equal(bolehPakaiUlangNomor({ ...dasar, status: 'ISSUED' }), false);
  assert.equal(bolehPakaiUlangNomor({ ...dasar, status: 'RESERVED' }), false);
  assert.equal(bolehPakaiUlangNomor({ ...dasar, status: 'VOID', voidedAt: null }), false);
});
