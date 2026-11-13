import { punyaIzin } from '../api/client.js';
import { cariNomor, daftarNomor } from '../api/master.api.js';
import {
  cariNomorLengkap,
  koreksiSuratKeluar,
  kirimSuratKeluar,
  pakaiUlangNomor,
  pratinjauNomor,
  reservasiNomor,
  tambahSuratKeluar,
  ubahSuratKeluar,
  unggahScanKeluar,
  urlBerkasKeluar
} from '../api/suratKeluar.api.js';
import { batalkanSuratKeluar } from '../api/suratKeluar.api.js';
import { createAutocomplete } from '../components/autocomplete.js';
import { showToast } from '../components/ui.js';
import { inputTanggal, tanggalIso } from '../utils/format.js';

const MIME = ['application/pdf', 'image/jpeg', 'image/png'];

const opsiBidangAkses = (wadah, daftar, terpilih = []) => {
  wadah.replaceChildren();
  daftar
    .filter((item) => item.aktif !== false && item.kode)
    .forEach((item) => {
      const label = document.createElement('label');
      label.className = 'check-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'aksesBidang';
      input.value = item.kode;
      input.checked = terpilih.includes(item.kode);
      label.append(
        input,
        Object.assign(document.createElement('span'), {
          textContent: `${item.nama} (${item.kode})`
        })
      );
      wadah.append(label);
    });
};

const pilihJenis = (select, item) => {
  let opsi = [...select.options].find((option) => option.value === item.id);
  if (!opsi) {
    opsi = new Option(`${item.kode || ''} — ${item.nama || ''}`, item.id);
    select.append(opsi);
  }
  select.value = item.id;
};

