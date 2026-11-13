// Pemeriksaan data read-only. Tidak mengubah dokumen apa pun.
// Pakai: node scripts/audit-data.js
import { KOLEKSI, PERAN, STATUS_NOMOR } from '../src/constants/index.js';
import { hitungKoleksi, queryKoleksi } from '../src/repositories/base.repository.js';

const tulis = (teks) => process.stdout.write(`${teks}\n`);

const nilai = async (nama) => hitungKoleksi(nama);

const jalankan = async () => {
  const koleksi = [
    KOLEKSI.USERS,
    KOLEKSI.MASTER_BIDANG,
    KOLEKSI.MASTER_NOMOR,
    KOLEKSI.SURAT_MASUK,
    KOLEKSI.SURAT_KELUAR,
    KOLEKSI.LETTER_NUMBERS,
    KOLEKSI.AUDIT_LOG
  ];

  tulis('Jumlah dokumen:');
  for (const nama of koleksi) {
    tulis(`- ${nama}: ${await nilai(nama)}`);
  }

  const users = await queryKoleksi(KOLEKSI.USERS);
  const peranSah = Object.values(PERAN);
  const peranAneh = users.filter((user) => !peranSah.includes(user.role));
  const bidangTanpaKode = users.filter(
    (user) => user.role === PERAN.BIDANG && !String(user.bidang || '').trim()
  );
  tulis(`Pengguna dengan peran tidak dikenal: ${peranAneh.length}`);
  tulis(`Pengguna bidang tanpa kode bidang: ${bidangTanpaKode.length}`);

  const suratKeluar = await queryKoleksi(KOLEKSI.SURAT_KELUAR, { limit: 5000 });
  const tanpaRegister = suratKeluar.filter((surat) => !surat.letterNumberId);
  tulis(`Surat keluar tanpa letterNumberId: ${tanpaRegister.length}`);

  const nomor = await queryKoleksi(KOLEKSI.LETTER_NUMBERS, { limit: 5000 });
  const reserved = nomor.filter((item) => item.status === STATUS_NOMOR.RESERVED);
  const tanpaSurat = nomor.filter((item) => item.status === STATUS_NOMOR.ISSUED && !item.letter_id);
  tulis(`Nomor berstatus RESERVED: ${reserved.length}`);
  tulis(`Nomor ISSUED tanpa referensi surat: ${tanpaSurat.length}`);
};

jalankan().catch((error) => {
  process.stderr.write(`Audit gagal: ${error.message}\n`);
  process.exit(1);
});
