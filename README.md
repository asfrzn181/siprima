# SiPrima — Agenda Surat Sekretariat Dinas

Aplikasi internal agenda surat masuk dan surat keluar. Frontend statis (HTML/CSS/ES Modules) disajikan oleh Express.js; seluruh akses data melewati API `/api` dengan **Firebase Admin SDK**. Browser tidak pernah memuat SDK, konfigurasi, atau kredensial Firebase.

## Arsitektur

```
Browser (public/) → Express /api → route → controller → service → repository → Firebase
```

- Autentikasi: Firebase Authentication (Email/Password). Backend memverifikasi login lewat Identity Toolkit, lalu menerbitkan **session cookie HttpOnly**.
- Otorisasi: RBAC `admin`, `pimpinan`, `bidang`; ditegakkan di route dan service.
- Data: struktur koleksi Firestore lama dipertahankan.
- Unggahan: multer menyimpan scan di folder privat di luar `public_html`; unduhan lewat endpoint ber-otorisasi.
- Keamanan: helmet + CSP, rate limit (login lebih ketat), validasi zod, CSRF double-submit, sanitasi output DOM, audit log.

## Struktur folder

```
.
├─ app.js                     # entry `node app.js`
├─ passenger.cjs              # startup file cPanel (Passenger)
├─ public/                    # hanya aset statis & halaman
│  ├─ index.html ... admin.html
│  └─ assets/{css,js,vendor}
├─ src/
│  ├─ app.js  server.js
│  ├─ config/                 # env, firebase (singleton lazy), logger
│  ├─ constants/
│  ├─ routes/ controllers/ services/ repositories/
│  ├─ middlewares/ validators/ utils/
├─ scripts/                   # seed-admin, audit-data
├─ tests/                     # unit, HTTP, statis, integrasi (opt-in)
├─ firestore.rules storage.rules
└─ firestore.indexes.json
```

## Prasyarat

- Node.js **20+** (cPanel: pilih versi Node 20/22).
- Project Firebase dengan Authentication Email/Password dan Cloud Firestore aktif.
- Service account Firebase (Firebase Console → Project settings → Service accounts → Generate new private key).

## Menjalankan lokal

```bash
cp .env.example .env      # Windows: copy .env.example .env
# isi kredensial pada .env
npm install
npm run dev               # http://localhost:3000
```

Buat admin pertama:

```bash
ADMIN_EMAIL=admin@dinas.go.id ADMIN_PASSWORD='ubah-saya' ADMIN_NAMA='Admin SiPrima' node scripts/seed-admin.js
```

Perintah lain:

| Perintah                        | Kegunaan                           |
| ------------------------------- | ---------------------------------- |
| `npm start`                     | jalankan server produksi           |
| `npm run dev`                   | server dengan watch                |
| `npm run lint`                  | ESLint seluruh kode                |
| `npm run format`                | Prettier                           |
| `npm test`                      | unit + HTTP + pemeriksaan statis   |
| `RUN_FIREBASE_TESTS=1 npm test` | tambah uji integrasi Firebase asli |
| `node scripts/audit-data.js`    | laporan data read-only             |

## Konfigurasi environment

Semua konfigurasi hanya dibaca di `src/config/env.js`. Variabel wajib:

| Variabel                                                    | Keterangan                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| `FIREBASE_PROJECT_ID`                                       | project ID Firebase                                         |
| `FIREBASE_CLIENT_EMAIL`                                     | email service account                                       |
| `FIREBASE_PRIVATE_KEY` **atau** `FIREBASE_PRIVATE_KEY_PATH` | private key (pakai `\n`) atau path file di luar public_html |
| `FIREBASE_WEB_API_KEY`                                      | Web API key untuk verifikasi email/password                 |
| `NODE_ENV`                                                  | `production` di server                                      |
| `APP_BASE_URL`                                              | URL publik aplikasi                                         |
| `UPLOAD_DIR`                                                | folder scan privat, **di luar public_html**                 |
| `LOG_DIR`                                                   | folder log error                                            |

Lihat `.env.example` untuk daftar lengkap (sesi, rate limit, trust proxy).

