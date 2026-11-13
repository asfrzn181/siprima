import { ambilPengaturan, simpanPengaturan } from '../../api/admin.api.js';
import { showToast } from '../../components/ui.js';

const form = document.querySelector('#settings-form');

const isi = (data) => {
  form.elements.namaDinas.value = data?.namaDinas || '';
  form.elements.appsScriptUrl.value = data?.appsScriptUrl || '';
  form.elements.numberingScope.value = data?.numberingScope || 'GLOBAL_PER_TAHUN';
  form.elements.reservationMinutes.value = Number(data?.reservationMinutes || 15);
};

export const initPengaturan = async () => {
  try {
    isi(await ambilPengaturan());
  } catch (error) {
    showToast(error.message || 'Pengaturan gagal dimuat.', 'error');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const tombol = form.querySelector('button[type="submit"]');
    tombol.disabled = true;
    try {
      await simpanPengaturan({
        namaDinas: form.elements.namaDinas.value.trim(),
        appsScriptUrl: form.elements.appsScriptUrl.value.trim(),
        numberingScope: form.elements.numberingScope.value,
        reservationMinutes: Number(form.elements.reservationMinutes.value || 15)
      });
      showToast('Pengaturan disimpan.');
    } catch (error) {
      showToast(error.message || 'Pengaturan gagal disimpan.', 'error');
    } finally {
      tombol.disabled = false;
    }
  });
};
