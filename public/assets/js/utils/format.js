export const pad2 = (nilai) => String(nilai).padStart(2, '0');

export const BULAN_ID = Object.freeze([
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
]);

const keTanggal = (nilai) => {
  if (nilai instanceof Date) return nilai;
  const tanggal = new Date(nilai);
  return Number.isNaN(tanggal.getTime()) ? null : tanggal;
};

const POLA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Kembalikan tanggal dalam bentuk ISO (YYYY-MM-DD). Tanggal dokumen dari
// server sudah berupa string murni sehingga dipertahankan apa adanya; objek
// Date hanya dipakai untuk timestamp atau nilai "hari ini".
export const keIsoTanggal = (nilai) => {
  if (!nilai) return '';
  if (typeof nilai === 'string') {
    const teks = nilai.trim();
    if (POLA_ISO.test(teks)) return teks;
    if (POLA_ISO.test(teks.slice(0, 10)) && teks.length > 10) {
      return inputTanggal(teks);
    }
  }
  return inputTanggal(nilai);
};

// Tampilkan tanggal panjang berbahasa Indonesia, mis. "1 Maret 2026".
export const formatTanggalPanjang = (nilai) => {
  const iso = keIsoTanggal(nilai);
  if (!iso) return '';
  const [tahun, bulan, hari] = iso.split('-').map(Number);
  return `${hari} ${BULAN_ID[bulan - 1]} ${tahun}`;
};

// Ubah kembali teks "1 Maret 2026" menjadi ISO (YYYY-MM-DD). Kosong bila gagal.
export const parseTanggalPanjang = (teks) => {
  const cocok = String(teks || '')
    .trim()
    .match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!cocok) return '';
  const bulan = BULAN_ID.findIndex((nama) => nama.toLowerCase() === cocok[2].toLowerCase()) + 1;
  if (!bulan) return '';
  return `${cocok[3]}-${pad2(bulan)}-${pad2(cocok[1])}`;
};

export const formatTanggal = (nilai) => formatTanggalPanjang(nilai) || '—';

export const formatTanggalPendek = (nilai) => {
  const iso = keIsoTanggal(nilai);
  if (!iso) return '—';
  const [tahun, bulan, hari] = iso.split('-');
  return `${hari}/${bulan}/${tahun}`;
};

export const formatWaktu = (nilai) => {
  const tanggal = keTanggal(nilai);
  if (!tanggal) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(tanggal);
};

export const inputTanggal = (nilai) => {
  if (nilai === null || nilai === undefined || nilai === '') return '';
  if (typeof nilai === 'string') {
    const teks = nilai.trim();
    if (POLA_ISO.test(teks)) return teks;
    if (POLA_ISO.test(teks.slice(0, 10)) && teks.length > 10) {
      let kandidat = teks;
      if (!/[zZ]|[+-]\\d{2}:?\\d{2}$/.test(kandidat)) {
        kandidat = `${kandidat}+07:00`;
      }
      const tanggal = keTanggal(kandidat);
      if (tanggal) {
        const bagian = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
          .formatToParts(tanggal)
          .reduce((hasil, item) => ({ ...hasil, [item.type]: item.value }), {});
        return `${bagian.year}-${bagian.month}-${bagian.day}`;
      }
    }
  }
  const tanggal = keTanggal(nilai || new Date());
  if (!tanggal) return '';
  const bagian = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
    .formatToParts(tanggal)
    .reduce((hasil, item) => ({ ...hasil, [item.type]: item.value }), {});
  return `${bagian.year}-${bagian.month}-${bagian.day}`;
};

// Tanggal dokumen dikirim sebagai YYYY-MM-DD murni, tanpa jam atau offset.
export const tanggalIso = (nilai) => keIsoTanggal(nilai);

export const formatStatusKind = (status) => {
  if (['Aktif', 'Selesai', 'Sudah'].includes(status)) return 'success';
  if (status === 'Dibatalkan') return 'danger';
  if (['Baru', 'Didisposisikan'].includes(status)) return 'warning';
  return 'muted';
};

export const LABEL_GOLONGAN = {
  SK: 'Surat Keputusan',
  SE: 'Surat Edaran',
  LAINNYA: 'Surat lainnya'
};

export const normalisasiGolongan = (nilai) => {
  const teks = String(nilai || '')
    .trim()
    .toUpperCase();
  if (['SK', 'SURAT KEPUTUSAN', 'KEPUTUSAN'].includes(teks)) return 'SK';
  if (['SE', 'SURAT EDARAN', 'EDARAN'].includes(teks)) return 'SE';
  return 'LAINNYA';
};

export const formatGolonganDefault = (golongan) => {
  if (normalisasiGolongan(golongan) === 'SK') return '{KODE}/{URUT:3}/BKPSDMD/{BULAN_ROMAWI}/{TAHUN}';
  if (normalisasiGolongan(golongan) === 'SE') return '{URUT:3} Tahun {TAHUN}';
  return '{KODE}/{URUT:3}/BKPSDMD/{BULAN_ROMAWI}/{TAHUN}';
};

export const normalisasiFormat = (format, golongan) => {
  let nilai = String(format || '').trim();
  if (nilai === '{KODE}/{URUT:3}/{UNIT}/BKPSDMD/{TAHUN}') {
    nilai = '{KODE}/{URUT:3}/BKPSDMD/{UNIT}/{TAHUN}';
  }
  if (!nilai) return formatGolonganDefault(golongan);
  if (normalisasiGolongan(golongan) === 'SE') {
    return nilai
      .replace(/\{KODE\}/g, '')
      .replace(/\/{2,}/g, '/')
      .replace(/^[/\-\s]+/, '')
      .replace(/[/\-\s]+$/, '')
      .trim();
  }
  return nilai;
};

export const escapeHtml = (nilai) =>
  String(nilai ?? '').replace(
    /[&<>'"]/g,
    (karakter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[karakter]
  );
