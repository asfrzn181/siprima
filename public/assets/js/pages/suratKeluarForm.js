import { punyaIzin } from '../api/client.js';
import { cariNomor, daftarNomor } from '../api/master.api.js';
import {
  batalkanSuratKeluar,
  pratinjauNomor,
  tambahSuratKeluar,
  ubahSuratKeluar
} from '../api/suratKeluar.api.js';
import { createAutocomplete } from '../components/autocomplete.js';
import { dialogInput, showToast } from '../components/ui.js';
import { inputTanggal, tanggalIso } from '../utils/format.js';

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
  const bidangSaja = sesi.profile.role === 'bidang';
  const bolehBuat = punyaIzin(sesi.profile, 'surat_keluar.tulis');
  const bolehBatal = punyaIzin(sesi.profile, 'surat_keluar.batal');
  const bolehAturAkses = bolehBuat && !bidangSaja;
  const selectJenis = form.elements.jenisId;
  const inputCari = form.elements.nomorCari;
  let masters = [];
  let nomorPratinjau = '';

  const tampilPesan = (teks) => {
    pesan.textContent = teks;
    pesan.hidden = false;
  };

  const bidangTerpilih = () => form.elements.bidangPembuat.value || sesi.profile.bidang;

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
      field.disabled = bacaSaja || khususBidang;
    });
    document.querySelectorAll('input[name="aksesBidang"], input[name="tandaTangan"]').forEach((input) => {
      input.disabled = bacaSaja || !bolehAturAkses;
    });
    simpan.hidden = bacaSaja || !bolehBuat || !milikSendiri;
    generate.hidden = Boolean(item) || !bolehBuat;
    tombolBatal.hidden = !item || !bolehBatal;
  };

  // Pratinjau hanya membaca data. Tidak ada INSERT/UPDATE sampai pengguna
  // menekan Simpan; nomor final tetap ditentukan server saat penyimpanan.
  const muatTersedia = async () => {
    if (!selectJenis.value || !form.elements.tglSurat.value) {
      nomorPratinjau = '';
      form.elements.nomorGenerated.value = '';
      return;
    }
    try {
      const hasil = await pratinjauNomor({
        menu: 'SURAT_KELUAR',
        jenisId: selectJenis.value,
        bidangKode: bidangTerpilih(),
        tanggal: tanggalIso(form.elements.tglSurat.value)
      });
      nomorPratinjau = hasil?.noSurat || '';
      form.elements.nomorGenerated.value = nomorPratinjau;
    } catch (error) {
      nomorPratinjau = '';
      form.elements.nomorGenerated.value = '';
      tampilPesan(error.message || 'Pratinjau nomor gagal dimuat.');
    }
  };

  const buka = async (item = null) => {
    pesan.hidden = true;
    form.reset();
    panel.hidden = false;
    judul.textContent = item ? 'Detail/ubah surat keluar' : 'Tambah surat keluar';
    catatan.textContent = item
      ? 'Data surat dapat diedit. Nomor resmi tidak berubah saat penyuntingan.'
      : 'Nomor surat dibuat otomatis oleh server memakai nomor terkecil yang tersedia.';
    form.elements.id.value = item?.id || '';
    form.elements.noSurat.value = item?.noSurat || '';
    form.elements.tglSurat.value = inputTanggal(item?.tglSurat || new Date());
    form.elements.tujuan.value = item?.tujuan || '';
    form.elements.hal.value = item?.hal || '';
    form.elements.isiRingkas.value = item?.isiRingkas || '';
    form.elements.sifat.value = item?.sifat || 'biasa';
    nomorPratinjau = item?.noSurat || '';
    form.elements.nomorGenerated.value = nomorPratinjau;
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
    if (!item) {
      await muatTersedia();
    }
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tutup = () => {
    panel.hidden = true;
  };

  const payloadForm = () => {
    const jenisId = selectJenis.value;
    const bidangKode = bidangTerpilih();
    return {
      jenisId,
      tglSurat: tanggalIso(form.elements.tglSurat.value),
      bidangPembuat: bidangKode,
      tujuan: form.elements.tujuan.value.trim(),
      hal: form.elements.hal.value.trim(),
      isiRingkas: form.elements.isiRingkas.value.trim(),
      sifat: form.elements.sifat.value,
      tandaTangan: form.querySelector('input[name="tandaTangan"]:checked')?.value || 'BASAH',
      aksesBidang: [...document.querySelectorAll('input[name="aksesBidang"]:checked')].map(
        (input) => input.value
      )
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
      muatTersedia();
    }
  });

  form.elements.sifat.addEventListener('change', () => {
    document.querySelector('#access').hidden = form.elements.sifat.value !== 'rahasia';
  });

  ['tglSurat', 'bidangPembuat'].forEach((nama) => {
    form.elements[nama].addEventListener('change', () => {
      muatTersedia();
    });
  });

  generate.addEventListener('click', async () => {
    generate.disabled = true;
    pesan.hidden = true;
    try {
      if (!selectJenis.value || !form.elements.tglSurat.value) {
        throw new Error('Pilih jenis nomor dan tanggal surat terlebih dahulu.');
      }
      await muatTersedia();
      if (!nomorPratinjau) {
        tampilPesan('Nomor belum tersedia. Periksa jenis nomor, bidang, dan tanggal surat.');
      }
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
    simpan.disabled = true;
    const pratinjau = nomorPratinjau;
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
          aksesBidang: data.aksesBidang
        });
      } else {
        tersimpan = await tambahSuratKeluar(data);
      }
      tutup();
      if (id) {
        showToast('Surat keluar diperbarui.');
      } else {
        const nomorFinal = tersimpan?.noSurat || '';
        if (pratinjau && nomorFinal && pratinjau !== nomorFinal) {
          showToast(
            `Nomor ${pratinjau} sudah digunakan, surat Anda disimpan dengan nomor ${nomorFinal}.`
          );
        } else if (nomorFinal) {
          showToast(`Surat keluar disimpan dengan nomor ${nomorFinal}.`);
        } else {
          showToast('Surat keluar disimpan.');
        }
      }
      await onSaved();
    } catch (error) {
      tampilPesan(error.message || 'Gagal menyimpan surat keluar.');
    } finally {
      simpan.disabled = false;
    }
  });

  tombolBatal.addEventListener('click', async () => {
    const id = form.elements.id.value;
    if (!id) return;
    const nomor = form.elements.noSurat.value || form.elements.nomorGenerated.value;
    const alasan = await dialogInput({
      judul: 'Batalkan Nomor',
      nomor: nomor ? `Nomor: ${nomor}` : '',
      deskripsi: 'Surat keluar akan ditandai batal. Data tidak dihapus.',
      label: 'Keterangan pembatalan',
      placeholder: 'Tuliskan alasan pembatalan nomor…',
      teksKonfirmasi: 'Batalkan Nomor',
      teksBatal: 'Kembali',
      pesanWajib: 'Keterangan pembatalan wajib diisi.'
    });
    if (!alasan) return;
    tombolBatal.disabled = true;
    try {
      await batalkanSuratKeluar(id, alasan);
      tutup();
      showToast('Surat dibatalkan.');
      await onSaved();
    } catch (error) {
      tampilPesan(error.message || 'Surat tidak dapat dibatalkan.');
    } finally {
      tombolBatal.disabled = false;
    }
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
