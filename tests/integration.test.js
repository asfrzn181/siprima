// Uji integrasi penuh terhadap MySQL asli.
// Jalankan dengan: RUN_MYSQL_TESTS=1 npm test
// Butuh .env valid (DB_*) dan TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD.
// Opsional: TEST_BIDANG_EMAIL/TEST_BIDANG_PASSWORD untuk uji 403 dan IDOR.
import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import request from 'supertest';

const aktif = process.env.RUN_MYSQL_TESTS === '1';
const emailAdmin = process.env.TEST_ADMIN_EMAIL || '';
const sandiAdmin = process.env.TEST_ADMIN_PASSWORD || '';
const emailBidang = process.env.TEST_BIDANG_EMAIL || '';
const sandiBidang = process.env.TEST_BIDANG_PASSWORD || '';

const lewati = aktif ? false : 'Set RUN_MYSQL_TESTS=1 dan kredensial uji untuk menjalankan.';

const buatAgen = async (app, email, password) => {
  const agen = request.agent(app);
  const csrf = await agen.get('/api/auth/csrf');
  const masuk = await agen
    .post('/api/auth/login')
    .set('x-csrf-token', csrf.body.data.token)
    .send({ email, password });
  assert.equal(masuk.status, 200, masuk.body.message);
  return { agen, token: csrf.body.data.token };
};

const suratContoh = () => ({
  tglTerima: '2026-01-05T08:00:00+07:00',
  tglSurat: '2026-01-04T08:00:00+07:00',
  noSurat: `TEST-${Date.now()}`,
  asal: 'Penguji Integrasi',
  hal: 'Uji CRUD surat masuk',
  isiRingkas: 'Dokumen uji otomatis. Aman dihapus.',
  sifat: 'biasa',
  aksesBidang: []
});

test('admin dapat login dan melihat daftar surat masuk', { skip: lewati }, async () => {
  const { app } = await import('../src/app.js');
  const { agen } = await buatAgen(app, emailAdmin, sandiAdmin);
  const respons = await agen.get('/api/surat-masuk?page=1&limit=5');
  assert.equal(respons.status, 200);
  assert.equal(respons.body.status, 'success');
  assert.ok(Array.isArray(respons.body.data.items));
  assert.ok(respons.body.data.pagination.page >= 1);
});

test('CRUD surat masuk lewat API', { skip: lewati }, async () => {
  const { app } = await import('../src/app.js');
  const { agen, token } = await buatAgen(app, emailAdmin, sandiAdmin);
  const payload = suratContoh();

  const buat = await agen.post('/api/surat-masuk').set('x-csrf-token', token).send(payload);
  assert.equal(buat.status, 201, buat.body.message);
  const id = buat.body.data.id;
  assert.ok(id);

  try {
    const ambil = await agen.get(`/api/surat-masuk/${encodeURIComponent(id)}`);
    assert.equal(ambil.status, 200);
    assert.equal(ambil.body.data.noSurat, payload.noSurat);

    const ubah = await agen
      .put(`/api/surat-masuk/${encodeURIComponent(id)}`)
      .set('x-csrf-token', token)
      .send({ ...payload, hal: 'Perihal setelah diubah' });
    assert.equal(ubah.status, 200);
    assert.equal(ubah.body.data.hal, 'Perihal setelah diubah');

    const cari = await agen.get(`/api/surat-masuk?search=${encodeURIComponent(payload.noSurat)}`);
    assert.equal(cari.status, 200);
    assert.equal(
      cari.body.data.items.some((item) => item.id === id),
      true
    );
  } finally {
    const { query } = await import('../src/config/db.js');
    await query('DELETE FROM surat_masuk WHERE id = ?', [id]);
  }
});

test('ID surat yang tidak ada / ditukar tidak membocorkan data', { skip: lewati }, async () => {
  const { app } = await import('../src/app.js');
  const { agen } = await buatAgen(app, emailAdmin, sandiAdmin);
  const respons = await agen.get('/api/surat-masuk/999999999');
  assert.equal(respons.status, 404);
  assert.equal(respons.body.data, null);

  const keluar = await agen.get('/api/surat-keluar/999999999');
  assert.equal(keluar.status, 404);
  assert.equal(keluar.body.data, null);
});

test(
  'peran bidang ditolak 403 pada endpoint admin dan pembuatan surat masuk',
  { skip: lewati || !emailBidang },
  async () => {
    const { app } = await import('../src/app.js');
    const { agen, token } = await buatAgen(app, emailBidang, sandiBidang);

    const pengguna = await agen.get('/api/users');
    assert.equal(pengguna.status, 403);
    assert.equal(pengguna.body.errors[0].code, 'AKSES_DITOLAK');

    const tambah = await agen.post('/api/surat-masuk').set('x-csrf-token', token).send(suratContoh());
    assert.equal(tambah.status, 403);

    const audit = await agen.get('/api/audit');
    assert.equal(audit.status, 403);

    const dashboard = await agen.get('/api/dashboard');
    assert.equal(dashboard.status, 403);
  }
);

test('cron health dapat diakses tanpa kunci', { skip: lewati }, async () => {
  const { app } = await import('../src/app.js');
  const respons = await request(app).get('/api/cron/health');
  assert.equal(respons.status, 200);
  assert.equal(respons.body.data.status, 'ok');
});

test('cron jobs menolak permintaan tanpa kunci', { skip: lewati }, async () => {
  const { app } = await import('../src/app.js');
  const respons = await request(app).get('/api/cron/jobs');
  assert.equal(respons.status, 401);
  assert.equal(respons.body.errors[0].code, 'KUNCI_CRON_TIDAK_ADA');
});

after(async () => {
  if (!aktif) return;
  const { tutupPool } = await import('../src/config/db.js');
  await tutupPool();
});
