export const bukaModal = (id) => {
  document.querySelector(`#${id}`).hidden = false;
};

export const tutupModal = (id) => {
  document.querySelector(`#${id}`).hidden = true;
};

export const pasangModal = () => {
  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => tutupModal(button.dataset.close));
  });
  document.querySelectorAll('.modal-panel').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.hidden = true;
    });
  });
};

export const pesanBaris = (tbody, kolom, teks) => {
  const baris = document.createElement('tr');
  const sel = document.createElement('td');
  sel.colSpan = kolom;
  sel.className = 'muted';
  sel.style.textAlign = 'center';
  sel.textContent = teks;
  baris.append(sel);
  tbody.replaceChildren(baris);
};

export const renderPager = (wadah, pagination, onPage) => {
  const { page, totalPages, hasPrev, hasNext } = pagination;
  const prev = document.createElement('button');
  prev.className = 'button secondary small';
  prev.type = 'button';
  prev.textContent = 'Sebelumnya';
  prev.disabled = !hasPrev;
  prev.addEventListener('click', () => onPage(page - 1));

  const label = document.createElement('span');
  label.className = 'muted';
  label.textContent = `Halaman ${page} dari ${totalPages}`;

  const next = document.createElement('button');
  next.className = 'button secondary small';
  next.type = 'button';
  next.textContent = 'Berikutnya';
  next.disabled = !hasNext;
  next.addEventListener('click', () => onPage(page + 1));

  wadah.replaceChildren(prev, label, next);
};

export const selTeks = (teks) => {
  const td = document.createElement('td');
  td.textContent = teks || '—';
  return td;
};
