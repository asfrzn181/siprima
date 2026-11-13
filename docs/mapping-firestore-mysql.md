# Pemetaan Firestore ke MySQL

Dokumen ini melengkapi `docs/audit-firebase.md` dan `db/ERD.md`. Nama field Firestore berasal dari kode (camelCase), kolom MySQL memakai `snake_case`.

## 1. Aturan umum

| Firestore | MySQL |
|---|---|
| Document ID string | `BIGINT UNSIGNED AUTO_INCREMENT` (`id`) |
| `Timestamp` | `DATETIME(3)` UTC |
| `boolean` | `TINYINT(1)` |
| `number` | `INT` / `BIGINT` sesuai jangkauan |
| `array<string>` | tabel relasi + FK |
| `map` statis | kolom `*_id` + snapshot `*_nama` |
| `map` dinamis | tabel anak atau kolom `JSON` |
| `FieldValue.serverTimestamp()` | `CURRENT_TIMESTAMP(3)` / `NOW(3)` |
| `runTransaction` | `withTransaction` + `SELECT ... FOR UPDATE` |
| `where(...).orderBy(...).limit(...)` | `WHERE ... ORDER BY ... LIMIT ...` + index |
| `array-contains` | `EXISTS (SELECT 1 FROM tabel_relasi ...)` |
| prefix `>= k <= k + U+F8FF` | `LIKE CONCAT(?, '%')` (collation `utf8mb4_unicode_ci`, case-insensitive) |

## 2. Tabel pemetaan

### 2.1 `users/{uid}` menjadi `users`

| Firestore | MySQL | Catatan |
|---|---|---|
| document ID (`uid`) | `id` | BIGINT |
| `email` | `email` | UNIQUE |
| - | `password_hash` | bcrypt, baru (tidak dimigrasikan) |
| `nama` | `nama` | |
| `role` (string) | `role_id` | FK ke `roles.id` |
| `bidang` (kode) | `bidang_kode` | FK ke `master_bidang.kode`, `NULL` bila kosong |
| `aktif` | `aktif` | |
| - | `last_login_at` | baru |
| - | `created_at`, `updated_at` | baru |

### 2.2 `masterBidang/{kode}` menjadi `master_bidang`

| Firestore | MySQL |
|---|---|
| document ID (`kode`) | `kode` (UNIQUE) + `id` BIGINT |
| `kode` | `kode` |
| `nama` | `nama` |
| `aktif` | `aktif` |

### 2.3 `masterNomor/{id}` menjadi `master_nomor`

| Firestore | MySQL |
|---|---|
| document ID | `id` BIGINT |
| `nama` | `nama` |
| `golongan` | `golongan` ENUM |
| `format` | `format` |
| `kode` | `kode` |
| `resetTahunan` | `reset_tahunan` |
| `urutanPerBidang` | `urutan_per_bidang` |
| `aktif` | `aktif` |

### 2.4 `pengaturan/umum` menjadi `pengaturan` (satu baris, `id = 1`)

| Firestore | MySQL |
|---|---|
| `namaDinas` | `nama_dinas` |
| `appsScriptUrl` | `apps_script_url` |
| `numberingScope` | `numbering_scope` ENUM |
| `reservationMinutes` | `reservation_minutes` |

### 2.5 `suratMasuk/{id}` menjadi `surat_masuk`

| Firestore | MySQL | Catatan |
|---|---|---|
| document ID | `id` BIGINT | |
| `noAgenda` | `no_agenda` | UNIQUE |
| `tglTerima` | `tgl_terima` | |
| `tglSurat` | `tgl_surat` | |
| `noSurat` | `no_surat` | index prefix |
| `asal` | `asal` | index prefix |
| `hal` | `hal` | index prefix |
| `isiRingkas` | `isi_ringkas` | TEXT |
| `sifat` | `sifat` ENUM | |
| `fileId` | `file_id` | |
| `fileUrl` | `file_url` | |
| `status` | `status` ENUM | |
| `dibuatOleh.uid` | `dibuat_oleh_id` | FK ke `users.id` |
| `dibuatOleh.nama` | `dibuat_oleh_nama` | snapshot |
| `disposisi.diputuskanOleh` | `disposisi_diputuskan_oleh` | |
| `disposisi.dicatatOleh.uid` | `disposisi_dicatat_oleh_id` | FK ke `users.id` |
| `disposisi.dicatatOleh.nama` | `disposisi_dicatat_oleh_nama` | snapshot |
| `disposisi.tanggal` | `disposisi_tanggal` | |
| `disposisi.catatan` | `disposisi_catatan` | |
| `disposisi.kepada[]` | `surat_masuk_akses_bidang` | relasi |
| `aksesBidang[]` | `surat_masuk_akses_bidang` | relasi |
| `tindakLanjut{kode}` | `surat_masuk_tindak_lanjut` | tabel anak |
| `dibuatPada` | `dibuat_pada` | |
| `diubahPada` | `diubah_pada` | |

