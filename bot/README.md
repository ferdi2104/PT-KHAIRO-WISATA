# Bot KHAIRO TOURS - Fase 1 (Rule Based)

Asisten virtual untuk **PT. Khairo Wisata** (KHAIRO TOURS & TRAVELS).
Bisa menjawab pertanyaan umum soal paket, harga, dokumen, pembayaran, dan keberangkatan
**tanpa pakai AI sama sekali.**

Kenapa tanpa AI dulu? Karena jawaban harga harus 100% akurat.
Kalau LLM bilang "Rp 32 juta" padahal aslinya Rp 33.500.000, itu merusak kepercayaan clientele.

---

## Cara jalankan

Tidak perlu `npm install`. Cukup Node.js 18 ke atas.

```bash
cd bot
node src/server.js
```

Buka di browser:

```
http://localhost:3100
```

Itu halaman chat untuk mencoba bot.

---

## Struktur

```
bot/
├── data/
│   ├── paket.json        # 6 paket: nama, harga, durasi, fasilitas, maskapai
│   └── faq.json          # 27 FAQ + kontak
├── src/
│   ├── normalize.js      # membersihkan teks pesan
│   ├── matcher.js        # pencocokan kata kunci ke paket dan FAQ
│   ├── responder.js      # menyusun jawaban
│   └── server.js         # server HTTP (tanpa dependency)
├── public/
│   ├── demo.html         # halaman chat untuk uji coba
│   └── widget.js         # tombol chat untuk disisipkan ke website
└── test.js               # 23 kasus uji
```

---

## Cara kerja pencocokan

```
Pesan pengguna
     |
     v
[1] Sapaan / terima kasih / mau bicara dengan manusia?
     | ya
     +--> balas, atau serahkan ke Kak Lina
     |
     v
[2] Ada nama paket yang disebut? (hemat, mabrur, turkiye, haji, ...)
     | ya + tanya harga  --> balas harga singkat
     | ya              --> balas rincian paket
     |
     v
[3] Cocok dengan FAQ? (dokumen, DP, refund, paspor, ...)
     | ya --> balas FAQ
     |
     v
[4] Cocok dengan intent umum? (harga, durasi)
     |
     v
[5] Tidak ketemu --> arahkan ke Kak Lina
```

**Harga dan durasi selalu diambil dari `data/paket.json`, tidak pernah dikarang.**

---

## Endpoint

| Method | URL | Fungsi |
|---|---|---|
| GET | `/` | Halaman chat uji coba |
| GET | `/api/chat?q=...` | Uji bot dari browser |
| POST | `/api/chat` | Uji bot via JSON `{ "pesan": "..." }` |
| POST | `/webhook` |_endpoint_ untuk WhatsApp |
| GET | `/health` | Cek status server |
| GET | `/kontak` | Data kontak |

Contoh uji dari terminal:

```bash
curl "http://localhost:3100/api/chat?q=paket%20termurah"
```

---

## Menjalankan uji

```bash
node test.js
```

Harus keluar `Lulus: 23/23`.

Kalau nanti data FAQ ditambah atau diubah, jalankan ulang tes ini.

---

## WAJIB DIREVIEW SEBELUM DIPAKAI PRODUKSI

Di `data/faq.json`, setiap entri punya field `status`:

- `"siap"` = jawaban sudah benar
- `"draf"` = **jawaban placeholder, belum tentu benar**

Saat ini yang masih `draf`: seluruh jawaban soal kebijakan (DP, cicilan, refund,
syarat mahram, batas dokumen, dan ketentuan Haji Plus). Semua placeholder itu
menyarankan "hubungi Kak Lina", supaya bot tidak pernah memberi informasi
yang potentially salah.

**Langkah wajib sebelum bot dipakai untuk produksi:**

1. Baca semua entri `status: "draf"` di `data/faq.json`
2. Ganti dengan ketetapan asli dari Kak Lina / ketentuan Recruitment
3. Ubah `status` jadi `"siap"`

Nominal DP, ketentuan refund, dan batas usia juga **belum diisi angkaPasti**
karena harus mengikuti ketentuan Recruitment yang berlaku.

---

## Menjalankan di WhatsApp

Aplikasi WhatsApp Business yang biasa dipakai **tidak bisa** diberi bot.
Bot butuh Cloud API (resmi) atau WAHA (unofficial).

Saran: pakai **nomor baru khusus bot**, jangan pakai nomor utama yang
sudah dipakai chat pribadi. Nomor utama berisiko banned kalau pakai
metode unofficial.

Cara pakai (opsional, belum diaktifkan):

```bash
# Uji dulu tanpa mengirim apa pun ke WhatsApp
$env:WA_MODE="none"
$env:WEBHOOK_TOKEN="token-rahasia-kamu"
node src/server.js
```

`src/server.js` sudah punya adapt untuk dua provider:

- `WA_MODE=cloud` → WhatsApp Cloud API (Meta)
- `WA_MODE=waha`  → WAHA
- `WA_MODE=none`  → hanya logging, aman untuk testing

---

## Menyisipkan chat ke website

Taruh sebelum `</body>` di halaman mana pun:

```html
<script src="https://alamat-bot-kamu/widget.js"></script>
```

Atur URL bot di bagian atas `public/widget.js`.

---

## Deploy

Karena tanpa dependency, bisa langsung jalan di Railway, Render, atau VPS:

```bash
# Railway / Render
Build command : (kosongkan)
Start command : node src/server.js
Port          : variabel PORT, atau 3000
```

---

## Pengembangan berikutnya

Bot ini belum pakai AI. Tahapan selanjutnya:

1. **Review draf FAQ** (langkah wajib di atas)
2. **Pasang ke WhatsApp Cloud API** dengan nomor baru
3. **Tambah LLM** untuk menjawab pertanyaan yang di luar FAQ,
   dengan RAG supaya jawabannya bersumber dari dokumen resmi
4. **Tambah formulir pendaftaran** supaya calon peserta bisa daftar sendiri
5. **Kirim pengingat otomatis** ke peserta yang belum melengkapi dokumen

---

## Catatan privasi

Jangan pernah memasukkan datatrinomial Jamaah (paspor, KTP, NPWP) ke dalam
percakapan bot. Kalau nanti pakai LLM, pastikan data sensitif tidak ikut terkirim.