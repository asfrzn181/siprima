import { daftarAudit } from '../../api/admin.api.js';
import { formatWaktu } from '../../utils/format.js';
import { pesanBaris, renderPager, selTeks } from './shared.js';

const body = document.querySelector('#audit-body');
const pager = document.querySelector('#audit-pager');

let halaman = 1;

export const muatAudit = async () => {
  pesanBaris(body, 6, 'Memuat…');
  try {
    const hasil = await daftarAudit(halaman);
    body.replaceChildren();
    if (!hasil.items.length) pesanBaris(body, 6, 'Belum ada audit log.');
    const mulai = (halaman - 1) * (hasil.pagination.limit || 20);
    hasil.items.forEach((item, index) => {
      const baris = document.createElement('tr');
      baris.append(
        selTeks(String(mulai + index + 1)),
        selTeks(formatWaktu(item.waktu)),
        selTeks(item.nama || item.uid),
        selTeks(item.aksi),
        selTeks(item.koleksi),
        selTeks(item.docId)
      );
      body.append(baris);
    });
    renderPager(pager, hasil.pagination, (halamanBaru) => {
      halaman = halamanBaru;
      muatAudit();
    });
  } catch (galat) {
    pesanBaris(body, 6, galat.message || 'Gagal memuat audit log.');
  }
};

export const initAudit = async () => {
  document.querySelector('#refresh-audit').addEventListener('click', () => muatAudit());
  await muatAudit();
};
