## Masalah
Berkas CSV sering harus diunggah ke server hanya untuk melihat ringkasan statistik. Itu menambah risiko privasi dan langkah yang tidak perlu.

## Yang Dibangun
CSV Insight: aplikasi web yang mengunggah CSV di browser, menampilkan ringkasan statistik per kolom, dan menggambar grafik batang di canvas. Tidak ada unggahan ke server. Berkas hasil: app.js (11792 B), index.html (1327 B), style.css (3040 B).

## Keputusan Teknis
Parsing dan agregasi berjalan di sisi klien. Visualisasi memakai canvas agar ringan dan tidak bergantung pustaka grafik eksternal. Logika dipisah di app.js, antarmuka di index.html, tampilan di style.css.

## Bukti
QC mencatat 3 lapis aktif: kode, pengguna, visual. Ketiganya lulus. Waktu QC 101,83 detik. Temuan: 0. Rincian kode: 1 JS, 2 lain, 0 Python, 0 JSON, 0 Lua.

## Batasan
QC memakai 1 berkas JS dan 2 berkas lain. Cakupan uji terbatas pada tiga lapis itu. Kami belum menguji berkas CSV berukuran sangat besar atau format kolom yang tidak lazim. Angka 101,83 detik adalah waktu QC, bukan tolok ukur performa aplikasi di semua perangkat.