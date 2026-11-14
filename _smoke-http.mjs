import 'dotenv/config';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { query } from './src/config/db.js';

const { app } = await import('./src/app.js');
const [admin] = await query("SELECT id, email, password_hash FROM users WHERE email = 'admin@dinas.go.id'");
if (!admin) {
  console.error('User admin tidak ditemukan.');
  process.exit(1);
}
const sandiUji = 'SmokeTest123!';
await query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(sandiUji, 10), admin.id]);

const agen = request.agent(app);
const csrf = await agen.get('/api/auth/csrf');
const token = csrf.body.data.token;
const masuk = await agen
  .post('/api/auth/login')
  .set('x-csrf-token', token)
  .send({ email: admin.email, password: sandiUji });
console.log('login:', masuk.status, masuk.body.message);
if (masuk.status !== 200) {
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [admin.password_hash, admin.id]);
  process.exit(1);
}

const hasil = [];
const cek = (label, kondisi, info = '') => {
  hasil.push({ label, lulus: Boolean(kondisi) });
  console.log(`${kondisi ? 'OK  ' : 'GAGAL'} ${label}${info ? ` (${info})` : ''}`);
};

const headers = { 'x-csrf-token': token };
const tanggal = new Date().toISOString();
const bersih = { nomor: [], khusus: [], keluar: [] };

