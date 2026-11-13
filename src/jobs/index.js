import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { hapusBerkas } from '../repositories/storage.repository.js';
import { kedaluwarsakanReservasi } from '../repositories/numberingLanjutan.repository.js';

const AKTOR_SISTEM = Object.freeze({
  uid: null,
  nama: 'cron',
  profile: Object.freeze({ role: 'admin' })
});

const TABEL_SNAPSHOT = Object.freeze([
  'master_bidang',
  'master_nomor',
  'surat_masuk',
  'surat_keluar',
  'letter_numbers'
]);

const bersihkanReservasiKedaluwarsa = async () => {
  const hasil = await kedaluwarsakanReservasi(AKTOR_SISTEM);
  return { dibatalkan: hasil.length, ids: hasil.map((item) => item.id) };
};

const bersihkanUnggahanYatim = async (config = {}) => {
  const batasHari = Math.max(1, Number(config.olderThanDays) || 30);
  const batasWaktu = Date.now() - batasHari * 24 * 60 * 60 * 1000;
  if (!fs.existsSync(env.UPLOAD_DIR)) return { diperiksa: 0, dihapus: 0 };

  const rows = await query(
    `SELECT file_id FROM surat_masuk WHERE file_id <> ''
     UNION
     SELECT file_id FROM surat_keluar WHERE file_id <> ''`
  );
  const dipakai = new Set(rows.map((row) => row.file_id));
  const berkas = fs.readdirSync(env.UPLOAD_DIR);
  let dihapus = 0;

  for (const nama of berkas) {
    if (dipakai.has(nama)) continue;
    const lokasi = path.join(env.UPLOAD_DIR, nama);
    const info = fs.statSync(lokasi);
    if (!info.isFile() || info.mtimeMs > batasWaktu) continue;
    hapusBerkas(nama);
    dihapus += 1;
  }

  return { diperiksa: berkas.length, dihapus, batasHari };
};

const eksporSnapshot = async (config = {}) => {
  const diminta = String(config.tables || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const tabel = diminta.length
    ? diminta.filter((nama) => TABEL_SNAPSHOT.includes(nama))
    : [...TABEL_SNAPSHOT];

  fs.mkdirSync(env.BACKUP_DIR, { recursive: true });
  const isi = {};
  for (const nama of tabel) {
    isi[nama] = await query(`SELECT * FROM ${nama}`);
  }

  const berkas = `snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(
    path.join(env.BACKUP_DIR, berkas),
    JSON.stringify({ dibuatPada: new Date().toISOString(), tabel: isi }, null, 2)
  );

  return {
    berkas,
    tabel,
    jumlah: Object.fromEntries(Object.entries(isi).map(([nama, rows]) => [nama, rows.length]))
  };
};

const auditData = async () => {
  const [ringkasan] = await query(
    `SELECT
       (SELECT COUNT(*) FROM surat_masuk) AS surat_masuk,
       (SELECT COUNT(*) FROM surat_keluar) AS surat_keluar,
       (SELECT COUNT(*) FROM letter_numbers) AS letter_numbers,
       (SELECT COUNT(*) FROM letter_numbers WHERE status = 'RESERVED') AS nomor_reserved,
       (SELECT COUNT(*) FROM letter_numbers WHERE status = 'ISSUED' AND letter_id IS NULL) AS nomor_tanpa_surat,
       (SELECT COUNT(*) FROM surat_keluar WHERE letter_number_id IS NULL) AS surat_tanpa_nomor,
       (SELECT COUNT(*) FROM users WHERE aktif = 0) AS pengguna_nonaktif`
  );

  return Object.fromEntries(
    Object.entries(ringkasan).map(([kunci, nilai]) => [kunci, Number(nilai)])
  );
};

export const JOBS = Object.freeze({
  cleanup_expired_reservations: bersihkanReservasiKedaluwarsa,
  cleanup_orphan_uploads: bersihkanUnggahanYatim,
  export_snapshot: eksporSnapshot,
  audit_data: auditData
});

export const daftarNamaJob = () => Object.keys(JOBS);

export const ambilJob = (nama) => JOBS[nama] || null;
