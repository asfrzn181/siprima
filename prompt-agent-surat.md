# PROMPT UNTUK AI AGENT: Aplikasi Surat Masuk dan Surat Keluar Sekretariat Dinas

Salin seluruh isi di bawah garis ini ke AI Agent Anda (Claude Code, Cursor, dan sejenisnya).

---

## 1. PERAN DAN TUJUAN

Kamu adalah software engineer senior. Bangun aplikasi web internal **Surat Masuk dan Surat Keluar** untuk sekretariat **[NAMA DINAS]**. Aplikasi menggantikan buku agenda manual: mencatat surat, mendisposisikan ke bidang, memantau tindak lanjut, menerbitkan nomor surat keluar otomatis, dan mengarsipkan scan surat.

Aplikasi bersifat **internal**. Isi data surat hanya: **No. Surat, Hal, Isi Ringkas** (bukan dokumen lengkap). Jangan menambah field di luar spesifikasi.

## 2. BATASAN TEKNOLOGI (WAJIB)

- **Frontend:** HTML, CSS, JavaScript murni (ES Modules). **Tanpa build tool, tanpa npm, tanpa framework yang butuh kompilasi.** Semua pustaka dimuat lewat **CDN**.
- **Database dan Auth:** Firebase (Cloud Firestore + Authentication email/password), memakai **Firebase JS SDK v10+ modular** dari CDN (`https://www.gstatic.com/firebasejs/...`).
- **Hosting:** GitHub Pages (static). Semua path harus **relatif** supaya jalan di `https://user.github.io/repo/`.
- **Upload file dan backup:** Google Apps Script (Web App + trigger waktu).
- **Penyimpanan file scan:** Google Drive (lewat Apps Script). **Jangan memakai Firebase Storage.**
- **Pustaka CDN yang disarankan:** Tailwind CSS (CDN) atau Bootstrap 5, SweetAlert2, SheetJS (ekspor Excel), Tabulator atau tabel buatan sendiri.
- Antarmuka **Bahasa Indonesia**, **responsif** (nyaman di HP), sederhana, dengan lencana status berwarna.
- Zona waktu **Asia/Jakarta** (WIB). Format tanggal tampilan `dd-mm-yyyy`, simpan sebagai `Timestamp` Firestore.

## 3. PERAN PENGGUNA

Sekitar 5 akun. Peran disimpan di `users/{uid}` (field `role`, `bidang`, `nama`, `aktif`).

| Peran | Hak |
|---|---|
| `admin` (sekretariat) | Input surat masuk dan surat keluar, **mencatat disposisi** sesuai arahan Kadis (sering dari berkas fisik), upload scan, kelola master data dan akun, lihat semua termasuk rahasia, batalkan surat |
| `pimpinan` (Kadis, **opsional**) | Lihat semua termasuk rahasia, boleh memberi disposisi langsung di aplikasi |
| `bidang` (3 bidang, masing-masing punya akun) | Lihat surat biasa dan surat rahasia yang ditujukan ke bidangnya, **mengisi tindak lanjut**, **membuat surat keluar atas nama bidangnya** dan mengubah miliknya sendiri |

Akun dibuat oleh admin. Tidak ada registrasi mandiri. Akun `aktif:false` tidak boleh masuk.

## 4. FITUR

### 4.1 Surat Masuk
Field: `noAgenda` (otomatis), `tglTerima`, `tglSurat`, `noSurat`, `asal`, `hal`, `isiRingkas`, `sifat` (`biasa` | `rahasia`), `fileId` (Drive), `status`, `dibuatOleh`, `dibuatPada`.

- Hanya admin yang membuat surat masuk. Nomor agenda berurutan per tahun (lewat counter dan transaction).
- Status: `Baru` → `Didisposisikan` → `Selesai`.
- Daftar dengan pencarian (no. surat, hal, asal), filter (tanggal, sifat, status, bidang tujuan), **pagination** (`limit` + `startAfter`, 20 per halaman). Jangan memuat seluruh koleksi.
- Tombol **Ekspor Excel** pada daftar (hasil sesuai filter aktif).

