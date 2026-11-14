import { query, tutupPool } from './src/config/db.js';

const kolom = await query(
  `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
     FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME IN ('tgl_surat','tgl_terima','tanggal','letter_date')
    ORDER BY TABLE_NAME, COLUMN_NAME`
);
console.log(kolom);
const surat = await query('SELECT id, no_surat, tgl_surat FROM surat_keluar ORDER BY id DESC LIMIT 5');
console.log(surat);
const masuk = await query('SELECT id, no_agenda, tgl_terima, tgl_surat FROM surat_masuk ORDER BY id DESC LIMIT 5');
console.log(masuk);
const khusus = await query('SELECT id, jenis, nomor, tanggal FROM surat_khusus ORDER BY id DESC LIMIT 5');
console.log(khusus);
const nomor = await query('SELECT id, full_number, letter_date FROM letter_numbers ORDER BY id DESC LIMIT 5');
console.log(nomor);
await tutupPool();
