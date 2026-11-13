import { verifikasiNomor } from '../../api/admin.api.js';
import { badge, showToast } from '../../components/ui.js';

const body = document.querySelector('#cleaner-body');
const summary = document.querySelector('#cleaner-summary');
const tahun = document.querySelector('#cleaner-tahun');
const scope = document.querySelector('#cleaner-scope');
const periksa = document.querySelector('#cleaner-check');

const LABEL = {
  DUPLICATE_SEQUENCE: { label: 'Nomor Urut Duplikat', kind: 'danger' },
  NUMBER_MISMATCH: { label: 'Format Tidak Sesuai', kind: 'muted' },
  GAP_WITHOUT_VOID: { label: 'Nomor Hilang / Gap', kind: 'muted' }
};

const selKosong = (teks) => {
  const baris = document.createElement('tr');
  const sel = document.createElement('td');
  sel.colSpan = 4;
  sel.className = 'muted';
  sel.style.textAlign = 'center';
  sel.textContent = teks;
  baris.append(sel);
  body.replaceChildren(baris);
};

const detail = (issue) => {
  if (issue.type === 'DUPLICATE_SEQUENCE') return `Identity: ${issue.identity}`;
  if (issue.type === 'NUMBER_MISMATCH') return `Aktual: ${issue.actual} | Seharusnya: ${issue.expected}`;
  if (issue.type === 'GAP_WITHOUT_VOID') return `Gap pada scope: ${issue.group}`;
  return JSON.stringify(issue);
};

const render = (hasil) => {
  body.replaceChildren();
  if (!hasil.issues.length) {
    selKosong(`Tidak ada masalah ditemukan. Total ${hasil.total} nomor diperiksa.`);
  } else {
    hasil.issues.forEach((issue) => {
      const info = LABEL[issue.type] || { label: issue.type, kind: 'muted' };
      const baris = document.createElement('tr');
      const jenis = document.createElement('td');
      jenis.append(badge(info.label, info.kind));
      const urut = document.createElement('td');
      urut.textContent =
        issue.seq !== null && issue.seq !== undefined
          ? String(issue.seq)
          : issue.identity
            ? issue.identity.split(':')[1]
            : '—';
      const rincian = document.createElement('td');
      rincian.textContent = detail(issue);
      const dokumen = document.createElement('td');
      dokumen.textContent = issue.id || '—';
      dokumen.style.fontSize = '0.78em';
      dokumen.style.wordBreak = 'break-all';
      baris.append(jenis, urut, rincian, dokumen);
      body.append(baris);
    });
  }

  summary.hidden = false;
  summary.replaceChildren();
  summary.append(
    Object.assign(document.createElement('strong'), { textContent: `Tahun ${hasil.tahun}` }),
    document.createTextNode(` — Total diperiksa: ${hasil.total} nomor | Masalah: `),
    Object.assign(document.createElement('strong'), {
      textContent: String(hasil.issues.length),
      style: `color:${hasil.issues.length ? '#9b1c1c' : 'green'}`
    })
  );
};

export const initCleaner = async () => {
  tahun.value = new Date().getFullYear();

  periksa.addEventListener('click', async () => {
    const nilaiTahun = Number(tahun.value);
    if (!nilaiTahun || nilaiTahun < 2020 || nilaiTahun > 2099) {
      showToast('Masukkan tahun yang valid (2020–2099).');
      return;
    }
    periksa.disabled = true;
    summary.hidden = true;
    selKosong('Memeriksa data…');
    try {
      render(await verifikasiNomor(nilaiTahun, scope.value.trim() || undefined));
    } catch (error) {
      selKosong(`Gagal memeriksa: ${error.message || error}`);
    } finally {
      periksa.disabled = false;
    }
  });

  document.querySelector('#cleaner-reset').addEventListener('click', () => {
    tahun.value = new Date().getFullYear();
    scope.value = '';
    summary.hidden = true;
    selKosong('Belum diperiksa. Pilih tahun dan klik Periksa Duplikasi.');
  });
};
