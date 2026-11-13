# SiPrima — Agenda Surat Sekretariat Dinas

Aplikasi internal agenda surat masuk dan surat keluar. Frontend statis (HTML/CSS/ES Modules) disajikan oleh Express.js; seluruh akses data melewati API `/api` dengan **MySQL 8**. Browser tidak pernah memuat SDK, konfigurasi, atau kredensial database.

## Arsitektur

```
Browser (public/) → Express /api → route → controller → service → repository → MySQL 8
Google Apps Script → /api/cron → cron service → job registry → MySQL / storage
```

- Autentikasi: sesi opaque (cookie HttpOnly) dengan hash SHA-256 di tabel `sessions`; kata sandi bcrypt.
- Otorisasi: RBAC `admin`, `operator`, `pimpinan`, `bidang` + izin granular (`permissions`) per menu dan per tindakan (lihat, tambah, ubah, hapus, cetak/ekspor), ditegakkan di route dan service. Menu & tombol frontend mengikuti izin pengguna.
- Data: skema relasional MySQL (lihat `db/ERD.md` dan `docs/mapping-firestore-mysql.md`).
- Unggahan: multer menyimpan scan di folder privat di luar `public_html`; unduhan lewat endpoint ber-otorisasi.
- Keamanan: helmet + CSP, CORS opsional, rate limit (login & cron lebih ketat), validasi zod, CSRF double-submit, sanitasi output DOM, audit log.
- Cron: API `/api/cron` untuk Google Apps Script dengan kunci API ber-hash dan riwayat run.

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
│  ├─ config/                 # env, db (pool + transaksi), logger
│  ├─ constants/
│  ├─ routes/ controllers/ services/ repositories/
│  ├─ jobs/                   # registry job cron
│  ├─ middlewares/ validators/ utils/
├─ db/
│  ├─ migrations/             # 001_init.sql, 002_cron.sql, 003_fitur_surat.sql
│  └─ ERD.md
├─ docs/                      # audit Firebase & pemetaan ke MySQL
├─ scripts/                   # migrate, seed, audit-data
└─ tests/                     # unit, HTTP, statis, integrasi (opt-in)
```

## Prasyarat

- Node.js **20+** (cPanel: pilih versi Node 20/22).
- MySQL **8.0+** (InnoDB, `utf8mb4`).
- Tidak ada lagi dependency Firebase.

## Menjalankan lokal

```bash
cp .env.example .env      # Windows: copy .env.example .env
# isi kredensial MySQL pada .env
npm install
npm run migrate           # buat tabel
npm run seed              # peran, izin, admin, master, cron
npm run dev               # http://localhost:3000
```

Seeder membaca admin dari environment (tidak hardcoded):

```bash
ADMIN_EMAIL=admin@dinas.go.id ADMIN_PASSWORD='ubah-saya-min-8' ADMIN_NAMA='Admin SiPrima' npm run seed
```

Perintah lain:

| Perintah                        | Kegunaan                              |
| ------------------------------- | ------------------------------------- |
| `npm start`                     | jalankan server produksi              |
| `npm run dev`                   | server dengan watch                   |
| `npm run migrate`               | jalankan migrasi `up`                 |
| `npm run migrate:down`          | rollback migrasi terakhir             |
| `npm run seed`                  | seed idempoten                        |
| `npm run lint`                  | ESLint seluruh kode                   |
| `npm run format`                | Prettier                              |
| `npm test`                      | unit + HTTP + pemeriksaan statis      |
| `RUN_MYSQL_TESTS=1 npm test`    | tambah uji integrasi MySQL asli       |
| `node scripts/audit-data.js`    | laporan data read-only                |

## Konfigurasi environment

Semua konfigurasi runtime dibaca di `src/config/env.js`; koneksi database juga membaca `DB_*` di `src/config/db.js`. Variabel utama:

| Variabel                | Keterangan                                              |
| ----------------------- | ------------------------------------------------------- |
| `DB_HOST`, `DB_PORT`    | alamat MySQL (default `127.0.0.1:3306`)                 |
| `DB_USER`, `DB_PASSWORD`| kredensial MySQL                                        |
| `DB_NAME`               | nama database (default `siprima`)                       |
| `DB_SSL`                | `true` bila server MySQL mewajibkan TLS                 |
| `NODE_ENV`              | `production` di server                                  |
| `APP_BASE_URL`          | URL publik aplikasi                                     |
| `BASE_PATH`             | prefix subfolder, mis. `/siprima`; kosong = domain root |
| `SESSION_MAX_AGE_HOURS` | masa berlaku sesi (default 8 jam)                       |
| `BCRYPT_ROUNDS`         | biaya bcrypt (default 12)                               |
| `CORS_ORIGINS`          | origin dipisah koma; kosong = same-origin saja          |
| `CRON_API_KEY_HEADER`   | nama header kunci cron (default `x-cron-key`)           |
| `UPLOAD_DIR`            | folder scan privat, **di luar public_html**             |
| `BACKUP_DIR`            | folder snapshot job `export_snapshot`                   |
| `LOG_DIR`               | folder log error                                        |

Lihat `.env.example` untuk daftar lengkap (rate limit, trust proxy, reset password, cron).

## Migrasi & seed

```bash
npm run migrate            # menerapkan semua migrasi yang belum jalan
npm run migrate:down       # rollback migrasi terakhir
npm run seed               # idempoten; aman dijalankan berulang
```

Seeder membuat:

- peran `admin`, `operator`, `pimpinan`, `bidang` dan izin granular;
- admin awal dari `ADMIN_EMAIL` / `ADMIN_PASSWORD` (minimal 8 karakter);
- master bidang awal (`SEED_BIDANG_JSON` atau `SEK`);
- master nomor awal (SK, SE, LAINNYA) — tanpa kolom format;
- pengaturan default;
- job cron dan (opsional) kunci API awal dari `CRON_SEED_KEY`.

## API cron (Google Apps Script)

Semua endpoint di bawah `/api/cron`. Kunci dikirim lewat header `x-cron-key` (dapat diubah via `CRON_API_KEY_HEADER`). Kunci disimpan sebagai SHA-256 di `cron_api_keys`.

| Metode | Endpoint                  | Keterangan                                              |
| ------ | ------------------------- | ------------------------------------------------------- |
| GET    | `/api/cron/health`        | publik, cek status API                                  |
| GET    | `/api/cron/jobs`          | daftar job + status aktif                               |
| POST   | `/api/cron/run/:job_name` | mulai job secara async, balas `202 { run_id }`          |
| GET    | `/api/cron/runs/:run_id`  | status & hasil satu run                                 |
| GET    | `/api/cron/runs`          | riwayat; filter `?job_name=&limit=`                     |

Perilaku:

- Job berjalan di background; respons awal `202` berisi `run_id`.
- Job yang sama tidak dapat berjalan bersamaan (lock baris `cron_jobs` + status `queued/running`) → `409`.
- Job nonaktif atau kunci tidak berizin → `409` / `403`.
- Status run: `queued`, `running`, `success`, `failed`.
- Job bawaan: `cleanup_expired_reservations`, `cleanup_orphan_uploads`, `export_snapshot`, `audit_data`.

Contoh Apps Script:

```javascript
const respons = UrlFetchApp.fetch('https://domain-anda/api/cron/run/audit_data', {
  method: 'post',
  headers: { 'x-cron-key': 'KUNCI_RAHASIA' },
  muteHttpExceptions: true
});
Logger.log(respons.getContentText());
```

## Deploy ke cPanel (Passenger)

1. **Upload aplikasi** ke folder di luar `public_html`, misalnya `/home/USER/siprima`.
2. **Buat aplikasi Node.js** di cPanel → _Setup Node.js App_:
   - Application root: `/home/USER/siprima`
   - Application URL: domain/subdomain aplikasi
   - Application startup file: `passenger.cjs`
   - Node version: 20 atau lebih baru
   - Jika **Application URL** memakai subfolder (mis. `domain/siprima`), set `BASE_PATH=/siprima` di Environment Variables. Tanpa ini halaman akan 404.
3. **Environment variables**: salin seluruh isi `.env` ke panel Environment Variables cPanel. Jangan mengunggah `.env` ke folder publik.
4. **Install dependency**:
   ```bash
   source /home/USER/nodevenv/siprima/20/bin/activate
   cd /home/USER/siprima
   npm ci --omit=dev
   ```
5. **Database**: buat database & user MySQL di cPanel, lalu jalankan:
   ```bash
   npm run migrate
   npm run seed
   ```
6. **Folder privat**:
   ```bash
   mkdir -p /home/USER/siprima-storage/scan /home/USER/siprima-storage/backup /home/USER/siprima-storage/logs
   chmod 750 /home/USER/siprima-storage /home/USER/siprima-storage/scan
   ```
   Pastikan `UPLOAD_DIR`, `BACKUP_DIR`, dan `LOG_DIR` menunjuk ke folder tersebut.
7. **Restart** aplikasi dari cPanel (_Restart_) atau:
   ```bash
   touch /home/USER/siprima/tmp/restart.txt
   ```
8. Buka URL aplikasi, login dengan akun admin hasil `npm run seed`.

Catatan:

- `public/` adalah satu-satunya folder yang boleh diakses langsung. Jangan menaruh `.env`, dump database, atau `storage/` di dalamnya.
- Set `TRUST_PROXY=1` agar cookie `Secure` dan rate limit bekerja di balik proxy cPanel.

## Ringkasan API

| Metode       | Endpoint                                                             | Akses                          |
| ------------ | -------------------------------------------------------------------- | ------------------------------ |
| GET          | `/api/auth/csrf`                                                     | publik (token CSRF)            |
| POST         | `/api/auth/login`, `/register`, `/refresh`, `/logout`                | publik/login + rate limit      |
| POST         | `/api/auth/password/forgot`, `/password/reset`                       | publik + rate limit            |
| PUT          | `/api/auth/password`                                                 | login, izin `sandi.ubah`       |
| GET          | `/api/auth/session`                                                  | login                          |
| GET/POST/PUT | `/api/surat-masuk`, `/:id`, `/:id/berkas`                            | izin `surat_masuk.*` per aksi  |
| POST         | `/api/surat-masuk/:id/disposisi`                                     | izin `surat_masuk.disposisi`   |
| POST         | `/api/surat-masuk/:id/tindak-lanjut`                                 | izin `surat_masuk.tindak_lanjut` |
| GET/POST/PUT | `/api/surat-keluar`                                                  | izin `surat_keluar.*` per aksi |
| POST         | `/api/surat-keluar/:id/{batal,koreksi,kirim,pakai-ulang-nomor,scan}` | izin `surat_keluar.*` per aksi |
| GET/POST/PUT | `/api/sk` (Surat Keputusan), `/api/se` (Surat Edaran)                | izin `sk.*` / `se.*` per aksi  |
| GET          | `/api/surat-{masuk,keluar}/export`                                   | izin `.cetak`                  |
| GET          | `/api/dashboard`, `/api/laporan/*`                                   | izin `dashboard.baca`/`laporan.baca` |
| GET/POST/PUT | `/api/users`                                                         | admin                          |
| GET          | `/api/roles`, `PUT /api/roles/:nama`                                 | admin                          |
| GET/POST/PUT | `/api/master/bidang`, `/api/master/nomor`                            | baca: login; tulis: admin      |
| GET/POST/PUT | `/api/master/asal-tujuan` (`/cari`, `/halaman`)                      | baca: login; tulis: admin      |
| GET/PUT      | `/api/pengaturan`                                                    | login; tulis: admin            |
| GET          | `/api/audit`                                                         | admin                          |
| GET          | `/api/menus`                                                         | login (dipisah per izin pengguna) |
| GET          | `/api/menus/semua`                                                   | admin + izin `menu.kelola`     |
| POST/PUT/DEL | `/api/menus`, `/api/menus/:id`                                       | admin + izin `menu.kelola`     |
| GET          | `/api/nomor/cari`, `/verifikasi`                                     | login / admin+pimpinan         |
| GET/POST     | `/api/cron/*`                                                        | kunci API cron                 |

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
- registry & validator cron;
- `public/` bebas SDK/konfigurasi/rahasia Firebase dan bebas CDN;
- berkas konfigurasi Firebase lama sudah tidak ada di repo.

Uji integrasi penuh (login, CRUD surat masuk, ID palsu, 403 bidang, cron) bersifat opt-in karena menulis ke MySQL asli:

```bash
RUN_MYSQL_TESTS=1 TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... \
TEST_BIDANG_EMAIL=... TEST_BIDANG_PASSWORD=... npm test
```

## Troubleshooting

| Gejala                                                               | Penyebab & solusi                                                                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Aplikasi 500 saat start, pesan "Konfigurasi environment tidak valid" | Variabel wajib belum diisi. Periksa panel Environment Variables cPanel lalu restart.                                  |
| `ECONNREFUSED` / `ER_ACCESS_DENIED_ERROR`                            | `DB_HOST`/`DB_USER`/`DB_PASSWORD` salah, MySQL belum jalan, atau user belum diberi akses ke `DB_NAME`.                |
| `ER_NO_SUCH_TABLE`                                                   | Migrasi belum dijalankan. Jalankan `npm run migrate`.                                                                 |
| Login selalu "Email atau kata sandi salah"                           | Admin belum di-seed, `aktif = 0`, atau kata sandi salah. Jalankan `npm run seed` dengan `ADMIN_*` yang benar.         |
| Login sukses tetapi langsung logout                                  | Cookie `Secure` tanpa HTTPS, atau `TRUST_PROXY` salah. Set `TRUST_PROXY=1` di balik proxy cPanel.                     |
| 403 "Token keamanan tidak valid"                                     | Cookie CSRF hilang/berbeda. Muat ulang halaman; pastikan domain tidak berganti antara www dan non-www.                |
| Cron 401                                                             | Header `x-cron-key` tidak dikirim atau kunci sudah dicabut. Buat kunci baru lewat seeder/DB.                          |
| Cron 409 "Job yang sama masih berjalan"                              | Tunggu run sebelumnya selesai; cek `GET /api/cron/runs?job_name=...`.                                                 |
| Unggahan gagal 413                                                   | Ukuran melebihi `MAX_UPLOAD_MB`, atau limit `post_max_size`/`upload_max_filesize` PHP/cPanel.                         |
| Scan tidak bisa diunduh                                              | `UPLOAD_DIR` berbeda setelah restart, atau `fileId` tidak ada dan `fileUrl` kosong.                                   |
| `ERR_MODULE_NOT_FOUND: Cannot find package 'express'` saat `npm run dev`/start | `node_modules` belum terpasang atau tidak lengkap. Aktifkan dulu virtualenv dari halaman **Setup Node.js App** (baris `source /home/USER/nodevenv/.../bin/activate`), lalu `cd` ke Application Root dan jalankan `npm ci`. Cek dengan `ls node_modules/express/package.json`. Jangan menjalankan `npm run dev` di server produksi. |
| URL `/siprima/` menampilkan "Halaman tidak ditemukan." | Aplikasi dipasang di subfolder tetapi `BASE_PATH` belum diisi. Set `BASE_PATH=/siprima` di Environment Variables lalu **Restart**. |
| Cookie sesi tidak tersimpan / login balik ke halaman login | Akses lewat HTTP padahal `NODE_ENV=production` (cookie `Secure` hanya dikirim via HTTPS). Aktifkan **Force HTTPS Redirect** di cPanel dan buka `https://...`. |
| "Can't acquire lock for app: public_html/siprima"                    | Ada proses lain yang masih memegang lock: `npm install`/restart sebelumnya belum selesai, atau `node src/server.js` / `npm run dev` dijalankan di Terminal dan dibiarkan hidup. Hentikan proses itu, rename file `.lock`, lalu **Restart**. Jangan pakai **Run NPM Script → start** untuk aplikasi web. |
| Setelah **Run NPM Install** muncul "check availability … content type before operation text/html … after text/html; charset=utf-8" | Ini **peringatan, bukan kegagalan**. cPanel membandingkan respons sebelum aplikasi hidup (halaman default LiteSpeed `text/html`) dengan sesudahnya (Express `text/html; charset=utf-8`). Modul sudah terpasang; klik **Restart** lalu buka URL aplikasi. |
| Passenger restart loop                                               | Cek `stderr.log` cPanel, jalankan `node src/server.js` manual untuk melihat error env.                                |
| Rate limit terlalu ketat                                             | Sesuaikan `RATE_LIMIT_MAX` / `LOGIN_RATE_LIMIT_MAX` / `CRON_RATE_LIMIT_MAX`, lalu restart.                            |

Log error ditulis ke `LOG_DIR/LOG_FILE` dan juga stderr Passenger.

## Asumsi & hal yang perlu dikonfirmasi

**Asumsi**

- Migrasi bersifat fresh: tidak ada data atau pengguna Firebase yang dipindahkan (FASE 5 dilewati).
- ID internal memakai `BIGINT UNSIGNED AUTO_INCREMENT`; `cron_runs.run_id` memakai UUID publik.
- Peran: `admin` (akses penuh), `operator`/staf (tambah & ubah menu yang diizinkan), `pimpinan`/viewer (lihat & cetak saja), `bidang` (scoping per bidang). Izin per menu dan per tindakan disimpan di tabel `permissions`/`role_permissions` dan dapat diatur di halaman **Peran & Hak Akses**.
- Navigasi bersifat dinamis: pohon menu (induk/anak) disimpan di tabel `menus`, tiap menu dipetakan ke satu izin (`menus.izin`), dan hanya menu yang izinnya dimiliki pengguna yang tampil. Menu dapat diatur di **Menu Navigasi** (izin `menu.kelola`). Setiap pengguna dapat mengganti kata sandinya sendiri di **Setting → Ganti Password** (izin `sandi.ubah`).
- Tanggal memakai datepicker Indonesia buatan sendiri (tanpa CDN); nilai ditampilkan sebagai `1 Maret 2026` dan dikirim ke API sebagai ISO.
- Unggahan scan bersifat opsional dengan dua pilihan: unggah berkas atau tempel tautan Google Drive.
- Scan baru disimpan lokal privat; field `fileUrl` tetap dipakai untuk tautan Drive lama.
- Surat Keputusan (SK) dan Surat Edaran (SE) dikelola sebagai menu & tabel tersendiri (satu tabel `surat_khusus` dengan kolom `jenis`).
- Master asal & tujuan hanya menyimpan `kode` + `nama`, dipakai sebagai saran autocomplete pada form surat masuk.
- Nomor surat dibuat lewat transaksi `letter_numbers`; reservasi kedaluwarsa otomatis. Format nomor diturunkan dari golongan (`defaultFormatGolongan`), bukan disimpan di master.
- Pimpinan bersifat baca + disposisi + ubah surat masuk, tidak membuat surat keluar.
- Tidak ada realtime (`onSnapshot`); frontend memakai refetch manual.
- Reset password tidak mengirim email; token hanya dikembalikan bila `AUTH_EXPOSE_RESET_TOKEN=true`.

**Perlu konfirmasi**

- Apakah `pimpinan` boleh mengubah/mengoreksi surat keluar (saat ini hanya batal & koreksi nomor).
- Batas ukuran scan final (default 5 MB) dan kebutuhan antivirus/scan malware.
- Retensi audit log dan kebutuhan ekspor audit.
- Apakah `appsScriptUrl` masih diperlukan setelah upload lokal (dipakai untuk tautan legacy).
- Kebijakan rotasi kunci cron dan apakah perlu endpoint admin untuk mengelola kunci.
