'use strict';

const { tokenize, dedupeTokens, normalize } = require('./normalize');

// Pakai require, bukan fs.readFileSync, supaya Vercel ikut membundel file ini.
const paket = require('../data/paket.json');
const faqDb = require('../data/faq.json');

const faq = faqDb.faq;
const kontak = faqDb._kontak;

/**
 * Intent umum. Aturan: kunci satu kata harus cocok persis,
 * kunci beberapa kata harus SEMUA kata tataunya ada di pesan.
 */
const INTENT = [
  {
    id: 'sapaan',
    kunci: ['assalamualaikum', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 'halo', 'hai', 'hi', 'hello', 'permisi'],
  },
  {
    id: 'terima_kasih',
    kunci: ['terima kasih', 'makasih', 'thanks', 'thank you', 'jazakumillah', 'jazakallah'],
  },
  {
    id: 'serah_ke_manusia',
    kunci: ['kak lina', 'lina', 'agen', 'manusia', 'orang', 'bicara', 'komplain', 'keluh', 'marah', 'keberatan', 'tidak puask', 'keberatan'],
  },
  {
    id: 'harga',
    kunci: ['harga', 'biaya', 'berapa', 'tarif', 'murah', 'termurah', 'paling murah', 'budget', 'diskon', 'promo'],
  },
  {
    id: 'durasi',
    kunci: ['berapa lama', 'berapa hari', 'durasi', 'berapa malam', 'lama'],
  },
];

const SKOR_KUNCI = 1;
const MIN_FAQ_SCORE = 1.0;

/** Cek satu kunci terhadap daftar token */
function kunciCocok(kunci, tokens) {
  const kata = normalize(kunci).split(' ').filter(Boolean);
  if (!kata.length) return false;
  if (kata.length === 1) return tokens.includes(kata[0]);
  return kata.every((w) => tokens.includes(w));
}

/** Cari intent umum dengan skor tertinggi */
function matchIntent(tokens) {
  let terbaik = null;
  for (const intent of INTENT) {
    let skor = 0;
    for (const k of intent.kunci) {
      if (kunciCocok(k, tokens)) skor += SKOR_KUNCI;
    }
    if (skor > 0 && (!terbaik || skor > terbaik.skor)) {
      terbaik = { id: intent.id, skor };
    }
  }
  return terbaik;
}

/** Cari paket dari daftar tag yang khas (bukan dari nama umum seperti "umroh") */
function matchPaket(tokens, pesan) {
  const pesanLower = normalize(pesan);
  let terbaik = null;

  for (const p of paket) {
    let skor = 0;
    for (const tag of p.tag) {
      const t = normalize(tag);
      if (!t) continue;
      if (t.includes(' ')) {
        if (pesanLower.includes(t)) skor += 2;
      } else if (tokens.includes(t)) {
        skor += 2;
      }
    }
    if (skor >= 2 && (!terbaik || skor > terbaik.skor)) {
      terbaik = { paket: p, skor };
    }
  }
  return terbaik;
}

/**
 * Cari FAQ dengan skor token yang cocok.
 * Bonus tambahan kalau frasa kunci muncul utuh di pesan,
 * Contoh: kunci "daftar paket" diberi bonus kalau pesan memuat frasa itu utuh.
 */
function matchFaq(tokens, pesan) {
  const pesanLower = normalize(pesan);
  let terbaik = null;

  for (const item of faq) {
    // Peta token -> apakah token itu berasal dari kunci satu kata.
    // Kunci satu kata dianggap lebih spesifik daripada kunci frasa.
    const asal = new Map();
    for (const k of item.kunci) {
      const satuKata = !normalize(k).includes(' ');
      for (const t of tokenize(k)) {
        if (!asal.has(t) || satuKata) asal.set(t, satuKata);
      }
    }
    const unik = [...asal.keys()];

    let skor = 0;
    let adaCocokPersis = false;
    let penuh = 0; // jumlah kunci satu kata yang cocok persis

    for (const t of tokens) {
      for (const kt of unik) {
        if (t === kt) {
          skor += 1;
          adaCocokPersis = true;
          if (asal.get(kt)) penuh += 1;
          break;
        }
        if (t.length > 3 && kt.length > 3 && (kt.includes(t) || t.includes(kt))) {
          skor += 0.5;
          break;
        }
      }
    }

    // Bonus frasa utuh
    let adaFrasa = false;
    for (const k of item.kunci) {
      const frasa = normalize(k);
      if (frasa.includes(' ') && pesanLower.includes(frasa)) {
        skor += 1.5;
        adaFrasa = true;
      }
    }

    if (!adaCocokPersis && !adaFrasa) continue;
    if (skor < MIN_FAQ_SCORE) continue;

    // seri skor diputuskan lewat kunci yang paling spesifik
    if (
      !terbaik ||
      skor > terbaik.skor ||
      (skor === terbaik.skor && penuh > terbaik.penuh)
    ) {
      terbaik = { item, skor, penuh };
    }
  }
  return terbaik;
}

module.exports = { paket, faq, kontak, matchIntent, matchPaket, matchFaq, normalize };