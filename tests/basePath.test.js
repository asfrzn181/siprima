process.env.NODE_ENV = 'test';
process.env.BASE_PATH = '/siprima';

import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

const { app } = await import('../src/app.js');

test('base path: halaman statis dilayani dari subfolder', async () => {
  const respons = await request(app).get('/siprima/');
  assert.equal(respons.status, 200);
  assert.match(respons.headers['content-type'], /text\/html/);
  assert.match(respons.text, /<!doctype html>/i);
});

test('base path: subfolder tanpa garis miring dialihkan ke versi bergaris', async () => {
  const respons = await request(app).get('/siprima');
  assert.equal(respons.status, 301);
  assert.equal(respons.headers.location, '/siprima/');
});

test('base path: API tetap berfungsi dan 404 API berbentuk JSON', async () => {
  const health = await request(app).get('/siprima/api/cron/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.data.status, 'ok');

  const hilang = await request(app).get('/siprima/api/tidak-ada');
  assert.equal(hilang.status, 404);
  assert.equal(hilang.body.status, 'error');
  assert.equal(hilang.body.errors[0].code, 'TIDAK_DITEMUKAN');
});
