export const FREE_TIER_LIMIT = 5
export const PRO_TIER_LIMIT = 50
export const MAX_WORDS_FREE = 5000
export const MAX_WORDS_PRO = 10000
export const SESSION_TIMEOUT_MS = 45000

export const READINESS_LABELS: Record<number, { label: string; color: string }> = {
  80: { label: 'Siap', color: 'green' },
  50: { label: 'Perlu Klarifikasi', color: 'yellow' },
  0:  { label: 'Tidak Siap', color: 'red' },
}

// Intentionally missing: edge cases (device offline, push delivery failure),
// non-functional requirements (availability, throughput, security),
// and role definitions (feature owner, dev team, approver).
export const SAMPLE_BRD = `# BRD: Fitur Notifikasi Pembayaran — PayCepat App

## 1. Latar Belakang
PayCepat adalah aplikasi dompet digital yang melayani lebih dari 2 juta pengguna aktif bulanan. Saat ini, pengguna tidak menerima konfirmasi real-time ketika melakukan atau menerima transaksi pembayaran. Hal ini menyebabkan banyak pertanyaan masuk ke tim customer support mengenai status transaksi, dengan rata-rata 1.200 tiket per hari terkait konfirmasi pembayaran.

## 2. Tujuan
Mengimplementasikan sistem notifikasi pembayaran yang mengirimkan pemberitahuan secara otomatis kepada pengguna setiap kali terjadi transaksi pada akun mereka, guna mengurangi volume tiket support dan meningkatkan kepercayaan pengguna.

## 3. Ruang Lingkup
Fitur ini mencakup notifikasi untuk transaksi berikut:
- Transfer dana antar pengguna PayCepat
- Pembayaran ke merchant (QRIS dan virtual account)
- Top-up saldo dari rekening bank

Fitur ini **tidak** mencakup:
- Notifikasi untuk penarikan tunai melalui ATM
- Notifikasi promosi atau marketing

## 4. Kebutuhan Fungsional

### 4.1 Notifikasi Push
Sistem harus mengirimkan push notification ke perangkat mobile pengguna dalam waktu 5 detik setelah transaksi berhasil diproses oleh core banking. Notifikasi harus menampilkan informasi berikut:
- Jumlah nominal transaksi (dalam Rupiah)
- Nama penerima atau pengirim dana
- Sisa saldo terkini setelah transaksi

### 4.2 Notifikasi In-App
Pengguna dapat mengakses riwayat notifikasi di dalam aplikasi melalui menu "Notifikasi". Setiap notifikasi disimpan selama 30 hari sebelum dihapus secara otomatis. Pengguna dapat menandai notifikasi sebagai sudah dibaca.

### 4.3 Preferensi Notifikasi
Pengguna dapat mengaktifkan atau menonaktifkan jenis notifikasi tertentu melalui halaman Pengaturan > Notifikasi. Perubahan preferensi berlaku segera.

## 5. User Stories
- Sebagai pengguna, saya ingin menerima notifikasi ketika uang masuk ke akun saya, agar saya dapat segera mengetahui pembayaran telah diterima tanpa harus membuka aplikasi.
- Sebagai pengguna, saya ingin menerima notifikasi ketika saya berhasil melakukan pembayaran, agar saya memiliki konfirmasi transaksi secara instan.
- Sebagai pengguna, saya ingin bisa menonaktifkan notifikasi tertentu, agar saya tidak terganggu oleh pemberitahuan yang tidak saya inginkan.

## 6. Kriteria Penerimaan
- Notifikasi push terkirim dalam waktu < 5 detik setelah transaksi selesai di 95% kasus
- Notifikasi menampilkan informasi yang benar: jumlah, nama, dan saldo terkini
- Pengguna dapat menonaktifkan notifikasi dari halaman pengaturan
- Riwayat notifikasi tersedia di in-app dan terhapus otomatis setelah 30 hari

## 7. Asumsi
- Pengguna telah memberikan izin notifikasi pada perangkat mereka saat onboarding
- Infrastruktur Firebase Cloud Messaging (FCM) sudah tersedia dan dikonfigurasi
- Core banking system dapat mengirimkan webhook event saat transaksi selesai

## 8. Timeline
Pengembangan ditargetkan selesai dalam 2 sprint (4 minggu), dengan demo internal pada akhir sprint pertama.`
