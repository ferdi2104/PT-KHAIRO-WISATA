'use strict';

/**
 * Normalisasi teks pesan pengguna.
 * Mengubah pesan menjadi bentuk lowercase tanpa tanda baca,
 * supaya pencocokan kata kunci lebih konsisten.
 */

const STOPWORD = new Set([
  'yang', 'untuk', 'dari', 'dengan', 'pada', 'adalah', 'itu', 'ini',
  'saya', 'kak', 'kakak', 'mas', 'mbak', 'bang', 'bro',
  'tolong', 'mohon', 'bisa', 'boleh', 'mau', 'ingin', 'pengen',
  'dong', 'sih', 'kok', 'ya', 'oke', 'ok', 'oke',
]);

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORD.has(w));
}

/** Buang kata yang saling mengandung, contoh: "kereta" dan "kereta cepat" */
function dedupeTokens(tokens) {
  const out = [];
  for (const t of tokens) {
    const dup = out.some((o) => o === t || o.includes(t) || t.includes(o));
    if (!dup) out.push(t);
  }
  return out;
}

module.exports = { normalize, tokenize, dedupeTokens, STOPWORD };