### 4.2 Disposisi (sederhana, tanpa lembar cetak)
- Admin (atau pimpinan) mencentang **satu atau lebih bidang tujuan**, mengisi `diputuskanOleh` (Kadis / Sekretaris / lainnya, dari master) dan catatan opsional.
- Dua tombol pada formulir surat masuk: **"Simpan"** (status `Baru`) dan **"Simpan dan Disposisikan"** (pilih bidang, status langsung `Didisposisikan`).
- Saat disimpan, surat **langsung masuk ke inbox bidang tujuan**. Lencana angka di menu menunjukkan jumlah surat yang belum ditindaklanjuti.
- Struktur pada dokumen surat:
  ```
  disposisi: { kepada:[...kodeBidang], diputuskanOleh, dicatatOleh(uid, otomatis), tanggal, catatan }
  tindakLanjut: { bidang1:{status:'Belum'|'Sudah', tanggal, catatan}, ... }
  aksesBidang: [...kodeBidang]
  ```
- Tiap bidang tujuan menandai **Sudah ditindaklanjuti** dengan catatan singkat. Bila **semua** bidang tujuan sudah `Sudah`, status surat otomatis menjadi `Selesai`.
- Admin boleh mengoreksi bidang tujuan. Setiap perubahan **dicatat di audit log** (dari apa menjadi apa). Penandaan `Sudah` milik bidang tidak terhapus otomatis.
- Dashboard menampilkan: surat berstatus Baru, surat yang didisposisikan beserta bidang yang belum menindaklanjuti, dan jumlah per bulan.

### 4.3 Surat Keluar
Field: `noSurat` (otomatis), `jenisId`, `tglSurat`, `tujuan`, `hal`, `isiRingkas`, `sifat`, `fileId`, `bidangPembuat`, `dibuatOleh`, `status` (`Aktif` | `Dibatalkan`), `alasanBatal`, `aksesBidang`.

- **Admin dan bidang** dapat membuat surat keluar. Bidang hanya atas nama bidangnya sendiri (`bidangPembuat` diisi otomatis dari akun).
- **Nomor terbit langsung saat disimpan**, tanpa persetujuan admin. Scan/file final boleh diunggah belakangan.
- **Nomor tidak boleh diubah dan surat tidak boleh dihapus.** Bila batal dipakai, ubah status menjadi `Dibatalkan` dengan alasan wajib.
- Bidang boleh mengubah hal, tujuan, dan isi ringkas surat miliknya. Perubahan tercatat di audit log. Admin boleh mengubah semua.
- Tidak ada relasi balasan ke surat masuk.

### 4.4 Master Nomor Surat (format dari database)
Koleksi `masterNomor` (dikelola admin), satu dokumen per jenis surat:
```
nama:"Surat Biasa", format:"{KODE}/{URUT:3}/{UNIT}/{TAHUN}", kode:"800", unit:"Dinas", resetTahunan:true, aktif:true
```
Placeholder yang didukung: `{KODE}`, `{URUT:n}` (n digit, diisi nol di depan), `{UNIT}`, `{TAHUN}`, `{BULAN}`, `{BULAN_ROMAWI}`, `{BIDANG}` (kolom `kode` dari master bidang).

- Counter di `counters/{jenisId}_{tahun}` (field `last`), dinaikkan dengan **Firestore `runTransaction`**. Pembuatan dokumen surat dan kenaikan counter harus **dalam satu transaction** agar tidak ada nomor ganda atau nomor hilang.
- **Default:** satu urutan per jenis surat untuk seluruh dinas (bukan per bidang). Buat ini sebagai opsi di master (`urutanPerBidang: false`).
- Siapkan data awal master nomor dengan contoh: `800/001/Dinas/2026` (kode `800`, unit `[NAMA DINAS SINGKAT]`).

### 4.5 Master Data dan Admin
- `masterBidang`: `kode`, `nama`, `aktif` (3 bidang).
- `masterNomor` (4.4), pengaturan umum (nama dinas, URL Web App Apps Script).
- Kelola pengguna: buat akun, atur peran dan bidang, nonaktifkan.
- Lihat **audit log** (siapa, aksi, koleksi, docId, sebelum/sesudah, waktu).

