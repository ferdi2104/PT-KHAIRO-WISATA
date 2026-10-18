'use strict';

const { paket, faq, kontak, matchIntent, matchPaket, matchFaq, normalize } = require('./matcher');
const { tokenize, dedupeTokens } = require('./normalize');

const WA_KAKLINA = `https://wa.me/${kontak.wa}`;

// Ambang kemenangan antara FAQ dan intent umum.
// Diukur dari data: intent 'harga' yang kuat bernilai 2 (mis. "berapa harga"),
// sedangkan FAQ yang cuma cocok satu token bernilai 1 dan belum layak menang.
const SKOR_FAQ_STRONG = 2;
const SKOR_INTENT_STRONG = 2;

function salam() {
  return `Assalamualaikum Kak, selamat datang di KHAIRO TOURS & TRAVELS. Ada yang bisa kami bantu?`;
}

function daftarPaket() {
  const baris = paket.map((p) => {
    const harga = p.harga ? `${p.hargaTeks}/pax` : 'Harga khusus, konsultasi dulu';
    const label = p.rekomendasi ? ' (rekomendasi)' : '';
    return `- ${p.nama}${label} | ${p.durasi} | ${harga}`;
  });
  return (
    `Berikut pilihan paket kami:\n\n${baris.join('\n')}\n\n` +
    `Ketik nama paketnya, misalnya "mabrur", untuk lihat rinciannya.`
  );
}

function detailPaket(p) {
  const harga = p.harga ? p.hargaTeks : 'Harga khusus, silakan konsultasi';
  return (
    `${p.nama}\n` +
    `${'-'.repeat(p.nama.length)}\n` +
    `Durasi  : ${p.durasi}\n` +
    `Harga   : ${harga}\n` +
    `Pesawat  : ${p.maskapai}\n` +
    `Hotel    : ${p.hotel}\n\n` +
    `Fasilitas:\n${p.fasilitas.map((f) => `  + ${f}`).join('\n')}\n\n` +
    `${p.catatan}\n\n` +
    `Untuk pendaftaran, hubungi Kak Lina: ${kontak.telepon}`
  );
}

function daftarHarga() {
  const termurah = paket
    .filter((p) => p.kategori === 'umroh' && p.harga)
    .sort((a, b) => a.harga - b.harga)[0];
  return (
    `Harga paket umroh:\n\n` +
    `${daftarPaket()}\n\n` +
    `Paket paling terjangkau saat ini adalah ${termurah.nama} (${termurah.hargaTeks}/pax). ` +
    `Harga bisa berubah sewaktu-waktu, jadi mohon konfirmasi harga terbaru ke Kak Lina.`
  );
}

function infoDurasi() {
  return (
    `Durasi paket:\n\n` +
    `${paket
      .filter((p) => p.kategori === 'umroh')
      .map((p) => `- ${p.nama}: ${p.durasi}`)
      .join('\n')}\n\n` +
    `Tanggal keberangkatan diumumkan mendekati tanggal berangkat.`
  );
}

function infoKontak() {
  return (
    `Kontak resmi KHAIRO TOURS & TRAVELS:\n\n` +
    `Agen  : ${kontak.nama}\n` +
    `WA    : ${kontak.telepon}\n` +
    `Jam   : ${kontak.jam}\n` +
    `Web   : ${kontak.website}\n\n` +
    `Kak Lina akan dengan senang hati membantu memilih paket dan pendaftaran.`
  );
}

function serahkan() {
  return (
    `Baik, saya sambungkan ke Kak Lina ya Kak. ` +
    `Mohon tunggu sebentar, Kak Lina akan membalas langsung.\n\n` +
    `Kalau urgent, bisa juga WhatsApp langsung: ${WA_KAKLINA}`
  );
}

