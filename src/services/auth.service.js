import { env } from '../config/env.js';
import { dapatkanAuth } from '../config/firebase.js';
import { cariUser } from '../repositories/user.repository.js';
import { AppError, galatLogin } from '../utils/AppError.js';

const pesanLogin = {
  EMAIL_NOT_FOUND: 'Email atau kata sandi salah.',
  INVALID_PASSWORD: 'Email atau kata sandi salah.',
  INVALID_LOGIN_CREDENTIALS: 'Email atau kata sandi salah.',
  USER_DISABLED: 'Akun dinonaktifkan.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Terlalu banyak percobaan. Coba lagi nanti.'
};

const signInFirebase = async (email, password) => {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`;
  let respons;
  try {
    respons = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
  } catch {
    throw new AppError(502, 'FIREBASE_TIDAK_TERJANGKAU', 'Layanan autentikasi tidak dapat dihubungi.');
  }
  const data = await respons.json().catch(() => ({}));
  if (!respons.ok) {
    const kode = data?.error?.message?.split(' : ')[0] || 'LOGIN_GAGAL';
    throw galatLogin(pesanLogin[kode] || 'Email atau kata sandi salah.');
  }
  return data;
};

export const profilPublik = (profil) => ({
  uid: profil.uid,
  email: profil.email || '',
  nama: profil.nama || '',
  role: profil.role,
  bidang: profil.bidang || '',
  aktif: profil.aktif === true
});

export const login = async ({ email, password }) => {
  const hasil = await signInFirebase(email, password);
  const profil = await cariUser(hasil.localId);
  if (!profil || profil.aktif !== true) {
    throw new AppError(403, 'AKUN_NONAKTIF', 'Akun belum aktif atau profil belum disiapkan admin.');
  }
  const cookie = await dapatkanAuth().createSessionCookie(hasil.idToken, {
    expiresIn: env.masaSesiMs
  });
  return {
    cookie,
    user: { uid: hasil.localId, email: hasil.email || email },
    profile: profilPublik({ ...profil, uid: hasil.localId })
  };
};

export const sesiSaatIni = (req) => ({
  user: req.user,
  profile: profilPublik(req.profile)
});
