import { requireAuth } from '../services/auth.js';
import { getSuratKeluarById, updateSuratKeluar } from '../services/db.js';
import { showToast } from '../components/ui.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const form = document.querySelector('#form');
const panel = document.querySelector('#form-panel');
if (form && panel) {
  const label = document.createElement('label');
  label.className = 'wide scan-url-field';
  label.innerHTML = '<span>Link dokumen scan</span><small class="muted">Tempel URL Google Drive atau dokumen lain yang dapat diakses pengguna.</small>';
  const input = document.createElement('input');
  input.type = 'url';
  input.name = 'scanUrl';
  input.placeholder = 'https://drive.google.com/...';
  input.maxLength = 1000;
  label.append(input);
  document.querySelector('#file-label')?.after(label);

  const sync = async () => {
    const session = await requireAuth();
    const id = form.elements.id?.value || '';
    input.disabled = session.profile.role !== 'admin';
    if (!id) { input.value = ''; return; }
    const data = await getSuratKeluarById(id);
    input.value = data?.fileUrl || '';
  };
  new MutationObserver(() => { sync().catch((error) => console.warn('Link scan gagal dimuat:', error.message)); })
    .observe(panel, { attributes: true, attributeFilter: ['hidden'] });

  input.addEventListener('change', async () => {
    const id = form.elements.id?.value || '';
    if (!id) return;
    try {
      const session = await requireAuth();
      await updateSuratKeluar(id, { fileUrl: input.value.trim(), diubahPada: Timestamp.now() }, { uid: session.user.uid, nama: session.profile.nama || session.user.email, profile: session.profile });
      showToast('Link dokumen scan disimpan.');
    } catch (error) {
      showToast(error.message || 'Link dokumen gagal disimpan.');
    }
  });
}