## Deploy ke cPanel (Passenger)

1. **Upload aplikasi** ke folder di luar `public_html`, misalnya `/home/USER/siprima`.
2. **Buat aplikasi Node.js** di cPanel → _Setup Node.js App_:
   - Application root: `/home/USER/siprima`
   - Application URL: domain/subdomain aplikasi
   - Application startup file: `passenger.cjs`
   - Node version: 20 atau lebih baru
3. **Environment variables**: salin seluruh isi `.env` ke panel Environment Variables cPanel. Jangan mengunggah `.env` ke folder publik.
4. **Install dependency**:
   ```bash
   source /home/USER/nodevenv/siprima/20/bin/activate
   cd /home/USER/siprima
   npm ci --omit=dev
   ```
5. **Folder privat**:
   ```bash
   mkdir -p /home/USER/siprima-storage/scan /home/USER/siprima-storage/logs
   chmod 750 /home/USER/siprima-storage /home/USER/siprima-storage/scan
   ```
   Pastikan `UPLOAD_DIR` dan `LOG_DIR` menunjuk ke folder tersebut.
6. **Restart** aplikasi dari cPanel (_Restart_) atau:
   ```bash
   touch /home/USER/siprima/tmp/restart.txt
   ```
7. Buka URL aplikasi, login dengan akun admin hasil `seed-admin`.

Catatan:

- `public/` adalah satu-satunya folder yang boleh diakses langsung. Jangan menaruh `.env`, service account, atau `storage/` di dalamnya.
- Set `TRUST_PROXY=1` agar cookie `Secure` dan rate limit bekerja di balik proxy cPanel.

## Service account

1. Firebase Console → Project settings → Service accounts → **Generate new private key**.
2. Simpan JSON di luar `public_html`, mis. `/home/USER/siprima-secrets/service-account.json`, lalu set:
   ```env
   FIREBASE_PRIVATE_KEY_PATH=/home/USER/siprima-secrets/service-account.json
   ```
   atau tempel isi `private_key` ke `FIREBASE_PRIVATE_KEY` dengan newline sebagai `\n`.
3. Batasi permission file: `chmod 600`.
4. Rotasi key bila pernah terekspos; hapus key lama di Firebase Console.

## Aturan keamanan Firebase

Terapkan `firestore.rules` dan `storage.rules` (keduanya **deny-all**):

```bash
firebase deploy --only firestore:rules,storage:rules
```

Karena semua akses memakai Admin SDK, client langsung harus selalu ditolak. Indeks komposit lama tetap dipakai; terapkan dengan:

```bash
firebase deploy --only firestore:indexes
```

## Ringkasan API

| Metode       | Endpoint                                                             | Akses                       |
| ------------ | -------------------------------------------------------------------- | --------------------------- |
| GET          | `/api/auth/csrf`                                                     | publik (token CSRF)         |
| POST         | `/api/auth/login`                                                    | publik + rate limit         |
| POST         | `/api/auth/logout`                                                   | login                       |
| GET          | `/api/auth/session`                                                  | login                       |
| GET/POST     | `/api/surat-masuk`, `/:id`, `/:id/berkas`                            | login; tulis: admin         |
| POST         | `/api/surat-masuk/:id/disposisi`                                     | admin, pimpinan             |
| POST         | `/api/surat-masuk/:id/tindak-lanjut`                                 | bidang terkait              |
| GET/POST/PUT | `/api/surat-keluar`                                                  | login; tulis: admin, bidang |
| POST         | `/api/surat-keluar/:id/{batal,koreksi,kirim,pakai-ulang-nomor,scan}` | sesuai peran                |
| GET          | `/api/surat-{masuk,keluar}/export`                                   | login, maks. 5000 baris     |
| GET          | `/api/dashboard`, `/api/laporan/*`                                   | admin, pimpinan             |
| GET/POST/PUT | `/api/users`                                                         | admin                       |
| GET/POST/PUT | `/api/master/bidang`, `/api/master/nomor`                            | baca: login; tulis: admin   |
| GET/PUT      | `/api/pengaturan`                                                    | login; tulis: admin         |
| GET          | `/api/audit`                                                         | admin                       |
| GET          | `/api/nomor/cari`, `/verifikasi`                                     | login / admin+pimpinan      |

