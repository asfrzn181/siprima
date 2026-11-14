// Uji integrasi penomoran terhadap MySQL asli.
// Jalankan dengan: RUN_MYSQL_TESTS=1 npm test
// Memakai master nomor/bidang dari seed dan membersihkan data uji setelahnya.
import assert from 'node:assert/strict';
import test, { after } from 'node:test';

const aktif = process.env.RUN_MYSQL_TESTS === '1';
const lewati = aktif ? false : 'Set RUN_MYSQL_TESTS=1 untuk menjalankan uji database.';

const aktor = { uid: 1, nama: 'Uji Penomoran', profile: { role: 'admin' } };

const muatKonteks = async () => {
  const { query } = await import('../src/config/db.js');
  const [nomor] = await query(
    "SELECT id, kode, golongan FROM master_nomor WHERE aktif = 1 ORDER BY (golongan = 'LAINNYA') DESC, id ASC LIMIT 2"
  );
  const [bidang] = await query('SELECT kode FROM master_bidang WHERE aktif = 1 ORDER BY id ASC LIMIT 1');
  return { nomor, bidang };
};

test('penomoran per menu: pola, pemakaian ulang, dan pembatalan', { skip: lewati }, async () => {
  const { query } = await import('../src/config/db.js');
  const { reservasiNomor, tersediaNomor } = await import('../src/repositories/numbering.repository.js');
  const { voidNomor } = await import('../src/repositories/numberingLanjutan.repository.js');
  const { buatSuratKhusus, batalkanSuratKhusus } = await import(
    '../src/repositories/suratKhusus.repository.js'
  );

  const { nomor, bidang } = await muatKonteks();
  if (!nomor.length || !bidang.length) {
    return; // seed belum tersedia
  }
  const { bagianJakarta } = await import('../src/utils/tanggal.js');
  const [utama, cadangan] = nomor;
  const kodeBidang = bidang.kode;
  const tanggal = new Date();
  const tahun = bagianJakarta(tanggal).year;
  const dibuat = { nomor: [], khusus: [] };
  const [kepala] = await query('SELECT last_hash FROM letter_audit_heads WHERE id = 1');
  const hashAwal = kepala ? String(kepala.last_hash || '') : '';

  try {
    const awal = await tersediaNomor({
      menu: 'SURAT_KELUAR',
      jenisId: utama.id,
      bidangKode: kodeBidang,
      tanggal
    });
    const seqAwal = awal.kecilTersedia;

    const r1 = await reservasiNomor({
      menu: 'SURAT_KELUAR',
      jenisId: utama.id,
      bidangKode: kodeBidang,
      tanggal,
      aktor,
      idempotencyKey: `uji-nomor-1-${Date.now()}`
    });
    dibuat.nomor.push(r1.id);
    assert.equal(Number(r1.seq), seqAwal);
    assert.equal(r1.full_number, `${utama.kode}/${seqAwal}/BKPSDMD/${kodeBidang}/${tahun}`);

    // Ganti jenis dengan melepas reservasi lama: urutan tetap, kode berubah.
    const r2 = await reservasiNomor({
      menu: 'SURAT_KELUAR',
      jenisId: (cadangan || utama).id,
      bidangKode: kodeBidang,
      tanggal,
      aktor,
      reservationIdLama: r1.id,
      idempotencyKey: `uji-nomor-2-${Date.now()}`
    });
    dibuat.nomor.push(r2.id);
    assert.equal(Number(r2.seq), seqAwal);
    assert.equal(r2.full_number, `${(cadangan || utama).kode}/${seqAwal}/BKPSDMD/${kodeBidang}/${tahun}`);

    // Batal di hari yang sama: nomor boleh dipakai ulang otomatis.
    await voidNomor({ letterNumberId: r2.id, reason: 'Uji pembatalan', aktor });
    const r3 = await reservasiNomor({
      menu: 'SURAT_KELUAR',
      jenisId: utama.id,
      bidangKode: kodeBidang,
      tanggal,
      aktor,
      idempotencyKey: `uji-nomor-3-${Date.now()}`
    });
    dibuat.nomor.push(r3.id);
    assert.equal(Number(r3.seq), seqAwal);
    assert.ok(Number(r3.reuse_count) >= 1);

    // SK: nomor otomatis, batal, lalu dipakai ulang pada tahun yang sama.
    const sk1 = await buatSuratKhusus(
      'SK',
      { jenisId: utama.id, tentang: 'Uji SK', tanggal, keterangan: '' },
      aktor
    );
    dibuat.khusus.push(sk1.id);
    dibuat.nomor.push(sk1.letterNumberId);
    assert.match(sk1.nomor, new RegExp(`^${utama.kode}/\\d+/BKPSDMD/${tahun}$`));
    await batalkanSuratKhusus('SK', sk1.id, 'Uji batal SK', aktor);
    const sk2 = await buatSuratKhusus(
      'SK',
      { jenisId: utama.id, tentang: 'Uji SK ulang', tanggal, keterangan: '' },
      aktor
    );
    dibuat.khusus.push(sk2.id);
    dibuat.nomor.push(sk2.letterNumberId);
    assert.equal(sk2.nomor, sk1.nomor);

    // SE: tanpa kode klasifikasi.
    const se1 = await buatSuratKhusus('SE', { tentang: 'Uji SE', tanggal, keterangan: '' }, aktor);
    dibuat.khusus.push(se1.id);
    dibuat.nomor.push(se1.letterNumberId);
    assert.match(se1.nomor, new RegExp(`^\\d+ TAHUN ${tahun}$`));
    await batalkanSuratKhusus('SE', se1.id, 'Uji batal SE', aktor);
    const se2 = await buatSuratKhusus('SE', { tentang: 'Uji SE ulang', tanggal, keterangan: '' }, aktor);
    dibuat.khusus.push(se2.id);
    dibuat.nomor.push(se2.letterNumberId);
    assert.equal(se2.nomor, se1.nomor);
  } finally {
    const idsKhusus = [...new Set(dibuat.khusus.filter(Boolean))];
    const idsNomor = [...new Set(dibuat.nomor.filter(Boolean))];
    if (idsKhusus.length) {
      await query(`DELETE FROM surat_khusus WHERE id IN (${idsKhusus.map(() => '?').join(',')})`, idsKhusus);
    }
    if (idsNomor.length) {
      const tanda = idsNomor.map(() => '?').join(',');
      await query(`DELETE FROM letter_audit_log WHERE letter_id IN (${tanda})`, idsNomor);
      await query(`DELETE FROM letter_idempotency WHERE letter_id IN (${tanda})`, idsNomor);
      await query(`DELETE FROM letter_numbers WHERE id IN (${tanda})`, idsNomor);
    }
    await query('UPDATE letter_audit_heads SET last_hash = ? WHERE id = 1', [hashAwal]);
  }
});

