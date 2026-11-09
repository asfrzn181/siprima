const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const formatTitleCase = (raw = '') => String(raw).toLocaleLowerCase('id-ID').replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('id-ID'));

export const createAutocomplete = ({ input, loadSuggestions, renderItem, onSelect, minChars = 3, debounceMs = 800, formatInput = (value) => value, formatSelected = (item) => item }) => {
  const wrapper = input.closest('.autocomplete') || input.parentElement;
  if (wrapper && !wrapper.classList.contains('autocomplete')) wrapper.classList.add('autocomplete');
  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-menu';
  dropdown.hidden = true;
  dropdown.setAttribute('role', 'listbox');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.after(dropdown);
  let timer = null;
  let requestId = 0;

  const close = () => { dropdown.replaceChildren(); dropdown.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  const show = (items) => {
    dropdown.replaceChildren();
    if (!items.length) return close();
    items.forEach((item) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'autocomplete-item';
      option.setAttribute('role', 'option');
      option.append(renderItem(item));
      option.addEventListener('mousedown', (event) => { event.preventDefault(); input.value = formatSelected(item); onSelect(item); close(); });
      dropdown.append(option);
    });
    dropdown.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  const search = async () => {
    const keyword = input.value.trim();
    if (keyword.length < minChars) return close();
    const currentRequest = ++requestId;
    try {
      const items = await loadSuggestions(keyword);
      if (currentRequest === requestId) show(items);
    } catch (error) { if (currentRequest === requestId) close(); console.warn('Autocomplete gagal:', error); }
  };
  input.addEventListener('input', () => { clearTimeout(timer); input.value = formatInput(input.value); timer = setTimeout(search, debounceMs); });
  input.addEventListener('focus', () => { if (input.value.trim().length >= minChars) search(); });
  input.addEventListener('blur', () => setTimeout(close, 200));
  input.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  return { close };
};
