// Loader CommonJS untuk Phusion Passenger (cPanel).
// Passenger memuat startup file dengan require(), sehingga entry ESM harus
// dimuat lewat dynamic import dari file .cjs. Set Application Startup File
// di cPanel ke passenger.cjs.
async function mulai() {
  try {
    await import('./src/server.js');
  } catch (error) {
    console.error('SiPrima gagal dimuat:', error);
    process.exit(1);
  }
}

mulai();
