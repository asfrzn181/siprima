import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { AKSI_AUDIT, PERAN } from '../constants/index.js';
import { hashSha256 } from '../utils/hash.js';
import { AppError, galatKonflik, galatLogin, galatSesi } from '../utils/AppError.js';
import { catatAudit } from '../repositories/audit.repository.js';
import { menuUntukProfil } from './menu.service.js';
import {
  cariHashUser,
  cariUser,
  cariUserByEmail,
  perbaruiLoginTerakhir,
  simpanUser,
  ubahSandi
} from '../repositories/user.repository.js';
import {
  buatReset,
  buatSesi,
  cabutSesi,
  cabutSesiUser,
  cariResetAktif,
  cariSesiAktif,
  rotasiSesi,
  tandaiResetDipakai
} from '../repositories/session.repository.js';

const tokenAcak = () => randomBytes(32).toString('hex');
const masaBerlaku = () => new Date(Date.now() + env.masaSesiMs);

export const profilPublik = (user) => ({
  id: user.id,
  uid: user.id,
  email: user.email,
  nama: user.nama,
  role: user.role,
  bidang: user.bidang,
  aksesData: user.aksesData === 'SEMUA' ? 'SEMUA' : 'SENDIRI',
  aktif: user.aktif,
  izin: user.izin || []
});

// Sertakan pohon menu (parent/child) yang boleh dilihat sesuai izin profil.
const denganMenu = async (profile) => ({ ...profile, menu: await menuUntukProfil(profile) });

export const login = async ({ email, password }, { userAgent = '', ip = '' } = {}) => {
  const user = await cariUserByEmail(email);
  if (!user || !user.aktif) throw galatLogin();
  const cocok = await bcrypt.compare(password, user.passwordHash);
  if (!cocok) throw galatLogin();

  const token = tokenAcak();
  await buatSesi({
    userId: user.id,
    tokenHash: hashSha256(token),
    userAgent,
    ip,
    expiresAt: masaBerlaku()
  });
  await perbaruiLoginTerakhir(user.id);

  return {
    cookie: token,
    user: { id: user.id, email: user.email },
    profile: await denganMenu(profilPublik(user))
  };
};

export const sesiSaatIni = async (req) => ({
  user: req.user,
  profile: await denganMenu(profilPublik(req.profile))
});

export const logout = async (token) => {
  if (token) await cabutSesi(hashSha256(token));
};

export const refresh = async (token, { userAgent = '', ip = '' } = {}) => {
  if (!token) throw galatSesi('Anda belum masuk.');
  const sesi = await cariSesiAktif(hashSha256(token));
  if (!sesi) throw galatSesi();
  const user = await cariUser(sesi.user_id);
  if (!user || !user.aktif) throw galatSesi();

  const baru = tokenAcak();
  await rotasiSesi(sesi.id, { tokenHash: hashSha256(baru), expiresAt: masaBerlaku() });
  return {
    cookie: baru,
    user: { id: user.id, email: user.email },
    profile: await denganMenu(profilPublik(user)),
    meta: { userAgent, ip }
  };
};

export const register = async (data) => {
  const email = String(data.email || '').trim().toLowerCase();
  if (await cariUserByEmail(email)) throw galatKonflik('Email sudah dipakai.');
  const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);
  const hasil = await simpanUser({
    email,
    passwordHash,
    nama: data.nama,
    role: PERAN.BIDANG,
    bidang: data.bidang || '',
    aktif: false
  });
  return profilPublik(hasil);
};

export const mintaResetPassword = async (email) => {
  const user = await cariUserByEmail(email);
  if (!user) return { token: null };
  const token = tokenAcak();
  await buatReset({
    userId: user.id,
    tokenHash: hashSha256(token),
    expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60000)
  });
  return { token: env.AUTH_EXPOSE_RESET_TOKEN ? token : null };
};

export const konfirmasiResetPassword = async (token, password) => {
  const reset = await cariResetAktif(hashSha256(token));
  if (!reset) {
    throw new AppError(400, 'TOKEN_RESET_TIDAK_VALID', 'Token reset tidak valid atau sudah kedaluwarsa.');
  }
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  await ubahSandi(reset.user_id, passwordHash);
  await tandaiResetDipakai(reset.id);
  await cabutSesiUser(reset.user_id);
  return { berhasil: true };
};

export const ubahSandiSendiri = async (aktor, { sandiLama, sandiBaru }) => {
  const hash = await cariHashUser(aktor.uid);
  if (!hash || !(await bcrypt.compare(sandiLama, hash))) {
    throw new AppError(400, 'SANDI_LAMA_SALAH', 'Kata sandi lama tidak sesuai.');
  }
  const passwordHash = await bcrypt.hash(sandiBaru, env.BCRYPT_ROUNDS);
  await ubahSandi(aktor.uid, passwordHash);
  await catatAudit({
    uid: aktor.uid,
    nama: aktor.nama,
    aksi: AKSI_AUDIT.UBAH_SANDI,
    koleksi: 'users',
    docId: aktor.uid
  });
  return { berhasil: true };
};
