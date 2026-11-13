export const pad2 = (nilai) => String(nilai).padStart(2, '0');

const keTanggal = (nilai) => {
  if (nilai instanceof Date) return nilai;
  const tanggal = new Date(nilai);
  return Number.isNaN(tanggal.getTime()) ? null : tanggal;
};

export const formatTanggal = (nilai) => {
  const tanggal = keTanggal(nilai);
  if (!tanggal) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(tanggal);
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

export const tanggalIso = (nilai, akhir = false) => {
  const teks = String(nilai || '').trim();
  if (!teks) return '';
  return `${teks}T${akhir ? '23:59:59' : '00:00:00'}+07:00`;
};

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
  if (normalisasiGolongan(golongan) === 'SK') return '{KODE}/SK/{URUT:3}/{UNIT}/{TAHUN}';
  if (normalisasiGolongan(golongan) === 'SE') return 'SE/{URUT:3}/{UNIT}/{TAHUN}';
  return '{KODE}/{URUT:3}/{UNIT}/{TAHUN}';
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