export const siapkanForm = ({ sesi, bidang, onSaved }) => {
  const panel = document.querySelector('#form-panel');
  const form = document.querySelector('#form');
  const judul = document.querySelector('#form-title');
  const catatan = document.querySelector('#form-note');
  const pesan = document.querySelector('#error');
  const simpan = document.querySelector('#save');
  const generate = document.querySelector('#generate-number');
  const tombolBatal = document.querySelector('#cancel');
  const tombolKoreksi = document.querySelector('#correct');
  const tombolUlang = document.querySelector('#reuse');
  const unduh = document.querySelector('#download');
  const tautan = document.querySelector('#file-link');
  const bidangSaja = sesi.profile.role === 'bidang';
  const bolehBuat = punyaIzin(sesi.profile, 'surat_keluar.tulis');
  const bolehBatal = punyaIzin(sesi.profile, 'surat_keluar.batal');
  const bolehKoreksi = punyaIzin(sesi.profile, 'surat_keluar.koreksi');
  const bolehUlang = punyaIzin(sesi.profile, 'surat_keluar.pakai_ulang');
  const bolehKirim = punyaIzin(sesi.profile, 'surat_keluar.kirim');
  const bolehAturAkses = bolehBuat && !bidangSaja;
  const selectJenis = form.elements.jenisId;
  const inputCari = form.elements.nomorCari;
  let masters = [];

  const tampilPesan = (teks) => {
    pesan.textContent = teks;
    pesan.hidden = false;
  };

  const isiBidang = (terpilih) => {
    form.elements.bidangPembuat.replaceChildren();
    const daftar = bidang.filter((item) => !bidangSaja || item.kode === sesi.profile.bidang);
    daftar.forEach((item) => {
      const opsi = new Option(`${item.nama} (${item.kode})`, item.kode);
      opsi.selected = item.kode === terpilih;
      form.elements.bidangPembuat.append(opsi);
    });
    form.elements.bidangPembuat.disabled = bidangSaja;
  };

  const aturKunci = (bacaSaja, item) => {
    const milikSendiri = !item || item.bidangPembuat === sesi.profile.bidang;
    form.querySelectorAll('input, select, textarea').forEach((field) => {
      const khususBidang =
        bidangSaja &&
        ['jenisId', 'nomorCari', 'tglSurat', 'bidangPembuat', 'sifat', 'nomorGenerated'].includes(field.name);
      field.disabled = bacaSaja || khususBidang || (field.name === 'scan' && !bolehBuat);
    });
    document.querySelectorAll('input[name="aksesBidang"], input[name="tandaTangan"]').forEach((input) => {
      input.disabled = bacaSaja || !bolehAturAkses;
    });
    simpan.hidden = bacaSaja || !bolehBuat || !milikSendiri;
    generate.hidden = Boolean(item) || !bolehBuat;
    document.querySelector('#file-label').hidden = !bolehBuat;
    tombolBatal.hidden = !item || !bolehBatal;
    tombolKoreksi.hidden = !item || !bolehKoreksi;
    tombolUlang.hidden = !item || !bolehUlang;
    unduh.hidden = !item?.fileId;
    unduh.dataset.id = item?.id || '';
    tautan.hidden = !item?.fileUrl;
    tautan.href = item?.fileUrl || '#';
    form.elements.dikirimKeLuar.disabled = !bolehKirim;
  };

  const cekNomorVoid = async (item) => {
    tombolUlang.hidden = true;
    if (!item || !bolehUlang || !item.noSurat) return;
    try {
      const register = await cariNomorLengkap(item.noSurat);
      tombolUlang.hidden = !register || register.status !== 'VOID';
    } catch {
      tombolUlang.hidden = true;
    }
  };

  const buka = async (item = null) => {
    pesan.hidden = true;
    form.reset();
    panel.hidden = false;
    judul.textContent = item ? 'Detail/ubah surat keluar' : 'Tambah surat keluar';
    catatan.textContent = item
      ? 'Data surat dapat diedit; nomor resmi dikoreksi atau digunakan kembali melalui tombol tindakan.'
      : 'Nomor surat dibuat lewat transaksi setelah Generate Nomor atau saat disimpan.';
    form.elements.id.value = item?.id || '';
    form.elements.noSurat.value = item?.noSurat || '';
    form.elements.reservationId.value = '';
    form.elements.idempotencyKey.value = crypto.randomUUID();
    form.elements.tglSurat.value = inputTanggal(item?.tglSurat || new Date());
    form.elements.tujuan.value = item?.tujuan || '';
    form.elements.hal.value = item?.hal || '';
    form.elements.isiRingkas.value = item?.isiRingkas || '';
    form.elements.sifat.value = item?.sifat || 'biasa';
    form.elements.scanUrl.value = item?.fileUrl || '';
    form.elements.dikirimKeLuar.checked = item?.dikirimKeLuar === true;
    form.elements.nomorGenerated.value = item?.noSurat || '';
    form.elements.nomorGenerated.required = !item;
    [...form.querySelectorAll('input[name="tandaTangan"]')].forEach((input) => {
      input.checked = input.value === (item?.tandaTangan || 'BASAH');
    });

    isiBidang(item?.bidangPembuat || sesi.profile.bidang || bidang[0]?.kode || '');
    selectJenis.replaceChildren();
    if (item?.jenisId) {
      const master = masters.find((row) => row.id === item.jenisId);
      selectJenis.append(new Option(master ? `${master.kode} — ${master.nama}` : item.jenisId, item.jenisId));
      selectJenis.value = item.jenisId;
    }
    inputCari.value = item?.jenisId ? selectJenis.options[0]?.textContent || '' : '';
    inputCari.disabled = Boolean(item);
    opsiBidangAkses(document.querySelector('#access-options'), bidang, item?.aksesBidang || []);
    document.querySelector('#access').hidden = form.elements.sifat.value !== 'rahasia';

    const bacaSaja =
      Boolean(item) && (!bolehBuat || (bidangSaja && item.bidangPembuat !== sesi.profile.bidang));
    aturKunci(bacaSaja, item);
    await cekNomorVoid(item);
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tutup = () => {
    panel.hidden = true;
  };

  const payloadForm = () => {
    const jenisId = selectJenis.value;
    const bidangKode = form.elements.bidangPembuat.value || sesi.profile.bidang;
    return {
      jenisId,
      reservationId: form.elements.reservationId.value,
      idempotencyKey: form.elements.idempotencyKey.value,
      tglSurat: tanggalIso(form.elements.tglSurat.value),
      bidangPembuat: bidangKode,
      tujuan: form.elements.tujuan.value.trim(),
      hal: form.elements.hal.value.trim(),
      isiRingkas: form.elements.isiRingkas.value.trim(),
      sifat: form.elements.sifat.value,
      tandaTangan: form.querySelector('input[name="tandaTangan"]:checked')?.value || 'BASAH',
      aksesBidang: [...document.querySelectorAll('input[name="aksesBidang"]:checked')].map(
        (input) => input.value
      ),
      fileUrl: form.elements.scanUrl.value.trim()
    };
  };

  createAutocomplete({
    input: inputCari,
    loadSuggestions: (kataKunci) => cariNomor(kataKunci, 5),
    renderItem: (item) => {
      const wadah = document.createElement('span');
      wadah.append(
        Object.assign(document.createElement('strong'), { textContent: item.kode || '—' }),
        Object.assign(document.createElement('small'), { textContent: item.nama || 'Tanpa keterangan' })
      );
      return wadah;
    },
    formatSelected: (item) => `${item.kode || ''} — ${item.nama || 'Tanpa keterangan'}`,
    onSelect: (item) => {
      pilihJenis(selectJenis, item);
      inputCari.setCustomValidity('');
    }
  });

  form.elements.sifat.addEventListener('change', () => {
    document.querySelector('#access').hidden = form.elements.sifat.value !== 'rahasia';
  });

  generate.addEventListener('click', async () => {
    generate.disabled = true;
    pesan.hidden = true;
    try {
      if (!selectJenis.value || !form.elements.tglSurat.value) {
        throw new Error('Pilih jenis nomor dan tanggal surat terlebih dahulu.');
      }
      const hasil = await reservasiNomor({
        jenisId: selectJenis.value,
        bidangKode: form.elements.bidangPembuat.value || sesi.profile.bidang,
        tanggal: tanggalIso(form.elements.tglSurat.value),
        perihal: form.elements.hal.value.trim(),
        tujuan: form.elements.tujuan.value.trim()
      });
      form.elements.reservationId.value = hasil.id;
      form.elements.nomorGenerated.value = hasil.full_number;
      form.elements.noSurat.value = hasil.full_number;
    } catch (error) {
      form.elements.reservationId.value = '';
      form.elements.nomorGenerated.value = '';
      try {
        const pratinjau = await pratinjauNomor({
          jenisId: selectJenis.value,
          bidangKode: form.elements.bidangPembuat.value || sesi.profile.bidang,
          tanggal: tanggalIso(form.elements.tglSurat.value)
        });
        if (pratinjau?.noSurat) {
          form.elements.nomorGenerated.value = `${pratinjau.noSurat} (pratinjau)`;
        }
      } catch {
        form.elements.nomorGenerated.value = '';
      }
      tampilPesan(error.message || 'Nomor surat tidak dapat dibuat.');
    } finally {
      generate.disabled = false;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    pesan.hidden = true;
    const data = payloadForm();
    if (!data.tglSurat || !data.tujuan || !data.hal || !data.isiRingkas) {
      return tampilPesan('Semua field wajib diisi.');
    }
    if (!data.jenisId) return tampilPesan('Pilih jenis nomor dari autocomplete.');
    const file = form.elements.scan.files[0];
    if (file && (!MIME.includes(file.type) || file.size > 5 * 1024 * 1024)) {
      return tampilPesan('File harus PDF/JPG/PNG maksimal 5 MB.');
    }
    simpan.disabled = true;
    try {
      const id = form.elements.id.value;
      let tersimpan;
      if (id) {
        tersimpan = await ubahSuratKeluar(id, {
          tglSurat: data.tglSurat,
          tujuan: data.tujuan,
          hal: data.hal,
          isiRingkas: data.isiRingkas,
          sifat: data.sifat,
          tandaTangan: data.tandaTangan,
          aksesBidang: data.aksesBidang,
          fileUrl: data.fileUrl
        });
        if (bolehKirim) await kirimSuratKeluar(id, form.elements.dikirimKeLuar.checked);
      } else {
        tersimpan = await tambahSuratKeluar(data);
      }
      if (file) await unggahScanKeluar(tersimpan.id, file);
      tutup();
      showToast(id ? 'Surat keluar diperbarui.' : 'Nomor surat diterbitkan.');
      await onSaved();
    } catch (error) {
      tampilPesan(error.message || 'Gagal menyimpan surat keluar.');
    } finally {
      simpan.disabled = false;
    }
  });

  tombolBatal.addEventListener('click', async () => {
    const id = form.elements.id.value;
    if (!id || !confirm('Batalkan surat ini?')) return;
    tombolBatal.disabled = true;
    try {
      await batalkanSuratKeluar(id, 'Surat dibatalkan');
      tutup();
      showToast('Surat dibatalkan.');
      await onSaved();
    } catch (error) {
      tampilPesan(error.message || 'Surat tidak dapat dibatalkan.');
    } finally {
      tombolBatal.disabled = false;
    }
  });

  tombolKoreksi.addEventListener('click', async () => {
    const id = form.elements.id.value;
    if (!id) return;
    tombolKoreksi.disabled = true;
    try {
      const data = payloadForm();
      const hasil = await koreksiSuratKeluar(id, data, 'Koreksi nomor oleh admin');
      tutup();
      showToast(`Nomor koreksi diterbitkan: ${hasil.noSurat || hasil.full_number || 'nomor baru'}`);
      await onSaved();
    } catch (error) {
      tampilPesan(error.message || 'Koreksi gagal.');
    } finally {
      tombolKoreksi.disabled = false;
    }
  });

  tombolUlang.addEventListener('click', async () => {
    const id = form.elements.id.value;
    if (!id) return;
    tombolUlang.disabled = true;
    try {
      const hasil = await pakaiUlangNomor(id, payloadForm());
      tutup();
      showToast(`Nomor ${hasil.noSurat} digunakan kembali.`);
      await onSaved();
    } catch (error) {
      tampilPesan(error.message || 'Nomor tidak dapat digunakan kembali.');
    } finally {
      tombolUlang.disabled = false;
    }
  });

  unduh.addEventListener('click', () => {
    const id = unduh.dataset.id;
    if (id) window.open(urlBerkasKeluar(id), '_blank', 'noopener');
  });

  document.querySelector('#close').addEventListener('click', tutup);
  document.querySelector('#new-button').addEventListener('click', () => buka());
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') tutup();
  });

  const muatMaster = async () => {
    masters = (await daftarNomor()) || [];
  };

  return { buka, muatMaster };
};
