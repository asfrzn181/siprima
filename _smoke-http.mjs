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

  // Reservasi lewat HTTP.
  const reservasi = await agen.post('/api/nomor/reservasi').set(headers).send({
    menu: 'SURAT_KELUAR',
    jenisId: String(nomor.id),
    bidangKode: bidang.kode,
    tanggal,
    idempotencyKey: `http-uji-${Date.now()}`
  });
  cek('POST /api/nomor/reservasi', reservasi.status === 201 && reservasi.body.data.id, `status ${reservasi.status}`);
  if (reservasi.status !== 201) throw new Error(JSON.stringify(reservasi.body));
  const reservasiId = reservasi.body.data.id;
  bersih.nomor.push(reservasiId);
  cek('nomor hasil reservasi berpola', /^\d+\/\d+\/BKPSDMD\/[A-Z]+\/\d{4}$/.test(reservasi.body.data.full_number), reservasi.body.data.full_number);

  // Terbitkan surat keluar.
  const keluar = await agen.post('/api/surat-keluar').set(headers).send({
    jenisId: String(nomor.id),
    reservationId: String(reservasiId),
    tglSurat: tanggal,
    bidangPembuat: bidang.kode,
    tujuan: 'Uji HTTP',
    hal: 'Uji HTTP',
    isiRingkas: 'Uji HTTP',
    sifat: 'biasa',
    tandaTangan: 'BASAH',
    aksesBidang: [],
    fileUrl: ''
  });
  cek('POST /api/surat-keluar', keluar.status === 201, `status ${keluar.status} ${keluar.body.message || ''}`);
  if (keluar.status === 201) bersih.keluar.push(keluar.body.data.id);

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

  // seqPilihan sudah dihapus: nomor selalu otomatis memakai urutan terkecil
  // yang tersedia, sehingga nilai seqPilihan dari klien lama harus diabaikan.
  const abaikanPilihan = await agen.post('/api/nomor/reservasi').set(headers).send({
    menu: 'SURAT_KELUAR',
    jenisId: String(nomor.id),
    bidangKode: bidang.kode,
    tanggal,
    seqPilihan: 999999,
    idempotencyKey: `http-uji-abaikan-${Date.now()}`
  });
  cek(
    'seqPilihan diabaikan dan nomor otomatis tetap dibuat',
    abaikanPilihan.status === 201 && abaikanPilihan.body.data.id,
    `status ${abaikanPilihan.status}`
  );
  if (abaikanPilihan.status === 201) bersih.nomor.push(abaikanPilihan.body.data.id);
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