### 4.5 Surat Rahasia (masuk dan keluar, aturan sama)
- `sifat:'biasa'` → semua akun yang login boleh membaca.
- `sifat:'rahasia'` → hanya `admin`, `pimpinan`, dan bidang yang tercantum di `aksesBidang`.
- Pada surat keluar rahasia, `aksesBidang` **wajib memuat bidang pembuat**.
- Pembatasan harus ada di **Firestore Security Rules** dan **di Apps Script (akses file)**. Menyembunyikan di UI saja tidak cukup.
- Query daftar untuk akun bidang dilakukan **dua kali** (`sifat == 'biasa'` dan `aksesBidang array-contains kodeBidang`), lalu digabung dan diurutkan di klien, karena Firestore tidak memfilter otomatis.

## 5. FIRESTORE SECURITY RULES

Hasilkan `firestore.rules` yang ketat (**bukan mode test**). Minimal:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function login() { return request.auth != null; }
    function me() { return get(/databases/$(db)/documents/users/$(request.auth.uid)).data; }
    function aktif() { return login() && me().aktif == true; }
    function role() { return me().role; }
    function bidang() { return me().get('bidang', ''); }
    function boleh(d) {
      return d.sifat == 'biasa'
          || role() in ['admin','pimpinan']
          || bidang() in d.get('aksesBidang', []);
    }

    match /users/{uid} {
      allow read: if aktif();
      allow write: if aktif() && role() == 'admin';
    }
    match /masterBidang/{id} { allow read: if aktif(); allow write: if aktif() && role()=='admin'; }
    match /masterNomor/{id}  { allow read: if aktif(); allow write: if aktif() && role()=='admin'; }
    match /pengaturan/{id}   { allow read: if aktif(); allow write: if aktif() && role()=='admin'; }

    match /suratMasuk/{id} {
      allow read: if aktif() && boleh(resource.data);
      allow create: if aktif() && role() == 'admin';
      allow update: if aktif() && (
        role() in ['admin','pimpinan']
        || (role()=='bidang' && request.resource.data.diff(resource.data)
              .affectedKeys().hasOnly(['tindakLanjut','status','diubahPada'])));
      allow delete: if false;
    }

    match /suratKeluar/{id} {
      allow read: if aktif() && boleh(resource.data);
      allow create: if aktif() && (role()=='admin'
        || (role()=='bidang' && request.resource.data.bidangPembuat == bidang()
            && (request.resource.data.sifat=='biasa'
                || bidang() in request.resource.data.get('aksesBidang', []))));
      allow update: if aktif() && (role()=='admin'
        || (role()=='bidang' && resource.data.bidangPembuat == bidang()
            && request.resource.data.noSurat == resource.data.noSurat
            && request.resource.data.bidangPembuat == resource.data.bidangPembuat));
      allow delete: if false;
    }

    // Counter hanya boleh naik tepat satu angka
    match /counters/{id} {
      allow read: if aktif();
      allow create: if aktif() && request.resource.data.last == 1;
      allow update: if aktif() && request.resource.data.last == resource.data.last + 1;
      allow delete: if false;
    }

    match /auditLog/{id} {
      allow read: if aktif() && role()=='admin';
      allow create: if aktif() && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;
    }
  }
}
```

Perbaiki dan lengkapi bila perlu (misalnya sinkronkan `noSurat` dengan counter memakai `getAfter`). **Uji di Firebase Emulator atau Rules Playground** untuk setiap peran (admin, pimpinan, bidang A, bidang B) pada surat biasa dan rahasia, dan sertakan daftar kasus ujinya.

## 6. GOOGLE APPS SCRIPT

Buat dua file: `apps-script/Code.gs` (upload/unduh file) dan `apps-script/Backup.gs`.

### 6.1 Web App (Deploy: Execute as *Me*, Access *Anyone*, tetapi **setiap permintaan wajib token**)
- Klien mengirim `POST` dengan `Content-Type: text/plain` (hindari preflight CORS), body JSON: `{aksi, idToken, ...}`. Token dikirim di **body**, bukan header.
- Verifikasi `idToken` ke Identity Toolkit REST (`accounts:lookup`, memakai API key Firebase) untuk mendapat `uid`. Lalu baca `users/{uid}` dan dokumen surat lewat **Firestore REST API** memakai `ScriptApp.getOAuthToken()` (scope `datastore`). Tolak bila akun tidak aktif.
- Aksi:
  - `upload`: `{jenis:'masuk'|'keluar', suratId, namaFile, mimeType, dataBase64}`. Validasi tipe (PDF/JPG/PNG), ukuran ≤ 5 MB, dan hak: admin boleh semua. Bidang hanya untuk surat keluar milik bidangnya. Simpan ke folder `Arsip Surat/{Masuk|Keluar}/{tahun}/{bulan}/`, dengan folder **terpisah** untuk surat rahasia. Kembalikan `fileId`. **Jangan** ubah sharing file menjadi publik.
  - `unduh`: `{jenis, suratId}`. Cek hak baca dengan logika yang **sama persis** dengan `boleh()` pada rules, lalu kembalikan `{namaFile, mimeType, dataBase64}`. Klien membentuk Blob dan membukanya.
- Respons selalu JSON via `ContentService`. Tangani error dengan pesan jelas. Folder induk ID dan API key disimpan di `PropertiesService`, **bukan** di kode.

### 6.2 Autobackup
- Trigger waktu harian pukul 01:00 WIB (sediakan fungsi `pasangTrigger()` sekali jalan).
- Baca semua koleksi (`suratMasuk`, `suratKeluar`, `users`, `master*`, `counters`, `auditLog`) lewat Firestore REST dengan **pagination** (`pageToken`). Simpan ke **satu file JSON** bertanggal (`backup_YYYY-MM-DD.json`) di folder Drive **khusus admin**.
- Rekap **Google Sheets hanya untuk surat biasa**. Surat rahasia **hanya** ada di JSON.
- Backup tidak menyalin isi scan, cukup `fileId`.
- Simpan **30 backup terakhir**, hapus yang lebih lama.
- `try/catch` seluruhnya. Bila gagal **kirim email** ke admin lewat `MailApp` (berisi pesan error). Sertakan juga email ringkas bila sukses (opsional lewat properti).
- Sediakan fungsi `restoreDariJson(fileId)` (dengan mode simulasi/dry-run) dan dokumentasikan prosedur uji restore.

## 7. STRUKTUR PROYEK

```
/index.html            login
/dashboard.html        ringkasan + surat menunggu tindak lanjut
/surat-masuk.html      daftar, tambah, detail, disposisi
/surat-keluar.html     daftar, tambah, detail
/inbox.html            surat yang ditujukan ke bidang saya
/admin.html            pengguna, master bidang, master nomor, audit log
/assets/css/app.css
/assets/js/firebase-config.js   (config Firebase, ada komentar cara mengisi)
/assets/js/auth.js     login, guard halaman, peran
/assets/js/db.js       akses Firestore, pagination, query rahasia
/assets/js/nomor.js    parser format dan transaction penomoran
/assets/js/drive.js    klien Apps Script (upload/unduh)
/assets/js/ui.js       komponen: tabel, modal, lencana, toast
/assets/js/utils.js    tanggal, romawi, ekspor Excel
/apps-script/Code.gs, Backup.gs, appsscript.json
/firestore.rules, /firestore.indexes.json
/seed/seed.md          langkah dan data awal (akun admin pertama, master bidang/nomor)
/README.md             panduan lengkap (lihat bagian 9)
```

Setiap halaman memuat guard: belum login → ke `index.html`. Menu menyesuaikan peran, tetapi **penegakan hak tetap di rules/Apps Script**.

## 8. KEAMANAN (WAJIB DIPATUHI)

1. Config Firebase di klien boleh publik. **Jangan simpan** secret, service account key, token, atau password di repo.
2. Dokumentasikan pembatasan **API key** di Google Cloud Console (HTTP referrer `https://USER.github.io/*`).
3. Hindari `innerHTML` dengan data pengguna. Gunakan `textContent` atau escape untuk mencegah XSS.
4. Validasi input di klien **dan** rules (tipe, panjang, nilai enum `sifat`/`status`).
5. Folder Drive tidak pernah dibagikan publik. Akses file hanya lewat Web App yang memeriksa hak.
6. Hindari listener `onSnapshot` yang berlebihan demi kuota. Pakai pembacaan sekali dengan pagination. `onSnapshot` hanya untuk lencana jumlah inbox, dengan query ber-`limit`.
7. Sediakan indeks komposit yang diperlukan di `firestore.indexes.json`.

