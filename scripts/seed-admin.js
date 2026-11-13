// Membuat atau menyiapkan akun admin pertama.
// Pakai: ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAMA="..." node scripts/seed-admin.js
import { dapatkanAuth } from '../src/config/firebase.js';
import { cariUser, simpanUser } from '../src/repositories/user.repository.js';

const tulis = (teks) => process.stdout.write(`${teks}\n`);

const email = String(process.env.ADMIN_EMAIL || '').trim();
const password = String(process.env.ADMIN_PASSWORD || '');
const nama = String(process.env.ADMIN_NAMA || 'Administrator').trim();

if (!email || !password) {
  tulis('ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi.');
  process.exit(1);
}
if (password.length < 6) {
  tulis('ADMIN_PASSWORD minimal 6 karakter.');
  process.exit(1);
}

const jalankan = async () => {
  const auth = dapatkanAuth();
  let user;
  try {
    user = await auth.getUserByEmail(email);
    tulis(`Akun Auth sudah ada: ${user.uid}`);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({ email, password, displayName: nama });
    tulis(`Akun Auth dibuat: ${user.uid}`);
  }

  const lama = await cariUser(user.uid);
  await simpanUser(user.uid, {
    email,
    nama: lama?.nama || nama,
    role: 'admin',
    bidang: '',
    aktif: true
  });
  tulis(`Profil admin siap: ${email}`);
};

jalankan()
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(`Gagal menyiapkan admin: ${error.message}\n`);
    process.exit(1);
  });