try {
  const [nomor] = await query("SELECT id, kode FROM master_nomor WHERE aktif = 1 ORDER BY (golongan='LAINNYA') DESC, id LIMIT 1");
  const [bidang] = await query('SELECT kode FROM master_bidang WHERE aktif = 1 ORDER BY id LIMIT 1');

  // Daftar nomor tersedia.
  const tersedia = await agen
    .get(`/api/nomor/tersedia?menu=SURAT_KELUAR&jenisId=${nomor.id}&bidangKode=${bidang.kode}&tanggal=${encodeURIComponent(tanggal)}`);
  cek('GET /api/nomor/tersedia', tersedia.status === 200 && Array.isArray(tersedia.body.data.items), `status ${tersedia.status}`);

  // Pratinjau nomor bersifat read-only: tidak boleh ada baris baru.
  const tahun = new Date(tanggal).getUTCFullYear();
  const [sebelumPratinjau] = await query(
    'SELECT COUNT(*) AS jumlah FROM letter_numbers WHERE menu = ? AND tahun = ?',
    ['SURAT_KELUAR', tahun]
  );
  const pratinjau = await agen.post('/api/nomor/pratinjau').set(headers).send({
    menu: 'SURAT_KELUAR',
    jenisId: String(nomor.id),
    bidangKode: bidang.kode,
    tanggal
  });
  const [sesudahPratinjau] = await query(
    'SELECT COUNT(*) AS jumlah FROM letter_numbers WHERE menu = ? AND tahun = ?',
    ['SURAT_KELUAR', tahun]
  );
  cek('POST /api/nomor/pratinjau', pratinjau.status === 200, `status ${pratinjau.status}`);
  cek(
    'pratinjau tidak menyimpan nomor',
    Number(sesudahPratinjau.jumlah) === Number(sebelumPratinjau.jumlah),
    `${sebelumPratinjau.jumlah} -> ${sesudahPratinjau.jumlah}`
  );

  // Terbitkan surat keluar langsung tanpa reservasi.
  const keluar = await agen.post('/api/surat-keluar').set(headers).send({
    jenisId: String(nomor.id),
    tglSurat: tanggal,
    bidangPembuat: bidang.kode,
    tujuan: 'Uji HTTP',
    hal: 'Uji HTTP',
    isiRingkas: 'Uji HTTP',
    sifat: 'biasa',
    tandaTangan: 'BASAH',
    aksesBidang: [],
    noSurat: '999/999/BKPSDMD/ZZZ/1999'
  });
  cek('POST /api/surat-keluar', keluar.status === 201, `status ${keluar.status} ${keluar.body.message || ''}`);
  if (keluar.status === 201) {
    bersih.keluar.push(keluar.body.data.id);
    bersih.nomor.push(keluar.body.data.letterNumberId);
    cek(
      'nomor surat keluar berpola',
      /^\d+\/\d+\/BKPSDMD\/[A-Z]+\/\d{4}$/.test(keluar.body.data.noSurat || ''),
      keluar.body.data.noSurat
    );
    cek(
      'nomor tidak dapat dipaksa dari klien',
      keluar.body.data.noSurat !== '999/999/BKPSDMD/ZZZ/1999',
      keluar.body.data.noSurat
    );
  }

  // SK lewat HTTP.
  const sk = await agen.post('/api/sk').set(headers).send({
    jenisId: String(nomor.id),
    tentang: 'Uji HTTP SK',
    tanggal,
    keterangan: ''
  });
  cek('POST /api/sk', sk.status === 201, `status ${sk.status} ${sk.body.message || ''}`);
  if (sk.status === 201) {
    bersih.khusus.push(sk.body.data.id);
    bersih.nomor.push(sk.body.data.letterNumberId);
    cek('nomor SK berpola', /^\d+\/\d+\/BKPSDMD\/\d{4}$/.test(sk.body.data.nomor), sk.body.data.nomor);

    const tersediaSk = await agen.get(`/api/sk/nomor-tersedia?jenisId=${nomor.id}&tanggal=${encodeURIComponent(tanggal)}`);
    cek('GET /api/sk/nomor-tersedia', tersediaSk.status === 200 && Array.isArray(tersediaSk.body.data.items), `status ${tersediaSk.status}`);

    const batal = await agen.post(`/api/sk/${sk.body.data.id}/batal`).set(headers).send({ alasan: 'Uji HTTP batal' });
    cek('POST /api/sk/:id/batal', batal.status === 200 && batal.body.data.status === 'Dibatalkan', `status ${batal.status}`);

    const batalTanpaAlasan = await agen.post(`/api/sk/${sk.body.data.id}/batal`).set(headers).send({});
    cek('batal tanpa alasan ditolak 400', batalTanpaAlasan.status === 400, `status ${batalTanpaAlasan.status}`);
  }

  // SE lewat HTTP.
  const se = await agen.post('/api/se').set(headers).send({ tentang: 'Uji HTTP SE', tanggal, keterangan: '' });
  cek('POST /api/se', se.status === 201, `status ${se.status} ${se.body.message || ''}`);
  if (se.status === 201) {
    bersih.khusus.push(se.body.data.id);
    bersih.nomor.push(se.body.data.letterNumberId);
    cek('nomor SE berpola', /^\d+ TAHUN \d{4}$/.test(se.body.data.nomor), se.body.data.nomor);
  }

} catch (error) {
  console.error('ERROR', error?.stack || error);
} finally {
  const idsKhusus = [...new Set(bersih.khusus.filter(Boolean))];
  const idsNomor = [...new Set(bersih.nomor.filter(Boolean))];
  const idsKeluar = [...new Set(bersih.keluar.filter(Boolean))];
  if (idsKeluar.length) {
    await query(`DELETE FROM surat_keluar_akses_bidang WHERE surat_keluar_id IN (${idsKeluar.map(() => '?').join(',')})`, idsKeluar);
    await query(`DELETE FROM surat_keluar WHERE id IN (${idsKeluar.map(() => '?').join(',')})`, idsKeluar);
  }
  if (idsKhusus.length) {
    await query(`DELETE FROM surat_khusus WHERE id IN (${idsKhusus.map(() => '?').join(',')})`, idsKhusus);
  }
  if (idsNomor.length) {
    const t = idsNomor.map(() => '?').join(',');
    await query(`DELETE FROM letter_audit_log WHERE letter_id IN (${t})`, idsNomor);
    await query(`DELETE FROM letter_idempotency WHERE letter_id IN (${t})`, idsNomor);
    await query(`DELETE FROM letter_numbers WHERE id IN (${t})`, idsNomor);
  }
  const { tutupPool } = await import('./src/config/db.js');
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [admin.password_hash, admin.id]);
  await tutupPool();
  const lulus = hasil.filter((h) => h.lulus).length;
  console.log('---');
  console.log(`${lulus}/${hasil.length} pemeriksaan HTTP lulus`);
  process.exit(lulus === hasil.length ? 0 : 1);
}
