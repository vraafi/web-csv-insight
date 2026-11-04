## Masalah

Berkas CSV sering berisi data sensitif. Mengunggahnya ke server pihak ketiga menambah risiko dan friksi. Tim butuh cara cepat membaca statistik dasar tanpa data keluar dari browser.

## Yang Dibangun

CSV Insight: aplikasi web yang mengunggah CSV di browser, menampilkan ringkasan statistik per kolom, dan menggambar grafik batang di canvas. Seluruh pemrosesan berjalan lokal. Tidak ada unggahan ke server.

Berkas hasil: `app.js` (12697 B), `index.html` (1691 B), `README.md` (833 B), `style.css` (4504 B).

## Keputusan Teknis

Parsing dan agregasi dilakukan di sisi klien, sehingga data tidak meninggalkan perangkat pengguna. Grafik digambar langsung di canvas untuk menjaga jejak dependensi tetap kecil. Struktur berkas dipisah: logika di `app.js`, tampilan di `style.css`, dokumentasi di `README.md`.

## Bukti

QC mencatat 3 lapis aktif dan 3 lapis lulus: kode, pengguna, visual. Waktu QC 40.23 detik. Temuan: 0. Rincian berkas kode: 1 JS, 1 JSON, 6 lain, 0 Python, 0 Lua.

## Batasan

Statistik terbatas pada ringkasan per kolom dan grafik batang. Tidak ada uji beban untuk CSV berukuran sangat besar. Tidak ada integrasi ekspor laporan.