function fallback() {
  return (
    `Maaf Kak, saya belum menemukan jawabannya.\n\n` +
    `Saya bisa bantu soal:\n` +
    `- Daftar dan rincian paket umroh\n` +
    `- Harga dan durasi\n` +
    `- Dokumen dan persyaratan\n` +
    `- Cara daftar, DP, pelunasan, dan refund\n` +
    `- Maskapai, hotel, manasik, dan city tour\n\n` +
    `Kalau pertanyaannya di luar daftar itu, langsung saja tanya Kak Lina: ${WA_KAKLINA}`
  );
}

/**
 * Fungsi utama: ubah pesan pengguna menjadi balasan bot.
 * @param {string} pesan
 * @returns {{tipe: string, teks: string}}
 */
function jawab(pesan) {
  const teks = String(pesan || '').trim();
  if (!teks) return { tipe: 'sapaan', teks: salam() };

  const tokens = dedupeTokens(tokenize(teks));
  const intent = matchIntent(tokens);

  // Sapaan dulu, tapi tetap boleh digabung intent lain kalau ada isinya
  if (intent && intent.id === 'sapaan' && tokens.length <= 3) {
    return { tipe: 'sapaan', teks: salam() };
  }
  if (intent && intent.id === 'terima_kasih') {
    return { tipe: 'terima_kasih', teks: `Sama-sama Kak. Semoga umrohnya nyaman dan berjaga di Tanah Suci. Ada lagi yang bisa dibantu?` };
  }
  if (intent && intent.id === 'serah_ke_manusia') {
    return { tipe: 'serah', teks: serahkan() };
  }

  // Paket spesifik didahulukan, karena pertanyaan harga sering menyebut nama paket
  const p = matchPaket(tokens, teks);
  const mauDetail = tokens.some((t) =>
    ['detail', 'rincian', 'info', 'fasilitas', 'isi', 'tentang', 'itu'].includes(t)
  );

  if (p && intent && intent.id === 'harga' && !mauDetail) {
    const q = p.paket;
    return {
      tipe: 'harga',
      teks:
        `${q.nama} (${q.durasi}) dibanderol ${q.hargaTeks}/pax.\n\n` +
        `Untuk rincian fasilitasnya, sebutkan nama paketnya lagi ya Kak. ` +
        `Untuk pendaftaran, hubungi Kak Lina: ${kontak.telepon}`,
    };
  }

  if (p) {
    return { tipe: 'paket', teks: detailPaket(p.paket) };
  }

  // FAQ dan intent umum bisa sama-sama cocok untuk satu pesan.
  //
  // "berapa harga paket umroh?" -> intent 'harga' skor 2, tapi FAQ
  // "cara daftar" hanya skor 1 karena cuma cocok satu token. Kalau FAQ-nya
  // lemah sementara intent-nya kuat, intent yang menang, supaya pertanyaan
  // harga tidak dijawab "cara mendaftar".
  //
  // Sebaliknya "berapa uang muka?" tetap dijawab FAQ DP (skor 3.5) dan
  // "paspor berapa lama berlaku?" tetap dijawab FAQ paspor (skor 2),
  // jadi FAQ tidak pernah menimpa jawaban yang memang lebih spesifik.
  const f = matchFaq(tokens, teks);
  const faqKuat = f && f.skor >= SKOR_FAQ_STRONG;
  const intentKuat = intent && intent.skor >= SKOR_INTENT_STRONG && !faqKuat;

  if (intentKuat && intent.id === 'harga') return { tipe: 'harga', teks: daftarHarga() };
  if (intentKuat && intent.id === 'durasi') return { tipe: 'durasi', teks: infoDurasi() };

  if (f) {
    if (f.item.id === 'daftar-paket') return { tipe: 'daftar_paket', teks: daftarPaket() };
    if (f.item.id === 'hubungi') return { tipe: 'kontak', teks: infoKontak() };
    return { tipe: 'faq', teks: f.item.jawab };
  }

  return { tipe: 'fallback', teks: fallback() };
}

module.exports = { jawab, salam, daftarPaket, infoKontak };