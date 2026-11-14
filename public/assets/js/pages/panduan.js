import { wajibMasuk } from '../api/client.js';
import { renderShell } from '../components/ui.js';

const sesi = await wajibMasuk();
renderShell({ active: 'panduan', session: sesi, title: 'Panduan Pengguna' });

const sections = [...document.querySelectorAll('.guide-section')];
const toc = document.querySelector('#guide-toc');
const search = document.querySelector('#guide-search');
const searchNote = document.querySelector('#guide-search-note');
const print = document.querySelector('#guide-print');
const backtop = document.querySelector('#guide-backtop');

const tautanToc = new Map();

sections.forEach((section) => {
  const judul = section.querySelector('h2');
  if (!judul) return;
  const item = document.createElement('li');
  const tautan = document.createElement('a');
  tautan.href = `#${section.id}`;
  tautan.textContent = judul.textContent.replace(/\s+/g, ' ').trim();
  item.append(tautan);
  toc.append(item);
  tautanToc.set(section.id, tautan);
});

const aturCatatan = (teks) => {
  searchNote.textContent = teks;
};

const saring = () => {
  const kunci = search.value.trim().toLowerCase();
  let tampil = 0;
  sections.forEach((section) => {
    const cocok = !kunci || section.textContent.toLowerCase().includes(kunci);
    section.hidden = !cocok;
    const tautan = tautanToc.get(section.id);
    if (tautan) tautan.parentElement.hidden = !cocok;
    if (cocok) tampil += 1;
  });
  if (!kunci) {
    aturCatatan('');
    return;
  }
  aturCatatan(
    tampil
      ? `${tampil} dari ${sections.length} bagian cocok dengan “${search.value.trim()}”.`
      : `Tidak ada bagian yang cocok dengan “${search.value.trim()}”.`
  );
};

search.addEventListener('input', saring);

print.addEventListener('click', () => window.print());

const perbaruiBacktop = () => {
  backtop.classList.toggle('visible', window.scrollY > 400);
};

backtop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', perbaruiBacktop, { passive: true });
perbaruiBacktop();

if ('IntersectionObserver' in window) {
  const pengamat = new IntersectionObserver(
    (entri) => {
      entri.forEach((entriItem) => {
        if (!entriItem.isIntersecting) return;
        tautanToc.forEach((tautan) => tautan.removeAttribute('aria-current'));
        const tautan = tautanToc.get(entriItem.target.id);
        if (tautan) tautan.setAttribute('aria-current', 'true');
      });
    },
    { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
  );
  sections.forEach((section) => pengamat.observe(section));
}

if (window.location.hash) {
  const target = document.querySelector(window.location.hash);
  if (target) target.scrollIntoView({ block: 'start' });
}
