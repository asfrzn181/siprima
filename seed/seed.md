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

Buat tiga dokumen `masterBidang/{id}` dengan field `kode`, `nama`, `aktif: true`. Buat satu dokumen `masterNomor/surat-biasa`:

```json
{
  "nama": "Surat Biasa",
  "format": "{KODE}/{URUT:3}/{UNIT}/{TAHUN}",
  "kode": "800",
  "unit": "[NAMA DINAS SINGKAT]",
  "resetTahunan": true,
  "urutanPerBidang": false,
  "aktif": true
}
```
