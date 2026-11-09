# Uji akhir SiPrima

## Matriks akses

Siapkan empat akun aktif: Admin, Pimpinan, Bidang A (`A`), dan Bidang B (`B`). Siapkan surat biasa, surat rahasia dengan `aksesBidang: ["A"]`, dan surat keluar milik A.

| Kasus | Harapan |
|---|---|
| Admin membaca semua surat biasa/rahasia | Diizinkan |
| Pimpinan membaca semua surat biasa/rahasia | Diizinkan |
| Bidang A membaca surat biasa | Diizinkan |
| Bidang A membaca rahasia dengan akses A | Diizinkan |
| Bidang B membaca rahasia dengan akses A melalui query langsung | Ditolak oleh rules |
| Bidang B mengunduh file rahasia dengan akses A | Ditolak oleh Apps Script |
| Bidang mengubah isi surat masuk | Ditolak |
| Bidang menandai tindak lanjut surat miliknya | Diizinkan |
| Bidang mengubah nomor surat keluar | Ditolak |
| Bidang mengubah surat keluar milik bidang lain | Ditolak |
| Pengguna menghapus surat masuk/keluar | Ditolak |
| Surat keluar dibatalkan tanpa alasan | Ditolak oleh rules dan UI |

## Uji nomor bersamaan

1. Pastikan `masterNomor/surat-biasa` aktif dan `urutanPerBidang:false`.
2. Buka dua tab/browser dengan akun admin dan Bidang A.
3. Isi formulir surat keluar sampai siap disimpan di kedua tab.
4. Klik simpan hampir bersamaan.
5. Periksa dua dokumen `suratKeluar` dan `counters/{jenisId}_{tahun}`. Nomor harus berbeda dan `last` bertambah tepat dua.
6. Ulangi 10 kali. Tidak boleh ada nomor ganda. Bila salah satu transaction gagal, ulangi penyimpanan; transaction Firestore tidak boleh membuat dokumen bernomor ganda.

## Uji tampilan mobile

1. Buka setiap halaman pada lebar viewport 360–390 px.
2. Pastikan menu dapat digeser horizontal bila diperlukan, tabel berada dalam pembungkus scroll, dan tidak ada scroll horizontal pada halaman utama.
3. Pastikan formulir surat masuk, surat keluar, disposisi, dan tindak lanjut tetap dapat diisi tanpa elemen keluar layar.

## Uji backup dan restore

1. Jalankan `pasangTrigger()` sekali dari Apps Script dan pastikan trigger harian pukul 01:00 dengan zona `Asia/Jakarta`.
2. Jalankan `backupHarian()` manual. Pastikan JSON memuat surat rahasia tetapi rekap Sheets hanya memuat surat biasa.
3. Buat lebih dari 30 file backup bernama `backup_YYYY-MM-DD.json`; jalankan backup lagi dan pastikan file terlama dipindahkan ke Trash.
4. Jalankan `restoreDariJson(fileId, true)` dan pastikan hanya laporan jumlah dokumen yang dikembalikan.
5. Untuk uji pemulihan di project uji, jalankan `restoreDariJson(fileId, false)` dan cocokkan jumlah dokumen serta field dengan JSON.
