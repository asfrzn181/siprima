// Seeder idempoten: peran, izin, admin awal, master referensi, pengaturan, cron.
// Pakai:
//   ADMIN_EMAIL=admin@dinas.go.id ADMIN_PASSWORD='...' node scripts/seed.js
// Variabel opsional: ADMIN_NAMA, BCRYPT_ROUNDS, SEED_BIDANG_JSON,
//                    CRON_SEED_KEY, CRON_SEED_NAME, CRON_SEED_ALLOWED_JOBS.
import bcrypt from 'bcryptjs';
import { withTransaction, query, tutupPool } from '../src/config/db.js';
import { IZIN_LABEL, IZIN_PER_PERAN, PERAN } from '../src/constants/index.js';

const tulis = (teks) => process.stdout.write(`${teks}\n`);
const LABEL_PERAN = {
  admin: 'Administrator',
  operator: 'Operator/Staf',
  pimpinan: 'Pimpinan/Viewer',
  bidang: 'Bidang'
};

const seedPeran = async (koneksi) => {
  for (const nama of Object.values(PERAN)) {
    await koneksi.query(
      `INSERT INTO roles (name, label) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE label = ?`,
      [nama, LABEL_PERAN[nama] || nama, LABEL_PERAN[nama] || nama]
    );
  }
};

const seedIzin = async (koneksi) => {
  for (const [nama, label] of Object.entries(IZIN_LABEL)) {
    await koneksi.query(
      `INSERT INTO permissions (name, label) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE label = ?`,
      [nama, label, label]
    );
  }

  for (const [peran, daftar] of Object.entries(IZIN_PER_PERAN)) {
    const [[role]] = await koneksi.query('SELECT id FROM roles WHERE name = ?', [peran]);
    if (!role) continue;
    await koneksi.query('DELETE FROM role_permissions WHERE role_id = ?', [role.id]);
    for (const izin of daftar) {
      const [[perm]] = await koneksi.query('SELECT id FROM permissions WHERE name = ?', [izin]);
      if (!perm) continue;
      await koneksi.query(
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [role.id, perm.id]
      );
    }
  }
};

const seedAdmin = async (koneksi) => {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  const nama = String(process.env.ADMIN_NAMA || 'Administrator').trim();
  if (!email || !password) {
    tulis('Lewati admin awal: isi ADMIN_EMAIL dan ADMIN_PASSWORD.');
    return;
  }
  if (password.length < 8) throw new Error('ADMIN_PASSWORD minimal 8 karakter.');

  const [[role]] = await koneksi.query('SELECT id FROM roles WHERE name = ?', [PERAN.ADMIN]);
  const putaran = Number(process.env.BCRYPT_ROUNDS || 12);
  const hash = await bcrypt.hash(password, putaran);

  await koneksi.query(
    `INSERT INTO users (email, password_hash, nama, role_id, bidang_kode, aktif)
     VALUES (?, ?, ?, ?, NULL, 1)
     ON DUPLICATE KEY UPDATE nama = ?, role_id = ?, aktif = 1`,
    [email, hash, nama, role.id, nama, role.id]
  );
  tulis(`Admin awal siap: ${email}`);
};

const seedBidang = async (koneksi) => {
  const [[{ jumlah }]] = await koneksi.query('SELECT COUNT(*) AS jumlah FROM master_bidang');
  if (Number(jumlah) > 0) return;

  const dariEnv = String(process.env.SEED_BIDANG_JSON || '').trim();
  const daftar = dariEnv
    ? JSON.parse(dariEnv)
    : [{ kode: 'SEK', nama: 'Sekretariat', aktif: true }];
  if (!Array.isArray(daftar) || !daftar.length) return;

  for (const item of daftar) {
    const kode = String(item.kode || '').trim();
    const nama = String(item.nama || '').trim();
    if (!kode || !nama) continue;
    await koneksi.query(
      'INSERT IGNORE INTO master_bidang (kode, nama, aktif) VALUES (?, ?, ?)',
      [kode, nama, item.aktif === false ? 0 : 1]
    );
  }
  tulis(`Master bidang awal: ${daftar.length} baris.`);
};

