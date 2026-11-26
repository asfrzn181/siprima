import { login } from '../api/client.js';

const form = document.querySelector('#login-form');
const pesan = document.querySelector('#login-error');
const tombol = form.querySelector('button[type="submit"]');

const tampilkanError = (teks) => {
  pesan.textContent = teks;
  pesan.hidden = false;
};

const togglePassword = document.querySelector('#toggle-password');
const inputPassword = form.elements.password;
if (togglePassword && inputPassword) {
  togglePassword.addEventListener('click', () => {
    const tampil = inputPassword.type === 'password';
    inputPassword.type = tampil ? 'text' : 'password';
    togglePassword.textContent = tampil ? 'Sembunyikan' : 'Tampilkan';
    togglePassword.setAttribute('aria-label', tampil ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  pesan.hidden = true;
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  if (!email || !password) {
    tampilkanError('Email dan kata sandi wajib diisi.');
    return;
  }
  tombol.disabled = true;
  tombol.textContent = 'Memeriksa…';
  try {
    const data = await login(email, password);
    window.location.href = data.profile.role === 'bidang' ? './surat-keluar.html' : './dashboard.html';
  } catch (error) {
    tampilkanError(error.message || 'Gagal masuk.');
  } finally {
    tombol.disabled = false;
    tombol.textContent = 'Masuk';
  }
});
