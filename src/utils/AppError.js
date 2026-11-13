export class AppError extends Error {
  constructor(status, kode, pesan, errors = []) {
    super(pesan);
    this.name = 'AppError';
    this.status = status;
    this.kode = kode;
    this.errors = errors;
    this.terduga = true;
  }
}

export const galatPermintaan = (pesan, errors = []) =>
  new AppError(400, 'PERMINTAAN_TIDAK_VALID', pesan, errors);
export const galatLogin = (pesan = 'Email atau kata sandi salah.') => new AppError(401, 'LOGIN_GAGAL', pesan);
export const galatSesi = (pesan = 'Sesi tidak valid atau sudah berakhir.') =>
  new AppError(401, 'SESI_TIDAK_VALID', pesan);
export const galatAkses = (pesan = 'Anda tidak memiliki hak untuk tindakan ini.') =>
  new AppError(403, 'AKSES_DITOLAK', pesan);
export const galatTidakDitemukan = (pesan = 'Data tidak ditemukan.') =>
  new AppError(404, 'TIDAK_DITEMUKAN', pesan);
export const galatKonflik = (pesan) => new AppError(409, 'KONFLIK', pesan);
export const galatTerlaluBanyak = (pesan = 'Terlalu banyak permintaan. Coba lagi nanti.') =>
  new AppError(429, 'TERLALU_BANYAK', pesan);
