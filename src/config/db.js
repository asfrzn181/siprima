import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const angka = (nilai, bawaan) => {
  const hasil = Number(nilai);
  return Number.isFinite(hasil) && hasil > 0 ? hasil : bawaan;
};

export const connectionConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: angka(process.env.DB_PORT, 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'siprima',
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
  decimalNumbers: true
};

const sslAktif = String(process.env.DB_SSL || '').toLowerCase() === 'true';

export const pool = mysql.createPool({
  ...connectionConfig,
  ...(sslAktif ? { ssl: { rejectUnauthorized: true } } : {}),
  waitForConnections: true,
  connectionLimit: angka(process.env.DB_POOL_MAX, 10),
  maxIdle: angka(process.env.DB_POOL_MAX, 10),
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true
});

// mysql2 menolak NaN/undefined sebagai parameter. Ubah menjadi NULL agar
// pencarian dengan id tidak valid menghasilkan "tidak ditemukan", bukan 500.
const bersihkanParams = (params) =>
  params.map((nilai) =>
    nilai === undefined || (typeof nilai === 'number' && Number.isNaN(nilai)) ? null : nilai
  );

export const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, bersihkanParams(params));
  return rows;
};

export const one = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const withTransaction = async (handler) => {
  const koneksi = await pool.getConnection();
  try {
    await koneksi.beginTransaction();
    const hasil = await handler(koneksi);
    await koneksi.commit();
    return hasil;
  } catch (error) {
    await koneksi.rollback();
    throw error;
  } finally {
    koneksi.release();
  }
};

export const tutupPool = () => pool.end();

export const cekKoneksi = async () => {
  const koneksi = await pool.getConnection();
  try {
    await koneksi.ping();
    return true;
  } finally {
    koneksi.release();
  }
};