## 9. HASIL YANG DIMINTA

Kerjakan **bertahap** dan berhenti untuk konfirmasi di akhir setiap fase. Di setiap fase pastikan aplikasi bisa dijalankan.

| Fase | Isi |
|---|---|
| 1 | Struktur proyek, Firebase config, login dan guard, kelola pengguna, `firestore.rules`, README awal |
| 2 | Surat masuk (CRUD), upload/unduh Drive via Apps Script, surat rahasia, pencarian dan pagination |
| 3 | Disposisi oleh admin/pimpinan, inbox bidang, tindak lanjut per bidang, status otomatis, dashboard |
| 4 | Master bidang dan master nomor, surat keluar oleh admin dan bidang, penomoran transaction, pembatalan |
| 5 | Ekspor Excel, audit log, Apps Script autobackup, fungsi dan uji restore |
| 6 | Pengujian akhir, perapihan UI mobile, README final |

**README.md harus berisi** langkah setup dari nol: membuat proyek Firebase, mengaktifkan Auth dan Firestore, menerbitkan rules dan indeks, membuat akun admin pertama, men-deploy Apps Script (termasuk scope dan Web App), mengisi `firebase-config.js`, mengaktifkan GitHub Pages, membatasi API key, dan menjalankan seed data.

**Kriteria selesai:**
- Dua admin/bidang menyimpan surat keluar **bersamaan** tidak pernah menghasilkan nomor ganda (sertakan skrip atau langkah uji).
- Akun bidang A **tidak dapat** membaca (lewat UI, query langsung, maupun unduh file) surat rahasia yang tidak ditujukan ke bidangnya.
- Bidang tidak dapat mengubah isi surat masuk, nomor surat keluar, atau surat keluar milik bidang lain.
- Tidak ada surat yang dapat dihapus. Hanya dibatalkan.
- Backup harian berjalan, retensi 30 file bekerja, dan email muncul saat gagal.
- Seluruh aplikasi dapat dibuka di HP tanpa scroll horizontal.

