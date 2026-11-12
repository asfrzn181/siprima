# Seed awal

Ganti placeholder sebelum digunakan:

- Nama dinas: `[NAMA DINAS]`
- Nama singkat/unit nomor: `[NAMA DINAS SINGKAT]`
- Tiga bidang dan kode: isi sesuai struktur organisasi.

## Akun admin pertama

1. Aktifkan Email/Password di Firebase Authentication.
2. Buat akun admin pertama dari menu Authentication > Users.
3. Salin UID akun tersebut.
4. Buat dokumen `users/{UID}` di Firestore:

```json
{
  "uid": "tFOVktmeEDcIvIxfydBDKjY0Ebv1",
  "email": "asfarezhan@gmail.com",
  "nama": "Admin Sekretariat",
  "role": "admin",
  "bidang": "",
  "aktif": true
}
```

## Master awal

Buat tiga dokumen `masterBidang/{id}` dengan field `kode`, `nama`, `aktif: true`.

Buat dokumen `masterNomor/{id}` terpisah untuk tiap golongan. Masing-masing punya urutan nomor sendiri karena counter disimpan per golongan (SK, SE, LAINNYA).

```json
{
  "nama": "Surat Keputusan",
  "golongan": "SK",
  "format": "{KODE}/SK/{URUT:3}/{UNIT}/{TAHUN}",
  "kode": "800",
  "resetTahunan": true,
  "urutanPerBidang": false,
  "aktif": true
}
```

```json
{
  "nama": "Surat Edaran",
  "golongan": "SE",
  "format": "SE/{URUT:3}/{UNIT}/{TAHUN}",
  "kode": "SE",
  "resetTahunan": true,
  "urutanPerBidang": false,
  "aktif": true
}
```

```json
{
  "nama": "Surat lainnya",
  "golongan": "LAINNYA",
  "format": "{KODE}/{URUT:3}/{UNIT}/{TAHUN}",
  "kode": "005",
  "resetTahunan": true,
  "urutanPerBidang": false,
  "aktif": true
}
```

Catatan penomoran:

- `SK` memakai kode klasifikasi tetap yang ditetapkan pada master SK.
- `SE` tidak memuat kode klasifikasi; token `{KODE}` otomatis dibuang dari format.
- `LAINNYA` memakai kode klasifikasi yang dipilih staf saat menginput surat.
- Ketiga golongan tidak saling memengaruhi urutan. Nomor 012/SK/2026 bukan nomor 012 untuk SE.
- Variabel format yang didukung: `{KODE}`, `{URUT:n}`, `{UNIT}`, `{TAHUN}`, `{BULAN}`, `{BULAN_ROMAWI}`, `{BIDANG}`, `{GOLONGAN}`.

