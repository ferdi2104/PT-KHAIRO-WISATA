# KHAIRO TOURS & TRAVELS — Agent Website

Website resmi agen **Lina Mardiyana** dari PT. Khairo Wisata, penyedia paket Umroh & Haji Plus terpercaya berizin Kemenag RI (SK PPIU No. 1153/2019).

🔗 **Live:** https://agenkhairo.my.id

> 📊 Total commit: <!-- commit-count -->**18**
> 🔄 Angka di atas otomatis diperbarui oleh git hook setiap kali commit baru dibuat.

---

## Halaman

| Halaman | URL |
|---|---|
| Home | `index.html` |
| Layanan | `services.html` |
| Paket Umroh & Haji | `packages.html` |
| Maskapai | `airlines.html` |
| Hotel | `hotels.html` |
| Galeri | `gallery.html` |
| Testimoni | `testimonials.html` |
| FAQ | `faq.html` |
| Hubungi Agen | `contact.html` |

---

## Teknologi

- HTML5, CSS3, JavaScript (vanilla)
- Font: Poppins + Amiri (Google Fonts)
- Icon: Font Awesome 6.5
- Deploy: Vercel

---

## Keamanan

Security headers aktif via `vercel.json`:

- `Content-Security-Policy` — cegah XSS
- `Strict-Transport-Security` — paksa HTTPS
- `X-Content-Type-Options` — cegah MIME sniffing
- `X-Frame-Options` — cegah clickjacking
- `Referrer-Policy` — batasi kebocoran URL
- `Permissions-Policy` — matikan akses kamera/mic/lokasi

Cek keamanan:
```bash
python security_check.py https://agenkhairo.my.id
```

Script ini auditing 4 hal:

1. **Transport** — apakah `http://` dialihkan ke `https://`, masa berlaku sertifikat SSL, dan apakah subdomain `www` punya sertifikat yang cocok.
2. **Header wajib** — 6 header di atas diperiksa di **semua** halaman (dibaca dari `sitemap.xml`), bukan cuma halaman depan.
3. **CSP secara nyata** — CSP tidak hanya dicek "ada atau tidak", tapi diuji dengan membaca setiap `<script>`, `<link rel=stylesheet>`, `<img>`, `<iframe>` yang benar-benar dipakai halaman, lalu dicocokkan ke directive-nya. File font yang dirujuk di dalam stylesheet juga ikut diperiksa. Tujuannya: memastikan CSP tidak memblokir aset situs sendiri.
4. **Cache aset statis** — memastikan CSS/JS/gambar punya cache jangka panjang di CDN.

Exit code `0` = bersih, `1` = ada temuan, `2` = salah pemakaian. Bisa dipakai sebagai gerbang sebelum deploy:

```bash
python security_check.py https://agenkhairo.my.id || echo "perbaiki dulu sebelum deploy"
```

Butuh hanya pustaka standar Python — tidak ada `pip install`.

---

## Kontak Agen

**Lina Mardiyana**
📱 +62 821-1475-7075
🌐 https://agenkhairo.my.id

Social:
- Facebook: https://www.facebook.com/linamardiyana
- Instagram: https://www.instagram.com/mardiyana/

> Situs resmi perusahaan: https://khairotourtravel.com