### 2.6 `suratKeluar/{id}` menjadi `surat_keluar`

| Firestore | MySQL | Catatan |
|---|---|---|
| document ID | `id` BIGINT | |
| `noSurat` | `no_surat` | index prefix |
| `jenisId` | `jenis_id` | FK ke `master_nomor.id` |
| `golongan` | `golongan` ENUM | |
| `tglSurat` | `tgl_surat` | |
| `tujuan` | `tujuan` | index prefix |
| `hal` | `hal` | index prefix |
| `isiRingkas` | `isi_ringkas` | TEXT |
| `sifat` | `sifat` ENUM | |
| `tandaTangan` | `tanda_tangan` ENUM | |
| `fileId` | `file_id` | |
| `fileUrl` | `file_url` | |
| `bidangPembuat` | `bidang_pembuat_kode` | FK ke `master_bidang.kode` |
| `dibuatOleh.uid` | `dibuat_oleh_id` | FK ke `users.id` |
| `dibuatOleh.nama` | `dibuat_oleh_nama` | snapshot |
| `status` | `status` ENUM | |
| `alasanBatal` | `alasan_batal` | |
| `aksesBidang[]` | `surat_keluar_akses_bidang` | relasi |
| `dikirimKeLuar` | `dikirim_ke_luar` | |
| `letterNumberId` | `letter_number_id` | FK ke `letter_numbers.id` |
| `letterRowVersion` | `letter_row_version` | optimistic lock |
| `dibuatPada` | `dibuat_pada` | |
| `diubahPada` | `diubah_pada` | |

### 2.7 `counters/{agendaMasuk_<tahun>}` menjadi `counters`

| Firestore | MySQL |
|---|---|
| document ID | `name` (UNIQUE) |
| `last` | `nilai` |

### 2.8 `letter_counters/{tahun_scopeKey}` menjadi `letter_counters`

| Firestore | MySQL |
|---|---|
| document ID | `(tahun, scope_key)` UNIQUE |
| `tahun` | `tahun` |
| `scope` | `scope` ENUM |
| `scope_key` | `scope_key` |
| `last_seq` | `last_seq` |
| `updated_at` | `updated_at` |

### 2.9 `letter_numbers/{id}` menjadi `letter_numbers`

| Firestore | MySQL |
|---|---|
| document ID | `id` BIGINT |
| `seq` | `seq` |
| `seq_suffix` | `seq_suffix` |
| `klasifikasi` | `klasifikasi` |
| `golongan` | `golongan` |
| `unit` | `unit` |
| `bulan` | `bulan` |
| `bulan_romawi` | `bulan_romawi` |
| `tahun` | `tahun` |
| `scope_key` | `scope_key` |
| `full_number` | `full_number` UNIQUE |
| `jenisId` | `jenis_id` |
| `status` | `status` ENUM |
| `letter_date` | `letter_date` |
| `perihal` | `perihal` |
| `tujuan` | `tujuan` |
| `created_by.uid` | `created_by_id` |
| `created_by.nama` | `created_by_nama` |
| `created_by.role` | `created_by_role` |
| `letter_id` | `letter_id` |
| `issued_at` | `issued_at` |
| `voided_at` | `voided_at` |
| `voided_by.*` | `voided_by_id`, `voided_by_nama` |
| `void_reason` | `void_reason` |
| `replaced_by_id` | `replaced_by_id` |
| `replacement_of_id` | `replacement_of_id` |
| `reservation_expires_at` | `reservation_expires_at` |
| `idempotency_key` | `idempotency_key` |
| `reused_at` | `reused_at` |
| `reused_by.*` | `reused_by_id`, `reused_by_nama` |
| `reuse_count` | `reuse_count` |
| `reuse_reason` | `reuse_reason` |
| `row_version` | `row_version` |
| `created_at` | `created_at` |

