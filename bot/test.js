'use strict';

/**
 * Uji otomatis: cek apakah bot menjawab dengan benar.
 * Jalankan: node test.js
 */

const { jawab } = require('./src/responder');

// [pertanyaan, tipe jawaban yang diharapkan]
const KASUS = [
  ['assalamualaikum', 'sapaan'],
  ['halo', 'sapaan'],
  ['daftar paket', 'daftar_paket'],
  ['paket apa saja?', 'daftar_paket'],
  ['paket termurah berapa?', 'harga'],
  ['harga umroh hemat', 'harga'],
  ['mabrur', 'paket'],
  ['tell me about turkiye', 'paket'],
  ['umroh hemat', 'paket'],
  ['haji plus', 'paket'],
  ['berapa lama?', 'durasi'],
  ['syarat dokumen apa saja?', 'faq'],
  ['paspor berapa lama berlaku?', 'faq'],
  ['suntik meningitis wajib tidak?', 'faq'],
  ['berapa uang muka?', 'faq'],
  ['bisa cicil tidak?', 'faq'],
  ['refund kalau batal?', 'faq'],
  ['jamaah wanita harus bawa mahram?', 'faq'],
  ['apakah resmi?', 'faq'],
  ['cara daftar', 'faq'],
  ['nomor whatsappnya berapa', 'kontak'],
  ['mau bicara sama kak lina', 'serah'],
  ['asdfghjkl qwertyuiop', 'fallback'],

  // Regresi: FAQ pernah menimpa intent harga, sehingga "berapa harga paket"
  // dijawab "cara mendaftar". Intent menang hanya kalau skornya kuat
  // dan FAQ-nya lemah.
  ['berapa harga paket umroh?', 'harga'],
  ['berapa harga', 'harga'],
  ['paket termurah berapa?', 'harga'],
  // Regresi: "orang" memicu handoff ke agen, padahal pertanyaannya soal paket.
  ['paket apa saja untuk orang banyak?', 'daftar_paket'],
];

let lulus = 0;
const gagal = [];

for (const [pertanyaan, hope] of KASUS) {
  const hasil = jawab(pertanyaan);
  const ok = hasil.tipe === hope;
  if (ok) lulus++;
  else gagal.push({ pertanyaan, hope, got: hasil.tipe });

  const preview = hasil.teks.split('\n')[0].slice(0, 60);
  console.log(`${ok ? 'OK  ' : 'GAGAL'} | ${pertanyaan.padEnd(34)} -> ${hasil.tipe.padEnd(14)} | ${preview}`);
}

console.log('\n' + '-'.repeat(60));
console.log(`Lulus: ${lulus}/${KASUS.length}`);
if (gagal.length) {
  console.log('\nYang gagal:');
  for (const g of gagal) {
    console.log(`  "${g.pertanyaan}" — ekspektasi ${g.hope}, dapat ${g.got}`);
  }
  process.exitCode = 1;
} else {
  console.log('Semua kasus lulus.');
}