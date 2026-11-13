export const el = (tag, atribut = {}, anak = []) => {
  const node = document.createElement(tag);
  Object.entries(atribut).forEach(([kunci, nilai]) => {
    if (nilai === null || nilai === undefined || nilai === false) return;
    if (kunci === 'class') node.className = nilai;
    else if (kunci === 'text') node.textContent = nilai;
    else if (kunci === 'html') node.innerHTML = nilai;
    else if (kunci.startsWith('on') && typeof nilai === 'function') {
      node.addEventListener(kunci.slice(2).toLowerCase(), nilai);
    } else node.setAttribute(kunci, nilai === true ? '' : String(nilai));
  });
  [].concat(anak).forEach((item) => {
    if (item === null || item === undefined) return;
    node.append(item instanceof Node ? item : document.createTextNode(String(item)));
  });
  return node;
};

export const pesanTabel = (tbody, kolom, pesan, detail = '') => {
  const kotak = el('div', { class: 'empty-state' }, [el('strong', { text: pesan })]);
  if (detail) kotak.append(el('span', { text: detail }));
  tbody.replaceChildren(el('tr', {}, el('td', { colspan: kolom }, kotak)));
};

export const opsiSelect = (select, daftar, { kosong = null } = {}) => {
  select.replaceChildren();
  if (kosong !== null) select.append(el('option', { value: '', text: kosong }));
  daftar.forEach((item) => {
    select.append(el('option', { value: item.value, text: item.label }));
  });
};

export const bagianTanggal = (nilai) => {
  const angka = String(nilai || '').split('-');
  return { tahun: angka[0], bulan: angka[1], hari: angka[2] };
};
