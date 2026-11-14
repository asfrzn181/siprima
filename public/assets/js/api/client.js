const state = { csrf: '' };

// Aplikasi bisa berada di subfolder (mis. /siprima/). Turunkan prefix dari
// URL halaman agar fetch API tetap benar tanpa konfigurasi tambahan.
const jalurDasar = (() => {
  const jalur = new URL('.', document.baseURI).pathname;
  return jalur === '/' ? '' : jalur.replace(/\/+$/, '');
})();

export class ApiError extends Error {
  constructor(pesan, { status = 500, errors = [] } = {}) {
    super(pesan);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

const tanganiSesiHilang = () => {
  if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) return;
  window.location.replace('./index.html');
};

const bacaJson = async (respons) => {
  try {
    return await respons.json();
  } catch {
    return { status: 'error', message: 'Respons server tidak dapat dibaca.', data: null, errors: [] };
  }
};

export const pastikanCsrf = async () => {
  if (state.csrf) return state.csrf;
  const respons = await fetch(`${jalurDasar}/api/auth/csrf`, { credentials: 'same-origin' });
  const hasil = await bacaJson(respons);
  state.csrf = hasil?.data?.token || '';
  return state.csrf;
};

export const request = async (jalur, { method = 'GET', body = null, formData = null } = {}) => {
  const headers = { Accept: 'application/json' };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    await pastikanCsrf();
    headers['X-CSRF-Token'] = state.csrf;
  }
  if (formData) {
    await pastikanCsrf();
    headers['X-CSRF-Token'] = state.csrf;
  }

  const respons = await fetch(`${jalurDasar}/api${jalur}`, {
    method,
    credentials: 'same-origin',
    headers,
    body: formData || (body === null ? undefined : JSON.stringify(body))
  });

  const hasil = await bacaJson(respons);
  if (respons.status === 401 && !jalur.startsWith('/auth/login')) {
    state.csrf = '';
    tanganiSesiHilang();
  }
  if (!respons.ok || hasil.status === 'error') {
    throw new ApiError(hasil.message || 'Permintaan gagal.', {
      status: respons.status,
      errors: hasil.errors || []
    });
  }
  return hasil.data;
};

export const api = {
  get: (jalur) => request(jalur),
  post: (jalur, body = {}) => request(jalur, { method: 'POST', body }),
  put: (jalur, body = {}) => request(jalur, { method: 'PUT', body }),
  hapus: (jalur) => request(jalur, { method: 'DELETE' }),
  unggah: (jalur, formData) => request(jalur, { method: 'POST', formData }),
  hapusToken: () => {
    state.csrf = '';
  }
};

export const login = async (email, password) => {
  const data = await api.post('/auth/login', { email, password });
  state.csrf = '';
  return data;
};

export const logout = async () => {
  await api.post('/auth/logout');
  state.csrf = '';
};

export const sesi = () => api.get('/auth/session');

const NAV_FALLBACK = [
  { kunci: 'dashboard', label: 'Dashboard', href: 'dashboard.html', izin: 'dashboard.baca' },
  {
    kunci: 'agenda',
    label: 'Agenda Surat',
    href: '',
    izin: null,
    children: [
      { kunci: 'masuk', label: 'Surat Masuk', href: 'surat-masuk.html', izin: 'surat_masuk.baca' },
      { kunci: 'keluar', label: 'Surat Keluar', href: 'surat-keluar.html', izin: 'surat_keluar.baca' },
      { kunci: 'sk', label: 'Surat Keputusan', href: 'sk.html', izin: 'sk.lihat' },
      { kunci: 'se', label: 'Surat Edaran', href: 'se.html', izin: 'se.lihat' }
    ]
  },
  {
    kunci: 'laporan',
    label: 'Laporan',
    href: '',
    izin: null,
    children: [
      { kunci: 'laporan-masuk', label: 'Surat Masuk', href: 'laporan.html?jenis=masuk', izin: 'laporan.baca' },
      { kunci: 'laporan-keluar', label: 'Surat Keluar', href: 'laporan.html?jenis=keluar', izin: 'laporan.baca' }
    ]
  },
  {
    kunci: 'setting',
    label: 'Setting',
    href: '',
    izin: null,
    children: [
      { kunci: 'ubah-sandi', label: 'Ganti Password', href: 'ubah-sandi.html', izin: 'sandi.ubah' }
    ]
  },
  { kunci: 'panduan', label: 'Panduan Pengguna', href: 'panduan.html', izin: null }
];

export const punyaIzin = (profil, izin) => (profil?.izin || []).includes(izin);

const saringPohon = (profil, nodes) =>
  nodes
    .filter((node) => !node.izin || punyaIzin(profil, node.izin))
    .map((node) => ({ ...node, children: node.children ? saringPohon(profil, node.children) : [] }))
    .filter((node) => node.href || (node.children && node.children.length));

export const navUntuk = (profil) => {
  if (Array.isArray(profil?.menu) && profil.menu.length) return profil.menu;
  return saringPohon(profil, NAV_FALLBACK);
};

export const wajibMasuk = async () => {
  try {
    return await sesi();
  } catch {
    tanganiSesiHilang();
    throw new ApiError('Sesi berakhir.', { status: 401 });
  }
};

export const wajibPeran = async (...peran) => {
  const data = await wajibMasuk();
  if (!peran.includes(data.profile.role)) {
    window.location.replace(data.profile.role === 'bidang' ? './surat-keluar.html' : './dashboard.html');
    throw new ApiError('Akses dibatasi.', { status: 403 });
  }
  return data;
};

export const wajibIzin = async (...izin) => {
  const data = await wajibMasuk();
  if (!izin.every((butir) => punyaIzin(data.profile, butir))) {
    window.location.replace(data.profile.role === 'bidang' ? './surat-keluar.html' : './dashboard.html');
    throw new ApiError('Akses dibatasi.', { status: 403 });
  }
  return data;
};