### 2.10 `letter_number_index/{key}` menjadi kolom UNIQUE

Firestore memakai dokumen terpisah untuk menjaga keunikan `full_number`. Di MySQL cukup `UNIQUE KEY uq_letter_numbers_full (full_number)`.

### 2.11 `letter_idempotency/{key}` menjadi `letter_idempotency`

| Firestore | MySQL |
|---|---|
| document ID (`encodeURIComponent(key)`) | `idem_key` UNIQUE |
| `letter_id` | `letter_id` FK |
| `created_at` | `created_at` |

### 2.12 `letter_audit_log/{id}` menjadi `letter_audit_log`

| Firestore | MySQL |
|---|---|
| document ID | `id` BIGINT |
| `letter_id` | `letter_id` FK |
| `action` | `action` |
| `actor.uid` | `actor_id` |
| `actor.nama` | `actor_nama` |
| `actor.role` | `actor_role` |
| `timestamp` | `timestamp` |
| `before_json` | `before_json` JSON |
| `after_json` | `after_json` JSON |
| `prev_hash` | `prev_hash` |
| `hash` | `hash` |

### 2.13 `letter_audit_heads/global` menjadi `letter_audit_heads` (`id = 1`)

| Firestore | MySQL |
|---|---|
| `last_hash` | `last_hash` |
| `updated_at` | `updated_at` |

### 2.14 `auditLog/{id}` menjadi `audit_log`

| Firestore | MySQL |
|---|---|
| document ID | `id` BIGINT |
| `uid` | `user_id` |
| `nama` | `nama` |
| `aksi` | `aksi` |
| `koleksi` | `koleksi` |
| `docId` | `doc_id` |
| `sebelum` | `sebelum` JSON |
| `sesudah` | `sesudah` JSON |
| `waktu` | `waktu` |

## 3. Query Firestore yang diterjemahkan

| Kebutuhan | Firestore | MySQL |
|---|---|---|
| Daftar surat masuk | `where(status,sifat,aksesBidang,tglTerima) orderBy(dibuatPada/tglTerima) limit N` | `WHERE ... ORDER BY ... LIMIT ?` + index komposit |
| Prefix surat masuk | `where(noSurat/hal/asal >= k <= k+U+F8FF)` | `WHERE no_surat LIKE CONCAT(?, '%')` |
| Daftar surat keluar | `where(status,sifat,aksesBidang,tglSurat) orderBy(tglSurat desc)` | `WHERE ... ORDER BY tgl_surat DESC LIMIT ?` |
| Prefix surat keluar | `where(noSurat/hal/tujuan >= k <= k+U+F8FF)` | `WHERE no_surat LIKE CONCAT(?, '%')` |
| Reservasi kedaluwarsa | `where(status == RESERVED, reservation_expires_at <= now)` | `WHERE status = 'RESERVED' AND reservation_expires_at <= NOW(3)` |
| Verifikasi urutan | `where(tahun [,scope_key])` | `WHERE tahun = ? [AND scope_key = ?]` |
| Cari nomor lengkap | `where(full_number == x) limit 1` | `WHERE full_number = ? LIMIT 1` |
| Autocomplete master | prefix `kode`/`nama` | `WHERE kode LIKE ? OR nama LIKE ?` |
| Audit log | `orderBy(waktu desc) limit 200` | `ORDER BY waktu DESC LIMIT ?` |

## 4. Perubahan perilaku yang disengaja

1. **ID numerik**: URL memakai `BIGINT`, bukan string Firestore. Tidak ada data lama yang dimigrasikan.
2. **Pencarian prefix case-insensitive**: `utf8mb4_unicode_ci` membuat `LIKE 'k%'` juga cocok dengan `K...`. Ini lebih ramah pengguna, tetapi berbeda dari Firestore yang case-sensitive.
3. **Tidak ada realtime**: tidak ada `onSnapshot`; frontend tetap memakai refetch manual. SSE tidak diperlukan.
4. **Sesi**: bukan JWT Firebase, melainkan cookie sesi opaque dengan hash SHA-256 di tabel `sessions`.
5. **Reset password**: endpoint baru; token dikembalikan hanya bila `AUTH_EXPOSE_RESET_TOKEN=true` (untuk pengembangan).
