process.env.NODE_ENV = 'test';

import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

const { app } = await import('../src/app.js');

test('GET / mengembalikan halaman login dan header keamanan', async () => {
  const respons = await request(app).get('/');
  assert.equal(respons.status, 200);
  assert.match(respons.headers['content-type'], /text\/html/);
  assert.equal(respons.headers['x-content-type-options'], 'nosniff');
  assert.match(respons.headers['content-security-policy'], /default-src 'self'/);
  assert.equal(respons.headers['x-powered-by'], undefined);
});

test('endpoint API tanpa sesi mengembalikan 401 dengan bentuk JSON seragam', async () => {
  for (const jalur of [
    '/api/auth/session',
    '/api/surat-masuk',
    '/api/surat-keluar',
    '/api/sk',
    '/api/se',
    '/api/users',
    '/api/roles',
    '/api/master/asal-tujuan'
  ]) {
    const respons = await request(app).get(jalur);
    assert.equal(respons.status, 401, jalur);
    assert.equal(respons.body.status, 'error');
    assert.equal(respons.body.data, null);
    assert.ok(Array.isArray(respons.body.errors));
  }
});

test('POST tanpa token CSRF ditolak 403', async () => {
  const agen = request.agent(app);
  const csrf = await agen.get('/api/auth/csrf');
  assert.equal(csrf.status, 200);
  assert.ok(csrf.body.data.token.length >= 32);

  const respons = await agen.post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
  assert.equal(respons.status, 403);
  assert.equal(respons.body.errors[0].code, 'CSRF_TIDAK_VALID');
});

test('POST login dengan CSRF tetapi data tidak valid ditolak 400 tanpa menyentuh database', async () => {
  const agen = request.agent(app);
  const csrf = await agen.get('/api/auth/csrf');
  const respons = await agen.post('/api/auth/login').set('x-csrf-token', csrf.body.data.token).send({});
  assert.equal(respons.status, 400);
  assert.equal(respons.body.status, 'error');
  assert.ok(respons.body.errors.length >= 1);
  assert.ok(respons.body.errors[0].field);
});

test('JSON rusak menghasilkan 400', async () => {
  const respons = await request(app)
    .post('/api/auth/login')
    .set('content-type', 'application/json')
    .send('{rusak');
  assert.equal(respons.status, 400);
  assert.equal(respons.body.status, 'error');
});

test('jalur API tidak dikenal mengembalikan 404 JSON', async () => {
  const respons = await request(app).get('/api/tidak-ada');
  assert.equal(respons.status, 404);
  assert.equal(respons.body.status, 'error');
});
