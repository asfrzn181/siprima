import assert from 'node:assert/strict';
import test from 'node:test';
import { JOBS, daftarNamaJob } from '../src/jobs/index.js';
import { skemaDaftarRun, skemaNamaJob, skemaRunId } from '../src/validators/cron.validator.js';

test('registry job cron memuat empat job yang di-seed', () => {
  assert.deepEqual(daftarNamaJob().sort(), [
    'audit_data',
    'cleanup_expired_reservations',
    'cleanup_orphan_uploads',
    'export_snapshot'
  ]);
  for (const nama of daftarNamaJob()) {
    assert.equal(typeof JOBS[nama], 'function', nama);
  }
});

test('validator nama job menolak nilai kosong', () => {
  assert.equal(skemaNamaJob.safeParse({ job_name: '' }).success, false);
  assert.equal(skemaNamaJob.safeParse({ job_name: 'audit_data' }).success, true);
});

test('validator run id hanya menerima UUID', () => {
  assert.equal(skemaRunId.safeParse({ run_id: 'bukan-uuid' }).success, false);
  assert.equal(
    skemaRunId.safeParse({ run_id: '3f1c2a9e-1b2c-4d5e-8f90-123456789abc' }).success,
    true
  );
});

test('validator daftar run membatasi limit', () => {
  assert.equal(skemaDaftarRun.safeParse({ limit: '0' }).success, false);
  assert.equal(skemaDaftarRun.safeParse({ limit: '501' }).success, false);
  assert.equal(skemaDaftarRun.safeParse({ limit: '25' }).success, true);
  assert.equal(skemaDaftarRun.safeParse({}).success, true);
});
