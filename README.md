# SiPrima — Agenda Surat Sekretariat Dinas

Aplikasi web internal untuk surat masuk dan surat keluar. Implementasi memakai HTML/CSS/JavaScript ES Modules tanpa proses build, Firebase Authentication + Cloud Firestore, dan Google Apps Script untuk arsip Drive.

## Status pengerjaan

Seluruh fase 1–6 selesai secara kode: login dan guard, kelola pengguna, surat masuk, disposisi/inbox/tindak lanjut, surat rahasia, arsip Drive, master bidang/nomor, penomoran transaction, surat keluar dan pembatalan, ekspor Excel, audit log, backup/restore Apps Script, serta dokumentasi pengujian. UI menggunakan tema ocean blue dengan aksen orange, formulir tambah/edit memakai modal dan native date picker tanpa jam, tabel memakai cursor pagination, kode bidang pengguna dipilih dari master bidang, `{UNIT}` nomor surat diambil dari Master Bidang berdasarkan bidang akun pengguna yang sedang login, pilihan tanda tangan TTE/BASAH, dan impor CSV melalui tab Admin.

## Menjalankan lokal

Karena browser memblokir sebagian import module dari `file://`, jalankan melalui server statis sederhana. Contoh tanpa dependency proyek:

```text
python -m http.server 8000
```

Buka `http://localhost:8000/`. Untuk GitHub Pages seluruh tautan sudah relatif.

## Setup dari nol

1. Buat project di Firebase Console.
2. Aktifkan Authentication > Sign-in method > Email/Password.
3. Buat Cloud Firestore dalam production mode.
4. Tambahkan aplikasi Web dan salin konfigurasi ke `assets/js/firebase-config.js`. Nilai tersebut adalah konfigurasi klien publik; jangan memasukkan secret, service-account key, password, atau token.
5. Terbitkan rules dan indeks:

   ```text
   firebase deploy --only firestore:rules,firestore:indexes
   ```

   Perintah tersebut memerlukan Firebase CLI dan file konfigurasi proyek yang dapat dibuat saat `firebase init`. Repository ini tidak membutuhkan npm atau build tool untuk runtime situs.

