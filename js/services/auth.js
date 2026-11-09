import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, getAuth } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';
import { getUserProfile, createUserProfile } from './db.js';
import { auth } from './firebase.js';
export { auth };

export const signIn = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfile(result.user.uid);
  if (!profile || profile.aktif !== true) { await signOut(auth); throw new Error('Akun belum aktif atau profil belum disiapkan admin.'); }
  return result.user;
};
export const signOutUser = () => {
  try { sessionStorage.clear(); } catch {}
  return signOut(auth);
};
export const getSession = () => new Promise((resolve, reject) => {
  const stop = onAuthStateChanged(auth, async (user) => {
    stop();
    if (!user) return reject(new Error('Anda belum masuk.'));
    const profile = await getUserProfile(user.uid);
    if (!profile || profile.aktif !== true) { await signOut(auth); return reject(new Error('Akun tidak aktif.')); }
    resolve({ user, profile });
  }, reject);
});
export const requireAuth = async () => {
  try { return await getSession(); } catch { window.location.replace('./index.html'); throw new Error('Pengalihan ke halaman masuk.'); }
};
export const requireRole = async (requiredRole) => {
  const session = await requireAuth();
  if (session.profile.role !== requiredRole) { window.location.replace('./dashboard.html'); throw new Error('Akses ditolak.'); }
  return session;
};
export const createAccount = async ({ email, password, nama, role, bidang }) => {
  const secondary = initializeApp(firebaseConfig, `creator-${Date.now()}`);
  const secondaryAuth = getAuth(secondary);
  try {
    const result = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await createUserProfile(result.user.uid, { email, nama, role, bidang: role === 'bidang' ? bidang : '', aktif: true });
    return { uid: result.user.uid, email };
  } finally { await signOut(secondaryAuth).catch(() => {}); await deleteApp(secondary); }
};
export const friendlyAuthError = (err) => ({
  'auth/email-already-in-use': 'Email sudah dipakai.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/weak-password': 'Kata sandi minimal 6 karakter.',
  'permission-denied': 'Anda tidak memiliki hak untuk tindakan ini.'
}[err.code] || err.message || 'Terjadi kesalahan.');
