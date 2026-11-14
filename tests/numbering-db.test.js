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
  const nomor = await query(
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
  assert.ok(nomor.length && bidang, 'seed master nomor dan bidang tersedia');
  const { tanggalHariIniJakarta, tahunTanggal } = await import('../src/utils/tanggal.js');
  const [utama, cadangan] = nomor;
  const kodeBidang = bidang.kode;
  const tanggal = tanggalHariIniJakarta();
  const tahun = tahunTanggal(tanggal);
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

test('surat keluar: ketersediaan mengikuti Tanggal Surat, bukan tanggal sistem', { skip: lewati }, async () => {
  const { query } = await import('../src/config/db.js');
  const { buatSuratKeluarBernomor, tersediaNomor } = await import(
    '../src/repositories/numbering.repository.js'
  );
  const { voidNomor } = await import('../src/repositories/numberingLanjutan.repository.js');
  const { buatSuratKhusus, batalkanSuratKhusus } = await import(
    '../src/repositories/suratKhusus.repository.js'
  );

  const { nomor, bidang } = await muatKonteks();
  assert.ok(nomor.length && bidang, 'seed master nomor dan bidang tersedia');

  const jenisId = nomor[0].id;
  const kodeBidang = bidang.kode;
  const tahun = 2099;
  const d14 = '2099-11-14';
  const d15 = '2099-11-15';
  const d20 = '2099-11-20';
  // Tanggal setelah d15 agar nomor baru (maks + 1) tetap kronologis.
  const d01 = '2099-12-01';
  const d02 = '2099-12-02';
  const dibuat = { nomor: [], keluar: [], khusus: [] };
  const [kepala] = await query('SELECT last_hash FROM letter_audit_heads WHERE id = 1');
  const hashAwal = kepala ? String(kepala.last_hash || '') : '';

  const terbitkan = (tanggal, overrides = {}) =>
    buatSuratKeluarBernomor({
      jenisId,
      bidangKode: kodeBidang,
      tanggal,
      payload: {
        jenisId: String(jenisId),
        tglSurat: tanggal,
        bidangPembuat: kodeBidang,
        tujuan: 'Uji tanggal',
        hal: 'Uji tanggal',
        isiRingkas: 'Uji tanggal',
        sifat: 'biasa',
        tandaTangan: 'BASAH',
        aksesBidang: [],
        ...overrides
      },
      aktor
    });

  const pratinjau = (tanggal) =>
    tersediaNomor({ menu: 'SURAT_KELUAR', jenisId, bidangKode: kodeBidang, tanggal });

  const catat = (surat) => {
    dibuat.keluar.push(surat.id);
    dibuat.nomor.push(surat.letterNumberId);
    return surat;
  };

  const seqDari = (surat) => Number(String(surat.noSurat).split('/')[1]);

  try {
    // Skenario 1-3: lima nomor terbit pada 14 Nov 2099, nomor 1 dan 3 dibatalkan.
    const lima = [];
    for (let i = 0; i < 5; i += 1) lima.push(catat(await terbitkan(d14)));
    assert.deepEqual(lima.map(seqDari), [1, 2, 3, 4, 5]);
    await voidNomor({ letterNumberId: lima[0].letterNumberId, reason: 'Uji batal 1', aktor });
    await voidNomor({ letterNumberId: lima[2].letterNumberId, reason: 'Uji batal 3', aktor });

    // Pratinjau berulang tidak boleh membuat baris nomor.
    const [hitungAwal] = await query(
      'SELECT COUNT(*) AS jumlah FROM letter_numbers WHERE menu = ? AND tahun = ?',
      ['SURAT_KELUAR', tahun]
    );
    await pratinjau(d14);
    await pratinjau(d14);
    const [hitungAkhir] = await query(
      'SELECT COUNT(*) AS jumlah FROM letter_numbers WHERE menu = ? AND tahun = ?',
      ['SURAT_KELUAR', tahun]
    );
    assert.equal(Number(hitungAkhir.jumlah), Number(hitungAwal.jumlah), 'pratinjau tidak boleh menyimpan nomor');

    // Skenario 1: Tanggal Surat 14 Nov -> 1, 3, lalu 6.
    const p14 = await pratinjau(d14);
    assert.deepEqual(p14.items.map((item) => item.seq), [1, 3]);
    assert.equal(p14.kecilTersedia, 1);
    assert.equal(p14.berikutnya, 6);

    // Skenario 2: Tanggal Surat 15 Nov -> 1 dan 3 tidak tersedia, lanjut 6.
    const p15 = await pratinjau(d15);
    assert.deepEqual(p15.items.map((item) => item.seq), []);
    assert.equal(p15.kecilTersedia, 6);

    // Skenario 3: tanggal sistem (hari ini) tidak dipakai; 14 Nov tetap tersedia.
    const p14Lagi = await pratinjau(d14);
    assert.deepEqual(p14Lagi.items.map((item) => item.seq), [1, 3]);

    // Skenario 6: mengubah Tanggal Surat menghitung ulang pratinjau.
    assert.notDeepEqual(
      p14.items.map((item) => item.seq),
      p15.items.map((item) => item.seq)
    );

    // Skenario 7: dua penyimpanan bersamaan pada tanggal yang sama.
    const [k1, k2] = await Promise.all([terbitkan(d15), terbitkan(d15)]);
    catat(k1);
    catat(k2);
    assert.notEqual(k1.noSurat, k2.noSurat);
    assert.deepEqual([seqDari(k1), seqDari(k2)].sort((a, b) => a - b), [6, 7]);

    // Skenario 4-5: nomor bolong pada 1 Des 2099 hanya tersedia untuk 1 Des.
    const tiga = [];
    for (let i = 0; i < 3; i += 1) tiga.push(catat(await terbitkan(d01)));
    assert.deepEqual(tiga.map(seqDari), [8, 9, 10]);
    const tengah = tiga[1];
    await query('DELETE FROM surat_keluar_akses_bidang WHERE surat_keluar_id = ?', [tengah.id]);
    await query('DELETE FROM surat_keluar WHERE id = ?', [tengah.id]);
    await query('DELETE FROM letter_audit_log WHERE letter_id = ?', [tengah.letterNumberId]);
    await query('DELETE FROM letter_idempotency WHERE letter_id = ?', [tengah.letterNumberId]);
    await query('DELETE FROM letter_numbers WHERE id = ?', [tengah.letterNumberId]);

    const p01 = await pratinjau(d01);
    assert.deepEqual(p01.items.map((item) => item.seq), [9]);
    const p02 = await pratinjau(d02);
    assert.deepEqual(p02.items.map((item) => item.seq), []);
    assert.equal(p02.kecilTersedia, 11);

    // Skenario 8: SK nomor 3 batal tetap tersedia pada tanggal lain di tahun yang sama.
    const sk = [];
    for (let i = 0; i < 3; i += 1) {
      const surat = await buatSuratKhusus(
        'SK',
        { jenisId, tentang: `Uji SK ${i + 1}`, tanggal: d14, keterangan: '' },
        aktor
      );
      dibuat.khusus.push(surat.id);
      dibuat.nomor.push(surat.letterNumberId);
      sk.push(surat);
    }
    assert.match(sk[2].nomor, /\/3\/BKPSDMD\/2099$/);
    await batalkanSuratKhusus('SK', sk[2].id, 'Uji batal SK 3', aktor);
    const skUlang = await buatSuratKhusus(
      'SK',
      { jenisId, tentang: 'Uji SK ulang', tanggal: d20, keterangan: '' },
      aktor
    );
    dibuat.khusus.push(skUlang.id);
    dibuat.nomor.push(skUlang.letterNumberId);
    assert.equal(skUlang.nomor, sk[2].nomor);

    // Skenario 9: SE memakai urutan tahun dari Tanggal SE yang diinput.
    const se1 = await buatSuratKhusus(
      'SE',
      { tentang: 'Uji SE 2099', tanggal: '2099-12-05', keterangan: '' },
      aktor
    );
    dibuat.khusus.push(se1.id);
    dibuat.nomor.push(se1.letterNumberId);
    assert.equal(se1.nomor, '1 TAHUN 2099');
    await batalkanSuratKhusus('SE', se1.id, 'Uji batal SE', aktor);
    const se2 = await buatSuratKhusus(
      'SE',
      { tentang: 'Uji SE ulang', tanggal: '2099-12-06', keterangan: '' },
      aktor
    );
    dibuat.khusus.push(se2.id);
    dibuat.nomor.push(se2.letterNumberId);
    assert.equal(se2.nomor, se1.nomor);
    const se3 = await buatSuratKhusus(
      'SE',
      { tentang: 'Uji SE 2100', tanggal: '2100-01-05', keterangan: '' },
      aktor
    );
    dibuat.khusus.push(se3.id);
    dibuat.nomor.push(se3.letterNumberId);
    assert.equal(se3.nomor, '1 TAHUN 2100');
  } finally {
    const idsKhusus = [...new Set(dibuat.khusus.filter(Boolean))];
    const idsKeluar = [...new Set(dibuat.keluar.filter(Boolean))];
    const idsNomor = [...new Set(dibuat.nomor.filter(Boolean))];
    if (idsKhusus.length) {
      const tanda = idsKhusus.map(() => '?').join(',');
      await query(`DELETE FROM surat_khusus WHERE id IN (${tanda})`, idsKhusus);
    }
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
    await query('DELETE FROM letter_counters WHERE tahun IN (?, ?)', [tahun, 2100]);
    await query('UPDATE letter_audit_heads SET last_hash = ? WHERE id = 1', [hashAwal]);
  }
});

after(async () => {
  if (!aktif) return;
  const { tutupPool } = await import('../src/config/db.js');
  await tutupPool();
});
