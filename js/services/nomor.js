// Parser format nomor surat. Counter dan pembuatan surat dijalankan dalam satu transaction Firestore.
export const renderNomorFormat = (format, values) => format.replace(/\{(KODE|UNIT|TAHUN|BULAN|BULAN_ROMAWI|BIDANG)\}|\{URUT:(\d+)\}/g, (_, key, width) => key ? String(values[key] ?? '') : String(values.URUT ?? '').padStart(Number(width), '0'));
