import { requireAuth } from '../services/auth.js';
import { getSuratKeluarById, updateSuratKeluar } from '../services/db.js';
import { showToast } from '../components/ui.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const form = document.querySelector('#form');
const panel = document.querySelector('#form-panel');
if (form && panel) {
  const label = document.createElement('label');
  label.className = 'wide delivery-state';
  const title = document.createElement('span');
  title.textContent = 'Status pengiriman';
  const wrapper = document.createElement('span');
  wrapper.className = 'check-option delivery-check';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = 'dikirimKeLuar';
  const text = document.createElement('span');
  text.textContent = 'Surat sudah dikirim ke pihak luar';
  wrapper.append(input, text);
  label.append(title, wrapper);
  document.querySelector('#file-label')?.after(label);

  const sync = async () => {
    const session = await requireAuth();
    const id = form.elements.id?.value || '';
    input.disabled = !id || session.profile.role !== 'admin';
    if (!id) { input.checked = false; return; }
    const data = await getSuratKeluarById(id);
    input.checked = data?.dikirimKeLuar === true;
  };

  new MutationObserver(() => { sync().catch((error) => console.warn('Status pengiriman gagal dimuat:', error.message)); })
    .observe(panel, { attributes: true, attributeFilter: ['hidden'] });

  input.addEventListener('change', async () => {
    const id = form.elements.id?.value || '';
    if (!id) return;
    try {
      const session = await requireAuth();
      await updateSuratKeluar(id, { dikirimKeLuar: input.checked, diubahPada: Timestamp.now() }, { uid: session.user.uid, nama: session.profile.nama || session.user.email, profile: session.profile });
      showToast(input.checked ? 'Surat ditandai sudah dikirim.' : 'Status pengiriman dikembalikan ke belum dikirim.');
    } catch (error) {
      input.checked = !input.checked;
      showToast(error.message || 'Status pengiriman gagal disimpan.');
    }
  });
}
