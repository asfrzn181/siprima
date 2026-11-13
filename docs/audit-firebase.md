# FASE 1 — Audit Pemakaian Firebase

> Dokumen ini dibuat **tanpa mengubah kode**. Sumber kebenaran adalah kode di commit `5430efc`.
> Kesimpulan disimpulkan dari **kode**, bukan dari isi database.
>
> Catatan: setelah migrasi selesai, berkas konfigurasi Firebase (`firebase.json`,
> `.firebaserc`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`) sudah
> dihapus dari repo. Dokumen ini disimpan sebagai catatan historis.

## 1. Ringkasan eksekutif

Aplikasi **tidak** memakai Firebase di frontend. Seluruh akses Firebase terjadi di backend Express melalui **Firebase Admin SDK**:

- **Firestore** — satu-satunya penyimpanan data (semua koleksi di bawah).
- **Firebase Auth** — login Email/Password via Identity Toolkit REST, lalu `createSessionCookie`; verifikasi sesi via `verifySessionCookie`; manajemen akun via Admin SDK (`createUser`, `updateUser`, `deleteUser`, `getUserByEmail`).
- **Firebase Storage** — **tidak dipakai**. Berkas scan disimpan di disk lokal (`UPLOAD_DIR`) dan disajikan lewat endpoint ber-otorisasi.
- **Cloud Functions** — **tidak ada**. Tidak ada `functions/`, trigger, atau `httpsCallable`.
- **Realtime** (`onSnapshot`) — **tidak ada**. Frontend memakai `fetch` + refetch manual (polling saat aksi pengguna).

Implikasi: migrasi ke MySQL hanya menyentuh backend (repository, auth, config) dan sedikit kontrak autentikasi. Frontend tetap memakai `/api` yang sama.

## 2. Daftar file terdampak

| Area | File | Peran Firebase |
|---|---|---|
| Config | `src/config/firebase.js` | Inisialisasi Admin SDK (`initializeApp`, `cert`), `getFirestore`, `getAuth` |
| Config | `src/config/env.js` | `FIREBASE_*` wajib (project, client email, private key, web API key) |
| Auth | `src/middlewares/auth.js` | `verifySessionCookie` |
| Auth | `src/services/auth.service.js` | Identity Toolkit `signInWithPassword`, `createSessionCookie` |
| Auth | `src/services/user.service.js` | `createUser`, `updateUser`, `deleteUser` |
| Data | `src/repositories/base.repository.js` | `collection`, `doc`, `get`, `set`, `update`, `batch`, `runTransaction` |
| Data | `src/repositories/user.repository.js` | `users/{uid}` |
| Data | `src/repositories/master.repository.js` | `masterBidang`, `masterNomor` |
| Data | `src/repositories/settings.repository.js` | `pengaturan/umum` |
| Data | `src/repositories/suratMasuk.repository.js` | `suratMasuk`, counter agenda |
| Data | `src/repositories/suratKeluar.repository.js` | `suratKeluar` |
| Data | `src/repositories/audit.repository.js` | `auditLog` |
| Data | `src/repositories/numbering.repository.js` | `letter_numbers`, `letter_counters`, `letter_number_index`, `letter_idempotency` |
| Data | `src/repositories/numberingLanjutan.repository.js` | `letter_numbers`, `suratKeluar` |
| Data | `src/repositories/numberingAudit.repository.js` | `letter_audit_log`, `letter_audit_heads` |
| Data | `src/repositories/numberingQuery.repository.js` | `letter_numbers`, `letter_counters` |
| Data | `src/repositories/storage.repository.js` | **Lokal**, bukan Firebase |
| Script | `scripts/seed-admin.js` | `getUserByEmail`, `createUser`, `users/{uid}` |
| Script | `scripts/audit-data.js` | `collection.count`, `queryKoleksi` |
| Test | `tests/integration.test.js` | Hapus dokumen langsung via Admin SDK |
| Test | `tests/utils.test.js`, `tests/static.test.js` | Referensi `Timestamp`/pola Firebase (bukan akses) |
| Rules | `firestore.rules`, `storage.rules` | Deny-all |
| Config | `firebase.json`, `.firebaserc`, `firestore.indexes.json` | Deploy rules/indexes |

## 3. Peta koleksi Firestore (dari kode)

Semua koleksi bersifat **top-level** (tidak ada subkoleksi). Relasi dilakukan lewat field ID string, bukan referensi dokumen.

### 3.1 `users/{uid}`
| Field | Tipe | Catatan |
|---|---|---|
| `uid` | string | = document ID (Firebase UID) |
| `email` | string | unik (Auth) |
| `nama` | string | |
| `role` | string | `admin` \| `pimpinan` \| `bidang` |
| `bidang` | string | kode bidang (untuk role `bidang`) |
| `aktif` | boolean | akun nonaktif ditolak |

Query: `orderBy(nama asc)`. ID = Firebase UID (string).

### 3.2 `masterBidang/{kode}`
| Field | Tipe |
|---|---|
| `kode` | string (unik) |
| `nama` | string |
| `aktif` | boolean |

Query: `where(aktif == true) orderBy(nama asc)`, `where(kode == x) limit 1`, `orderBy(nama asc)`.

### 3.3 `masterNomor/{id}`
| Field | Tipe |
|---|---|
| `nama` | string |
| `golongan` | string `SK` \| `SE` \| `LAINNYA` |
| `format` | string (template nomor) |
| `kode` | string (klasifikasi) |
| `resetTahunan` | boolean |
| `urutanPerBidang` | boolean |
| `aktif` | boolean |

Query: `orderBy(nama asc)`, prefix `kode`/`nama` untuk autocomplete (3 variasi kapitalisasi).

### 3.4 `pengaturan/umum` (single doc)
| Field | Tipe |
|---|---|
| `namaDinas` | string |
| `appsScriptUrl` | string |
| `numberingScope` | string `GLOBAL_PER_TAHUN` \| `PER_KLASIFIKASI` |
| `reservationMinutes` | number |

### 3.5 `suratMasuk/{id}`
| Field | Tipe | Catatan |
|---|---|---|
| `noAgenda` | string | `{tahun}/{urut:3}` |
| `tglTerima` | timestamp | filter range |
| `tglSurat` | timestamp | |
| `noSurat` | string | prefix search |
| `asal` | string | prefix search |
| `hal` | string | prefix search |
| `isiRingkas` | string | |
| `sifat` | string | `biasa` \| `rahasia` |
| `aksesBidang` | array<string> | array-contains |
| `fileId` | string | nama berkas lokal |
| `fileUrl` | string | tautan legacy |
| `status` | string | `Baru` \| `Didisposisikan` \| `Selesai` |
| `dibuatOleh` | map `{uid,nama}` | |
| `dibuatPada` | timestamp | order default |
| `diubahPada` | timestamp | |
| `disposisi` | map `{kepada[], diputuskanOleh, dicatatOleh{uid,nama}, tanggal, catatan}` | |
| `tindakLanjut` | map<kodeBidang, `{status,tanggal,catatan}`> | map dinamis per bidang |

### 3.6 `suratKeluar/{id}`
| Field | Tipe | Catatan |
|---|---|---|
| `noSurat` | string | prefix search |
| `jenisId` | string | FK → `masterNomor` |
| `golongan` | string | `SK`/`SE`/`LAINNYA` |
| `tglSurat` | timestamp | order default |
| `tujuan` | string | prefix search |
| `hal` | string | prefix search |
| `isiRingkas` | string | |
| `sifat` | string | `biasa` \| `rahasia` |
| `tandaTangan` | string | `TTE` \| `BASAH` |
| `fileId` | string | |
| `fileUrl` | string | |
| `bidangPembuat` | string | FK → `masterBidang.kode` |
| `dibuatOleh` | map `{uid,nama}` | |
| `status` | string | `Aktif` \| `Dibatalkan` |
| `alasanBatal` | string | |
| `aksesBidang` | array<string> | array-contains |
| `dikirimKeLuar` | boolean | |
| `letterNumberId` | string | FK → `letter_numbers.id` |
| `letterRowVersion` | number | optimistic lock |
| `dibuatPada` / `diubahPada` | timestamp | |

### 3.7 `counters/{agendaMasuk_<tahun>}`
| Field | Tipe |
|---|---|
| `last` | number |

### 3.8 `letter_counters/{tahun_scopeKey}`
| Field | Tipe |
|---|---|
| `tahun` | number |
| `scope` | string |
| `scope_key` | string |
| `last_seq` | number |
| `updated_at` | timestamp |

### 3.9 `letter_numbers/{id}`
| Field | Tipe |
|---|---|
| `seq` | number |
| `seq_suffix` | string \| null |
| `klasifikasi` | string |
| `golongan` | string |
| `unit` | string |
| `bulan` | number |
| `bulan_romawi` | string |
| `tahun` | number |
| `scope_key` | string |
| `full_number` | string (unik via index) |
| `jenisId` | string |
| `status` | `RESERVED` \| `ISSUED` \| `VOID` |
| `letter_date` | timestamp |
| `perihal` | string |
| `tujuan` | string |
| `created_by` | map `{uid,nama,role}` |
| `letter_id` | string \| null (FK suratKeluar) |
| `issued_at` | timestamp \| null |
| `voided_at` | timestamp \| null |
| `voided_by` | map \| null |
| `void_reason` | string |
| `replaced_by_id` | string \| null |
| `replacement_of_id` | string \| null |
| `reservation_expires_at` | timestamp |
| `idempotency_key` | string |
| `reused_at` | timestamp |
| `reused_by` | map |
| `reuse_count` | number |
| `reuse_reason` | string |
| `row_version` | number |
| `created_at` | timestamp |

### 3.10 `letter_number_index/{encodeURIComponent(full_number)}`
`{ letter_id, full_number, created_at }` — penjaga unik nomor.

### 3.11 `letter_idempotency/{encodeURIComponent(key)}`
`{ letter_id, created_at }`.

### 3.12 `letter_audit_log/{id}`
`{ id, letter_id, action, actor{uid,nama,role}, timestamp, before_json, after_json, prev_hash, hash }` — hash-chain audit.

### 3.13 `letter_audit_heads/global`
`{ last_hash, updated_at }` — kepala rantai hash.

### 3.14 `auditLog/{id}`
`{ uid, nama, aksi, koleksi, docId, sebelum, sesudah, waktu }`.

## 4. Peta query (dari kode + `firestore.indexes.json`)

### suratMasuk
- `where(status,sifat,aksesBidang,tglTerima range) orderBy(dibuatPada|tglTerima) limit N`
- Prefix: `where(noSurat|hal|asal >= k <= k+\uf8ff) orderBy(field asc) limit 100`
- Kombinasi index: 40 composite (lihat `firestore.indexes.json`).

### suratKeluar
- `where(status,sifat,aksesBidang,tglSurat range) orderBy(tglSurat desc) limit N`
- Prefix: `where(noSurat|hal|tujuan >= k <= k+\uf8ff) orderBy(field asc) limit 100`
- `where(noSurat == x) limit 1`.

### letter_numbers
- `where(status,reservation_expires_at <= now) orderBy(reservation_expires_at asc) limit 100`
- `where(tahun [,scope_key])` (verifikasi urutan)
- `where(full_number == x) limit 1`

### master
- `masterBidang`: `where(aktif) orderBy(nama)`, `where(kode) limit 1`
- `masterNomor`: `orderBy(nama)`, prefix `kode`/`nama limit 5`

### audit
- `auditLog orderBy(waktu desc) limit 200` + potong halaman di memori

### collectionGroup
- **Tidak ada** `collectionGroup`.

## 5. Fitur realtime

**Tidak ada** `onSnapshot`, listener, atau WebSocket. Frontend melakukan:
- fetch daftar saat halaman dimuat,
- refetch setelah create/update/delete,
- pagination berbasis query param.

Karena tidak ada realtime, migrasi **tidak** memerlukan SSE/WebSocket. Opsi yang dipilih: **polling manual/refetch** (sudah ada). SSE disediakan sebagai ekstensi opsional, bukan kebutuhan.

## 6. Auth

- **Provider**: Firebase Authentication Email/Password (Identity Toolkit `accounts:signInWithPassword`).
- **Custom claims**: **tidak dipakai**. Otorisasi memakai dokumen `users/{uid}.role` + `bidang`.
- **Sesi**: `createSessionCookie` (HttpOnly, Secure, SameSite=Lax) + `verifySessionCookie(..., true)` (cek revoke).
- **Manajemen akun**: `createUser`, `updateUser`, `deleteUser`, `getUserByEmail`.
- **Login sosial**: **tidak ada** (tidak ada Google/OAuth). Tidak perlu OAuth pihak ketiga.
- **Reset password**: **belum ada** di aplikasi (tidak ada endpoint).

## 7. Storage

- **Firebase Storage tidak dipakai.**
- Scan disimpan di `UPLOAD_DIR` (disk lokal, di luar `public_html`), nama acak UUID, MIME dibatasi PDF/JPG/PNG, maks 5 MB.
- Disajikan lewat `GET /api/surat-{masuk,keluar}/:id/berkas` dengan cek `bolehBacaSurat`.

## 8. Cloud Functions

- **Tidak ada** folder `functions/`, trigger, atau `httpsCallable`.
- Pekerjaan terjadwal yang setara: `kedaluwarsakanReservasi` (dipanggil manual via API `POST /api/nomor/kedaluwarsa`).
- Pengganti: **API cron** (Bagian B) dengan job `cleanup_expired_reservations`, dll.

## 9. Isi `firestore.rules` & `storage.rules`

Keduanya **deny-all**:

```
allow read, write: if false;
```

Artinya otorisasi efektif sepenuhnya berada di backend (`src/utils/akses.js`, `src/middlewares/role.js`, service). Migrasi tidak perlu menerjemahkan aturan granular — cukup mempertahankan matriks akses yang sudah ada dan menambah middleware permission eksplisit.

## 10. Matriks akses efektif (dari `src/utils/akses.js` + route)

| Aksi | admin | pimpinan | bidang |
|---|---|---|---|
| Baca surat biasa | ✅ | ✅ | ✅ |
| Baca surat rahasia | ✅ | ✅ | hanya `aksesBidang` miliknya |
| Tambah/ubah surat masuk | ✅ | ubah ✅ | ❌ |
| Disposisi | ✅ | ✅ | ❌ |
| Tindak lanjut | ❌ | ❌ | hanya bidang terkait |
| Buat surat keluar | ✅ | ❌ | ✅ |
| Ubah surat keluar | ✅ | ❌ | miliknya & aktif |
| Batal surat keluar | ✅ | ✅ | ❌ |
| Kirim / pakai ulang nomor | ✅ | ❌ | ❌ |
| Koreksi nomor | ✅ | ✅ | ❌ |
| Dashboard/laporan | ✅ | ✅ | ❌ |
| Manajemen user/master/pengaturan/audit | ✅ | ❌ | ❌ (master nomor baca: admin+bidang) |

## 11. Risiko migrasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| ID berubah dari string Firestore ke BIGINT | URL/bookmark lama tidak valid | Tidak ada data yang dimigrasikan (fresh); frontend memakai ID dari API |
| Transaksi penomoran kompleks (counter + index + idempotency + audit hash) | Duplikat/gap nomor | Implementasi transaksi MySQL `SELECT ... FOR UPDATE` + unique index |
| `tindakLanjut` berupa map dinamis | Normalisasi tabel | Tabel `surat_masuk_tindak_lanjut` dengan FK + unique (surat, bidang) |
| `aksesBidang` array | Butuh query array-contains | Tabel relasi `surat_*_akses_bidang` + index |
| Prefix search `field >= k <= k+\uf8ff` | Perilaku MySQL `LIKE 'k%'` beda collation | Pakai `LIKE CONCAT(?, '%')` + index; jelaskan case-insensitive |
| Sesi Firebase (JWT) hilang | Semua user harus login ulang | Diharapkan (fresh); sediakan endpoint login/reset |
| Hash-chain audit | Konsistensi rantai | Pertahankan `prev_hash`/`hash` dalam transaksi |
| Rate limit & CSRF | Perilaku berubah | Pertahankan middleware yang ada |
| Tidak ada server MySQL di lingkungan uji | Tidak bisa verifikasi runtime | Sediakan Docker Compose + skrip migrasi; uji unit dengan fake pool |

## 12. Kesimpulan

- Titik ganti terpusat di **`src/config/firebase.js`** dan **11 repository**; service/controller/route sebagian besar tidak berubah selain auth.
- Tidak ada realtime, Storage, Functions, atau custom claims yang perlu direplikasi.
- Skema MySQL dapat dibuat 1:1 dengan koleksi + tabel relasi untuk array/map.
- Auth baru harus menyediakan: login, logout, session/refresh, reset password, dan roles/permissions.
