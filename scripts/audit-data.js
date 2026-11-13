// Pemeriksaan data read-only terhadap MySQL. Tidak mengubah data apa pun.
// Pakai: node scripts/audit-data.js
import { query, tutupPool } from '../src/config/db.js';

const tulis = (teks) => process.stdout.write(`${teks}\n`);

const hitung = async (tabel) => {
  const [row] = await query(`SELECT COUNT(*) AS jumlah FROM ${tabel}`);
  return Number(row.jumlah);
};

const jalankan = async () => {
  const tabel = [
    'users',
    'master_bidang',
    'master_nomor',
    'surat_masuk',
    'surat_keluar',
    'letter_numbers',
    'audit_log'
  ];

  tulis('Jumlah baris:');
  for (const nama of tabel) {
    tulis(`- ${nama}: ${await hitung(nama)}`);
  }

  const [peranAneh] = await query(
    `SELECT COUNT(*) AS jumlah FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
      WHERE r.id IS NULL`
  );
  const [bidangTanpaKode] = await query(
    `SELECT COUNT(*) AS jumlah FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE r.name = 'bidang' AND (u.bidang_kode IS NULL OR u.bidang_kode = '')`
  );
  tulis(`Pengguna tanpa peran valid: ${Number(peranAneh.jumlah)}`);
  tulis(`Pengguna bidang tanpa kode bidang: ${Number(bidangTanpaKode.jumlah)}`);

  const [tanpaRegister] = await query(
    'SELECT COUNT(*) AS jumlah FROM surat_keluar WHERE letter_number_id IS NULL'
  );
  tulis(`Surat keluar tanpa letter_number_id: ${Number(tanpaRegister.jumlah)}`);

  const [reserved] = await query(
    "SELECT COUNT(*) AS jumlah FROM letter_numbers WHERE status = 'RESERVED'"
  );
  const [tanpaSurat] = await query(
    "SELECT COUNT(*) AS jumlah FROM letter_numbers WHERE status = 'ISSUED' AND letter_id IS NULL"
  );
  tulis(`Nomor berstatus RESERVED: ${Number(reserved.jumlah)}`);
  tulis(`Nomor ISSUED tanpa referensi surat: ${Number(tanpaSurat.jumlah)}`);

  await tutupPool();
};

jalankan().catch((error) => {
  process.stderr.write(`Audit gagal: ${error.message}\n`);
  process.exit(1);
});
