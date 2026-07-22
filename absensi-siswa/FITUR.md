# Fitur Website Presensi SMK Muhammadiyah 3 Purbalingga

## Autentikasi & Navigasi
- Login dengan email dan password
- Auto-redirect berdasarkan role setelah login
- Logout dari navbar (desktop) dan bottom nav (mobile)
- Navigasi berbeda per role (admin / guru wali / guru non-wali / siswa)
- Guru non-wali hanya melihat Beranda, Profil, Kelar
- Guru wali melihat semua menu (Beranda, Presensi, Rekap, Profil, Kelar)
- Skeleton loading di semua halaman

---

## Admin

### Dashboard
- 6 kartu statistik siswa (Total, Hadir, Terlambat, Alpa, Sakit, Izin)
- Filter per kelas
- Diagram batang presensi mingguan (5 hari sekolah terakhir)
- 4 kartu statistik guru (Total, Hadir, Terlambat, Belum Presensi)
- Tabel kehadiran guru dengan status, jam masuk, jam keluar, dan lokasi
- Banner hari libur jika hari ini bukan hari sekolah

### Data Siswa
- Tambah siswa baru (NIS, nama, kelas, email, password)
- Edit data siswa
- Hapus siswa dengan konfirmasi undo (8 detik)
- Pencarian debounce (nama, NIS, kelas)
- Import dari Excel (unduh template + upload data)
- Export ke Excel (NIS, nama, kelas, email, status, password default)
- Tombol link ke Rekap Presensi Siswa

### Data Guru
- Tambah guru baru (email, nama, role, password)
- Edit data guru
- Hapus guru dengan konfirmasi undo (8 detik)
- Pencarian debounce (nama, email)
- Import dari Excel (unduh template + upload data)
- Export ke Excel (email, nama, role, password default)
- Tombol link ke Rekap Presensi Guru

### Rekap Presensi Siswa
- Filter per kelas dan rentang tanggal
- Tabel rekap (NIS, nama, kelas, hadir, terlambat, sakit, izin, alpa)
- Export ke Excel dengan nama file rentang tanggal

### Presensi Guru
- Kartu statistik (Total Guru, Hadir, Terlambat, Belum Presensi)
- Filter tanggal dan status
- Tabel guru (nama, email, badge status, jam masuk, jam keluar, lokasi Maps)
- Riwayat kehadiran 30 hari per guru
- Export ke Excel
- Banner hari libur

### Manajemen Kelas
- Tambah kelas baru (nama, jurusan, tingkat, wali kelas)
- Edit kelas
- Hapus kelas dengan konfirmasi undo (8 detik)
- Pencarian debounce (nama kelas, jurusan, wali kelas)

### Pengaturan
- Informasi nama sekolah
- Pengaturan waktu (jam masuk, batas terlambat, jam berakhir berangkat, jam pulang)
- Pengaturan lokasi (latitude, longitude, radius geofencing)
- Kelas dan wali kelas (daftar + assign cepat)
- Hari libur nasional (sinkron otomatis dari API + tambah manual, termasuk cuti bersama multi-hari)

---

## Guru

### Dashboard
- Kartu statistik siswa per kelas
- Diagram batang presensi mingguan
- Filter kelas (default ke kelas wali)
- Banner hari libur

### Presensi Kelas (Wali Kelas)
- Auto-select kelas yang diampu
- Toggle mode Berangkat dan Pulang
- Tombol aksi per siswa (Hadir, Terlambat, Sakit, Izin, Alpa, Pulang)
- GPS harus aktif untuk bisa presensi
- Auto-detect status hadir atau terlambat berdasarkan waktu
- Banner hari libur jika hari ini bukan hari sekolah

### Rekap Presensi (Wali Kelas)
- Filter kelas dan rentang tanggal
- Tabel rekap (NIS, nama, kelas, hadir, terlambat, sakit, izin, alpa)
- Hitung alpa otomatis (hari sekolah - hadir - terlambat - sakit - izin)
- 3 mode export Excel:
  - Harian (presensi hari ini saja)
  - Hasil Filter (rentang tanggal + keterangan)
  - Bulanan (multi-sheet per bulan + rekap tahunan)

### Profil (Presensi Mandiri)
- Info profil (nama, email, wali kelas)
- Presensi masuk dan pulang dengan konfirmasi
- GPS harus aktif untuk presensi
- Riwayat kehadiran 30 hari dengan lokasi Maps

---

## Siswa

### Presensi Hari Ini
- Info siswa (avatar, nama, NIS, kelas)
- Tanggal dan jam realtime
- Status waktu presensi (masuk / pulang / di luar jam)
- Pilihan status: Hadir, Sakit, Izin
- Textarea catatan untuk Sakit dan Izin
- GPS harus aktif untuk presensi hadir
- Banner hari libur
- Notifikasi jika sudah presensi

### Profil
- Info profil (nama, NIS, kelas)
- Riwayat kehadiran 30 hari (tipe, waktu, status, lokasi Maps)

---

## Fitur Global

### GPS / Geofencing
- Cek lokasi menggunakan Haversine formula
- Radius geofencing bisa diatur di pengaturan
- Tombol presensi dinonaktifkan jika GPS mati atau di luar area sekolah
- Koordinat lokasi tercatat di setiap data presensi
- Link Google Maps di tabel presensi

### Sistem Hari Libur
- Deteksi otomatis hari Sabtu dan Minggu
- Sinkron libur nasional dari API Tallyfy
- Input manual libur (single date atau rentang tanggal untuk cuti bersama)
- Banner hari libur di semua halaman presensi
- Tombol presensi dinonaktifkan di hari libur

### Import / Export Excel
- Import siswa dari Excel (password = NIS)
- Import guru dari Excel (password = Guru + nomor urut)
- Export data siswa dan guru ke Excel
- Export rekap presensi ke Excel (harian, filter, bulanan)
- Template unduhan untuk import

### Toast Notifikasi
- Notifikasi sukses, error, info, dan warning
- Undo untuk operasi hapus (8 detik)
- Tanpa tombol close (auto-dismiss)
- Progress bar di bagian bawah toast

### Device Fingerprint
- Hash SHA-256 dari atribut browser
- Direkam di setiap data presensi (anti-fraud)

### Time Window Presensi
- Konfigurasi jam masuk, batas terlambat, jam pulang
- Auto-detect status hadir atau terlambat berdasarkan waktu saat ini
- Di luar jam presensi hanya bisa input Sakit dan Izin