Semua respons berbentuk:

```json
{ "status": "success|error", "message": "...", "data": null, "errors": null }
```

## Pengujian

```bash
npm run lint
npm test
```

Cakupan default:

- kontrak HTTP: 401 tanpa sesi, 403 tanpa CSRF, 400 validasi, 404, header keamanan;
- aturan akses & IDOR: matriks peran dan `bolehBacaSurat`/`bolehUbahSuratKeluar`;
- rendering nomor, pagination, serialisasi;
- `public/` bebas SDK/konfigurasi/rahasia Firebase dan bebas CDN;
- rules Firestore/Storage deny-all.

Uji integrasi penuh (login, CRUD surat masuk, ID palsu, 403 bidang) bersifat opt-in karena menulis ke Firebase asli:

```bash
RUN_FIREBASE_TESTS=1 TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... \
TEST_BIDANG_EMAIL=... TEST_BIDANG_PASSWORD=... npm test
```

## Troubleshooting

| Gejala                                                               | Penyebab & solusi                                                                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Aplikasi 500 saat start, pesan "Konfigurasi environment tidak valid" | Variabel wajib belum diisi. Periksa panel Environment Variables cPanel lalu restart.                                  |
| `FIREBASE_PRIVATE_KEY_PATH tidak ditemukan`                          | Path salah atau file di luar izin user aplikasi. Gunakan path absolut.                                                |
| Login selalu "Email atau kata sandi salah"                           | `FIREBASE_WEB_API_KEY` salah, provider Email/Password belum aktif, atau user belum punya dokumen `users/{uid}` aktif. |
| Login sukses tetapi langsung logout                                  | Cookie `Secure` tanpa HTTPS, atau `TRUST_PROXY` salah. Set `TRUST_PROXY=1` di balik proxy cPanel.                     |
| 403 "Token keamanan tidak valid"                                     | Cookie CSRF hilang/berbeda. Muat ulang halaman; pastikan domain tidak berganti antara www dan non-www.                |
| Unggahan gagal 413                                                   | Ukuran melebihi `MAX_UPLOAD_MB`, atau limit `post_max_size`/`upload_max_filesize` PHP/cPanel.                         |
| Scan tidak bisa diunduh                                              | `UPLOAD_DIR` berbeda setelah restart, atau `fileId` tidak ada dan `fileUrl` kosong.                                   |
| `permission-denied` di log                                           | Ada kode yang masih mengakses Firestore langsung. Semua akses harus lewat API.                                        |
| Passenger restart loop                                               | Cek `stderr.log` cPanel, jalankan `node src/server.js` manual untuk melihat error env.                                |
| Rate limit terlalu ketat                                             | Sesuaikan `RATE_LIMIT_MAX` / `LOGIN_RATE_LIMIT_MAX`, lalu restart.                                                    |

Log error ditulis ke `LOG_DIR/LOG_FILE` dan juga stderr Passenger.

## Asumsi & hal yang perlu dikonfirmasi

**Asumsi**

- Data lama tetap memakai koleksi/field yang sama (`suratMasuk`, `suratKeluar`, `masterBidang`, `masterNomor`, `letter_numbers`, dst.).
- Peran lama dipetakan: `bidang` = operator, tanpa peran `petugas`/`pembaca`.
- Scan baru disimpan lokal privat; field `fileUrl` tetap dipakai untuk tautan Drive lama.
- Nomor surat dibuat lewat transaksi `letter_numbers`; reservasi kedaluwarsa otomatis.
- Pimpinan bersifat baca + disposisi, tidak membuat surat.

**Perlu konfirmasi**

- Apakah `pimpinan` boleh mengubah/mengoreksi surat keluar (saat ini hanya batal & koreksi nomor).
- Batas ukuran scan final (default 5 MB) dan kebutuhan antivirus/scan malware.
- Retensi audit log dan kebutuhan ekspor audit.
- Apakah `appsScriptUrl` masih diperlukan setelah upload lokal (dipakai untuk tautan legacy).