6. Buat akun admin pertama dan dokumen profilnya mengikuti [seed/seed.md](seed/seed.md). Rules baru mengizinkan admin aktif mengelola profil pengguna; sebelum admin pertama ada, buat dokumen tersebut melalui Firebase Console.
7. Isi tiga bidang dan master nomor sesuai dinas. Placeholder `[NAMA DINAS]`, `[NAMA DINAS SINGKAT]`, nama bidang, dan kode bidang harus diganti.
8. Deploy repository ke GitHub Pages. Pastikan URL situs dipakai saat membatasi API key Firebase di Google Cloud Console: HTTP referrer `https://USER.github.io/*` (tambahkan URL preview/localhost hanya bila dibutuhkan saat pengembangan).
9. Deploy `apps-script/Code.gs` sebagai Web App dengan **Execute as Me** dan akses **Anyone**. Di Script Properties isi `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, dan `DRIVE_ROOT_FOLDER_ID`. Folder ID adalah folder induk arsip yang tetap privat. Salin URL Web App ke dokumen `pengaturan/umum` dengan field `appsScriptUrl`.
10. Untuk backup, isi `BACKUP_FOLDER_ID`, `ADMIN_EMAIL`, dan opsional `KIRIM_EMAIL_SUKSES=true`. Deploy `apps-script/Backup.gs` pada project Apps Script yang sama, lalu jalankan `pasangTrigger()` sekali. Scope yang diperlukan sudah dicantumkan di `apps-script/appsscript.json`.
11. Endpoint menerima POST `Content-Type: text/plain`; token Firebase selalu berada di body JSON. Uji upload dan unduh dengan akun admin sebelum dipakai bidang.

## Peran

- `admin`: sekretariat, mengelola pengguna dan seluruh data.
- `pimpinan`: melihat data yang diizinkan dan memberi disposisi pada fase disposisi.
- `bidang`: akses surat rahasia hanya jika kode bidang tercantum di `aksesBidang`.

Akun `aktif: false` ditolak oleh guard klien dan rules Firestore. Guard hanya membantu pengalaman pengguna; keputusan akses tetap ditegakkan oleh rules dan endpoint Apps Script.

## Kasus uji rules Fase 1

Uji di Firebase Emulator atau Rules Playground setelah membuat data pengguna dan surat contoh:

| Kasus | Harapan |
|---|---|
| Admin aktif membaca/mengelola profil pengguna | Diizinkan |
| Bidang membaca profilnya sendiri | Diizinkan |
| Bidang membaca profil pengguna lain | Ditolak |
| Bidang mengubah `role` atau `aktif` profil | Ditolak |
| Akun nonaktif membaca koleksi apa pun | Ditolak |
| Surat biasa dibaca akun aktif | Diizinkan |
| Surat rahasia dibaca admin/pimpinan | Diizinkan |
| Bidang A membaca rahasia untuk Bidang B | Ditolak |
| Surat apa pun dihapus | Ditolak |

Fase berikutnya akan menambahkan emulator test untuk kombinasi admin, pimpinan, Bidang A, dan Bidang B serta skenario surat masuk/keluar rahasia.

## Uji manual fitur

1. Isi tiga dokumen `masterBidang` aktif, lalu login sebagai admin.
2. Buat surat biasa. Pastikan nomor agenda berurutan per tahun dan status awal `Baru`.
3. Buat surat rahasia, pilih Bidang A, lalu pastikan akun Bidang A dapat melihatnya dan Bidang B tidak melihatnya.
4. Uji filter status, sifat, rentang tanggal, pencarian awalan, tombol halaman berikutnya/sebelumnya, dan detail.
5. Upload PDF/JPG/PNG sampai 5 MB melalui Web App. Pastikan file berada di folder privat `Masuk/{tahun}/{bulan}`; surat rahasia berada di `Masuk/Rahasia/{tahun}/{bulan}`.
6. Uji unduh sebagai admin dan bidang yang dituju. Uji unduh sebagai bidang yang tidak dituju; hasilnya harus ditolak.
7. Uji langsung Firestore dengan akun bidang yang tidak dituju; query dokumen rahasia harus gagal karena `allow read` memanggil `boleh(resource.data)`.

8. Admin/pimpinan membuka detail surat masuk, memilih bidang, lalu klik **Simpan dan Disposisikan**. Pastikan surat masuk ke inbox bidang.
9. Bidang membuka inbox dan menandai tindak lanjut. Status berubah menjadi `Selesai` setelah semua bidang tujuan berstatus `Sudah`.
10. Admin mengisi master nomor, lalu dua akun menyimpan surat keluar bersamaan. Ikuti prosedur lengkap di [tests/phase6-cases.md](tests/phase6-cases.md).
11. Ekspor hasil filter ke Excel, periksa audit log, jalankan backup dan restore dry-run.

## Penyelesaian fase

- Fase 1: struktur, login, guard, pengguna, rules awal.
- Fase 2: surat masuk, rahasia, pagination, Drive.
- Fase 3: disposisi, inbox, tindak lanjut, dashboard.
- Fase 4: master bidang/nomor, surat keluar, nomor transaction, pembatalan.
- Fase 5: ekspor Excel, audit, backup, restore.
- Fase 6: perapihan responsif, matriks uji, dan dokumentasi final.

Validasi otomatis yang tersedia di workspace: pemeriksaan sintaks seluruh JavaScript/Apps Script dan parsing JSON. Firebase CLI/Emulator harus dijalankan di lingkungan developer karena tidak terpasang pada environment pengerjaan ini.

## Catatan keamanan

- Jangan menggunakan Firestore test mode di lingkungan produksi.
- Data pengguna ditulis lewat `textContent`/DOM API, bukan HTML mentah dari input pengguna.
- Folder Drive tidak dibagikan publik. Semua upload/unduh akan memeriksa token Firebase dan hak akses yang sama dengan rules.
- Nomor surat keluar akan dibuat lewat transaction Firestore agar dua penyimpanan bersamaan tidak menghasilkan nomor ganda.
