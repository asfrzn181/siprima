// Menjalankan migrasi SQL dari db/migrations.
// Pakai:
//   node scripts/migrate.js up
//   node scripts/migrate.js down
//   node scripts/migrate.js down --all
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { connectionConfig } from '../src/config/db.js';

const akar = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folderMigrasi = path.join(akar, 'db', 'migrations');
const PENANDA_UP = '-- +migrate Up';
const PENANDA_DOWN = '-- +migrate Down';

const tulis = (teks) => process.stdout.write(`${teks}\n`);

const daftarMigrasi = async () =>
  (await fs.readdir(folderMigrasi)).filter((nama) => nama.endsWith('.sql')).sort();

const pisahMigrasi = (isi, nama) => {
  const posisiUp = isi.indexOf(PENANDA_UP);
  const posisiDown = isi.indexOf(PENANDA_DOWN);
  if (posisiUp === -1 || posisiDown === -1 || posisiDown < posisiUp) {
    throw new Error(`${nama} harus memiliki ${PENANDA_UP} dan ${PENANDA_DOWN}.`);
  }
  return {
    up: isi.slice(posisiUp + PENANDA_UP.length, posisiDown).trim(),
    down: isi.slice(posisiDown + PENANDA_DOWN.length).trim()
  };
};

const pastikanTabelMigrasi = (koneksi) =>
  koneksi.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name VARCHAR(200) NOT NULL,
       applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
       PRIMARY KEY (name)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

const jalankanUp = async (koneksi, berkas) => {
  const [baris] = await koneksi.query('SELECT name FROM schema_migrations ORDER BY name');
  const sudah = new Set(baris.map((item) => item.name));
  let jumlah = 0;
  for (const nama of berkas) {
    if (sudah.has(nama)) continue;
    const { up } = pisahMigrasi(await fs.readFile(path.join(folderMigrasi, nama), 'utf8'), nama);
    tulis(`up   ${nama}`);
    await koneksi.query(up);
    await koneksi.query('INSERT INTO schema_migrations (name) VALUES (?)', [nama]);
    jumlah += 1;
  }
  tulis(jumlah ? `${jumlah} migrasi diterapkan.` : 'Tidak ada migrasi baru.');
};

const jalankanDown = async (koneksi, semua) => {
  const [baris] = await koneksi.query('SELECT name FROM schema_migrations ORDER BY name DESC');
  const target = semua ? baris : baris.slice(0, 1);
  if (!target.length) {
    tulis('Tidak ada migrasi untuk dibatalkan.');
    return;
  }
  for (const { name } of target) {
    const { down } = pisahMigrasi(await fs.readFile(path.join(folderMigrasi, name), 'utf8'), name);
    tulis(`down ${name}`);
    await koneksi.query(down);
    await koneksi.query('DELETE FROM schema_migrations WHERE name = ?', [name]);
  }
};

const utama = async () => {
  const arah = process.argv[2] || 'up';
  const semua = process.argv.includes('--all');
  if (!['up', 'down'].includes(arah)) throw new Error('Arah harus "up" atau "down".');

  const koneksi = await mysql.createConnection({ ...connectionConfig, multipleStatements: true });
  try {
    await pastikanTabelMigrasi(koneksi);
    if (arah === 'up') await jalankanUp(koneksi, await daftarMigrasi());
    else await jalankanDown(koneksi, semua);
  } finally {
    await koneksi.end();
  }
};

utama().catch((error) => {
  process.stderr.write(`Migrasi gagal: ${error.message}\n`);
  process.exit(1);
});