const seedNomor = async (koneksi) => {
  const [[{ jumlah }]] = await koneksi.query('SELECT COUNT(*) AS jumlah FROM master_nomor');
  if (Number(jumlah) > 0) return;

  const daftar = [
    {
      nama: 'Surat Keputusan',
      golongan: 'SK',
      kode: '800',
      reset_tahunan: 1,
      urutan_per_bidang: 0,
      aktif: 1
    },
    {
      nama: 'Surat Edaran',
      golongan: 'SE',
      kode: 'SE',
      reset_tahunan: 1,
      urutan_per_bidang: 0,
      aktif: 1
    },
    {
      nama: 'Surat lainnya',
      golongan: 'LAINNYA',
      kode: '005',
      reset_tahunan: 1,
      urutan_per_bidang: 0,
      aktif: 1
    }
  ];

  for (const item of daftar) {
    await koneksi.query(
      `INSERT INTO master_nomor
         (nama, golongan, kode, reset_tahunan, urutan_per_bidang, aktif)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        item.nama,
        item.golongan,
        item.kode,
        item.reset_tahunan,
        item.urutan_per_bidang,
        item.aktif
      ]
    );
  }
  tulis(`Master nomor awal: ${daftar.length} baris.`);
};

const seedPengaturan = async (koneksi) => {
  await koneksi.query(
    `INSERT IGNORE INTO pengaturan
       (id, nama_dinas, apps_script_url, numbering_scope, reservation_minutes)
     VALUES (1, ?, '', 'GLOBAL_PER_TAHUN', 15)`,
    [String(process.env.SEED_NAMA_DINAS || '')]
  );
};

const seedCron = async (koneksi) => {
  const jobs = [
    ['cleanup_expired_reservations', 'Harian 01:00', { limit: 200 }],
    ['cleanup_orphan_uploads', 'Mingguan Minggu 02:00', { olderThanDays: 30 }],
    ['export_snapshot', 'Harian 03:00', { tables: 'surat_masuk,surat_keluar,letter_numbers' }],
    ['audit_data', 'Mingguan Senin 03:00', {}]
  ];
  for (const [nama, catatan, config] of jobs) {
    await koneksi.query(
      `INSERT IGNORE INTO cron_jobs (job_name, enabled, schedule_note, config)
       VALUES (?, 1, ?, ?)`,
      [nama, catatan, JSON.stringify(config)]
    );
  }

  const kunci = String(process.env.CRON_SEED_KEY || '').trim();
  if (!kunci) {
    tulis('Lewati cron API key: isi CRON_SEED_KEY bila ingin membuat kunci awal.');
    return;
  }
  const { createHash } = await import('node:crypto');
  const hash = createHash('sha256').update(kunci).digest('hex');
  const nama = String(process.env.CRON_SEED_NAME || 'Google Apps Script').trim();
  const izinJobs = String(process.env.CRON_SEED_ALLOWED_JOBS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  await koneksi.query(
    `INSERT IGNORE INTO cron_api_keys (name, key_hash, allowed_jobs)
     VALUES (?, ?, ?)`,
    [nama, hash, JSON.stringify(izinJobs.length ? izinJobs : jobs.map((item) => item[0]))]
  );
  tulis('Cron API key awal dibuat.');
};

const utama = async () => {
  await withTransaction(async (koneksi) => {
    await seedPeran(koneksi);
    await seedIzin(koneksi);
    await seedAdmin(koneksi);
    await seedBidang(koneksi);
    await seedNomor(koneksi);
    await seedPengaturan(koneksi);
    await seedCron(koneksi);
  });
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM users');
  tulis(`Selesai. Total pengguna: ${total}.`);
  await tutupPool();
};

utama().catch((error) => {
  process.stderr.write(`Seeder gagal: ${error.message}\n`);
  process.exit(1);
});
