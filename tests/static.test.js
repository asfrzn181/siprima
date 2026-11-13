import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const akar = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publik = path.join(akar, 'public');

const telusuri = (folder) =>
  readdirSync(folder).flatMap((nama) => {
    const lokasi = path.join(folder, nama);
    if (nama === 'vendor' || nama === 'node_modules') return [];
    return statSync(lokasi).isDirectory() ? telusuri(lokasi) : [lokasi];
  });

test('public/ tidak memuat SDK, konfigurasi, atau rahasia Firebase', () => {
  const berkas = telusuri(publik).filter((lokasi) => /\.(html|js|css|json|map)$/i.test(lokasi));
  assert.ok(berkas.length > 0);
  const terlarang = [
    /firebasejs/i,
    /firebase-config/i,
    /\bapiKey\b/,
    /\bauthDomain\b/,
    /serviceAccount/i,
    /private_key/i,
    /FIREBASE_[A-Z_]+/,
    /AIza[0-9A-Za-z_-]{20,}/,
    /-----BEGIN PRIVATE KEY-----/
  ];
  berkas.forEach((lokasi) => {
    const isi = readFileSync(lokasi, 'utf8');
    terlarang.forEach((pola) => {
      assert.equal(pola.test(isi), false, `${path.relative(akar, lokasi)} cocok dengan ${pola}`);
    });
  });
});

test('semua halaman memakai skrip lokal tanpa CDN', () => {
  const halaman = readdirSync(publik).filter((nama) => nama.endsWith('.html'));
  assert.ok(halaman.length >= 6);
  halaman.forEach((nama) => {
    const isi = readFileSync(path.join(publik, nama), 'utf8');
    assert.equal(/<script[^>]+src="https?:/i.test(isi), false, `${nama} memuat skrip CDN`);
    assert.equal(/<link[^>]+href="https?:/i.test(isi), false, `${nama} memuat stylesheet CDN`);
  });
});

test('pustaka SheetJS tersedia lokal', () => {
  const lokasi = path.join(publik, 'assets', 'vendor', 'xlsx.full.min.js');
  assert.ok(statSync(lokasi).size > 100_000);
});

test('aturan Firestore dan Storage menolak akses langsung', () => {
  for (const nama of ['firestore.rules', 'storage.rules']) {
    const isi = readFileSync(path.join(akar, nama), 'utf8');
    assert.match(isi, /allow read, write: if false;/);
  }
});
