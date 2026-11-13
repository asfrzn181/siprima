import { api, wajibIzin } from '../api/client.js';
import { renderShell, showToast } from '../components/ui.js';

const sesi = await wajibIzin('sandi.ubah');
renderShell({ active: 'ubah-sandi', session: sesi, title: 'Ganti Password' });

const form = document.querySelector('#sandi-form');
const error = document.querySelector('#sandi-error');
const simpan = document.querySelector('#sandi-save');

const tampil = (pesan) => {
  error.textContent = pesan;
  error.hidden = false;
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.hidden = true;
  const sandiLama = form.elements.sandiLama.value;
  const sandiBaru = form.elements.sandiBaru.value;
  const sandiUlang = form.elements.sandiUlang.value;
  if (!sandiLama || !sandiBaru || !sandiUlang) return tampil('Semua kolom wajib diisi.');
  if (sandiBaru.length < 8) return tampil('Kata sandi baru minimal 8 karakter.');
  if (sandiBaru !== sandiUlang) return tampil('Ulangi kata sandi tidak sama.');

  simpan.disabled = true;
  try {
    await api.put('/auth/password', { sandiLama, sandiBaru });
    form.reset();
    showToast('Kata sandi berhasil diperbarui.');
  } catch (galat) {
    tampil(galat.message || 'Kata sandi gagal diperbarui.');
  } finally {
    simpan.disabled = false;
  }
});