test('surat keluar: pratinjau read-only dan nomor final dari server', { skip: lewati }, async () => {
  const { query } = await import('../src/config/db.js');
  const { buatSuratKeluarBernomor, tersediaNomor } = await import(
    '../src/repositories/numbering.repository.js'
  );
  const { voidNomor } = await import('../src/repositories/numberingLanjutan.repository.js');
  const { bagianJakarta } = await import('../src/utils/tanggal.js');

  const { nomor, bidang } = await muatKonteks();
  if (!nomor.length || !bidang.length) return;

  const tanggal = new Date();
  const tahun = bagianJakarta(tanggal).year;
  const kodeBidang = bidang.kode;
  const dibuat = { nomor: [], keluar: [] };
  const [kepala] = await query('SELECT last_hash FROM letter_audit_heads WHERE id = 1');
  const hashAwal = kepala ? String(kepala.last_hash || '') : '';

  const hitung = async () => {
    const [row] = await query(
      'SELECT COUNT(*) AS jumlah FROM letter_numbers WHERE menu = ? AND tahun = ?',
      ['SURAT_KELUAR', tahun]
    );
    return Number(row.jumlah);
  };

  const terbitkan = (overrides = {}) =>
    buatSuratKeluarBernomor({
      jenisId: nomor[0].id,
      bidangKode: kodeBidang,
      tanggal,
      payload: {
        jenisId: String(nomor[0].id),
        tglSurat: tanggal,
        bidangPembuat: kodeBidang,
        tujuan: 'Uji alur',
        hal: 'Uji alur',
        isiRingkas: 'Uji alur',
        sifat: 'biasa',
        tandaTangan: 'BASAH',
        aksesBidang: [],
        ...overrides
      },
      aktor
    });

  try {
    const awal = await tersediaNomor({
      menu: 'SURAT_KELUAR',
      jenisId: nomor[0].id,
      bidangKode: kodeBidang,
      tanggal
    });
    const seqAwal = awal.kecilTersedia;

    // Pratinjau berulang tidak boleh membuat baris nomor.
    const sebelum = await hitung();
    await tersediaNomor({
      menu: 'SURAT_KELUAR',
      jenisId: nomor[0].id,
      bidangKode: kodeBidang,
      tanggal
    });
    await tersediaNomor({
      menu: 'SURAT_KELUAR',
      jenisId: nomor[0].id,
      bidangKode: kodeBidang,
      tanggal
    });
    assert.equal(await hitung(), sebelum, 'pratinjau tidak boleh menyimpan nomor');

    const s1 = await terbitkan();
    dibuat.keluar.push(s1.id);
    dibuat.nomor.push(s1.letterNumberId);
    assert.equal(s1.noSurat, `${nomor[0].kode}/${seqAwal}/BKPSDMD/${kodeBidang}/${tahun}`);

    // Pengguna kedua yang menyimpan setelahnya mendapat nomor berikutnya.
    const s2 = await terbitkan();
    dibuat.keluar.push(s2.id);
    dibuat.nomor.push(s2.letterNumberId);
    assert.equal(s2.noSurat, `${nomor[0].kode}/${seqAwal + 1}/BKPSDMD/${kodeBidang}/${tahun}`);

    // Batal pada hari yang sama: nomor terkecil kembali tersedia untuk pratinjau.
    await voidNomor({ letterNumberId: s1.letterNumberId, reason: 'Uji batal', aktor });
    const setelahBatal = await tersediaNomor({
      menu: 'SURAT_KELUAR',
      jenisId: nomor[0].id,
      bidangKode: kodeBidang,
      tanggal
    });
    assert.equal(setelahBatal.kecilTersedia, seqAwal);
    assert.equal(setelahBatal.items[0].seq, seqAwal);
  } finally {
    const idsKeluar = [...new Set(dibuat.keluar.filter(Boolean))];
    const idsNomor = [...new Set(dibuat.nomor.filter(Boolean))];
    if (idsKeluar.length) {
      const tanda = idsKeluar.map(() => '?').join(',');
      await query(`DELETE FROM surat_keluar_akses_bidang WHERE surat_keluar_id IN (${tanda})`, idsKeluar);
      await query(`DELETE FROM surat_keluar WHERE id IN (${tanda})`, idsKeluar);
    }
    if (idsNomor.length) {
      const tanda = idsNomor.map(() => '?').join(',');
      await query(`DELETE FROM letter_audit_log WHERE letter_id IN (${tanda})`, idsNomor);
      await query(`DELETE FROM letter_idempotency WHERE letter_id IN (${tanda})`, idsNomor);
      await query(`DELETE FROM letter_numbers WHERE id IN (${tanda})`, idsNomor);
    }
    await query('UPDATE letter_audit_heads SET last_hash = ? WHERE id = 1', [hashAwal]);
  }
});

after(async () => {
  if (!aktif) return;
  const { tutupPool } = await import('../src/config/db.js');
  await tutupPool();
});