## 10. DEFAULT YANG DIPAKAI (ubah di sini bila berbeda)

- Nomor surat keluar terbit langsung saat disimpan, tanpa persetujuan admin.
- Bidang boleh mengubah hal/tujuan/isi ringkas hingga surat dibatalkan, dengan jejak audit.
- Satu urutan nomor per jenis surat untuk seluruh dinas.
- Status surat masuk `Selesai` otomatis saat semua bidang tujuan menindaklanjuti.
- Akun pimpinan opsional.
- Tidak ada retensi arsip, lembar cetak disposisi, notifikasi WhatsApp/email ke bidang, maupun tanda tangan elektronik.

## 11. CARA BEKERJA

- Sebelum menulis kode, ringkas rencanamu dalam beberapa baris, lalu mulai Fase 1.
- Jangan menambah fitur di luar dokumen ini. Bila ada hal yang ambigu dan berdampak besar, tanyakan. Untuk hal kecil, pakai default di atas dan catat asumsinya di README.
- Tulis kode yang bersih, modular, berkomentar singkat dalam Bahasa Indonesia, dan tanpa dependensi yang butuh proses build.
- Di akhir tiap fase laporkan: apa yang selesai, cara mengujinya, dan hal yang perlu saya lakukan secara manual (misalnya klik di konsol Firebase/Google).

**Data awal yang perlu diganti:** `[NAMA DINAS]`, `[NAMA DINAS SINGKAT]`, nama 3 bidang beserta kodenya, dan contoh format nomor surat keluar milik dinas.
