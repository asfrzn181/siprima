import { one, query } from '../config/db.js';

const petaPengaturan = (row) => ({
  namaDinas: row.nama_dinas,
  appsScriptUrl: row.apps_script_url,
  numberingScope: row.numbering_scope,
  reservationMinutes: Number(row.reservation_minutes)
});

export const ambilPengaturan = async () => {
  const row = await one('SELECT * FROM pengaturan WHERE id = 1');
  return row ? petaPengaturan(row) : {};
};

export const simpanPengaturan = async (data) => {
  await query(
    `INSERT INTO pengaturan (id, nama_dinas, apps_script_url, numbering_scope, reservation_minutes)
     VALUES (1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nama_dinas = VALUES(nama_dinas),
       apps_script_url = VALUES(apps_script_url),
       numbering_scope = VALUES(numbering_scope),
       reservation_minutes = VALUES(reservation_minutes)`,
    [
      String(data.namaDinas || ''),
      String(data.appsScriptUrl || ''),
      data.numberingScope || 'GLOBAL_PER_TAHUN',
      Number(data.reservationMinutes) || 15
    ]
  );
  return data;
};
