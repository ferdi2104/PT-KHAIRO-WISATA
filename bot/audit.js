'use strict';

/**
 * Pemeriksa bug pada halaman HTML.
 * Jalankan: node bot/audit.js
 */

const fs = require('fs');
const path = require('path');

const AKAR = path.join(__dirname, '..');
const HALAMAN = fs
  .readdirSync(AKAR)
  .filter((f) => f.endsWith('.html'));

const masalah = [];

function catat(file, jenis, detail) {
  masalah.push({ file, jenis, detail });
}

/** Ambil semua kemunculan atribut di dalam markup */
function semuaAtribut(html, nama) {
  const hasil = [];
  const re = new RegExp(`\\b${nama}\\s*=\\s*"([^"]*)"`, 'gi');
  let m;
  while ((m = re.exec(html))) hasil.push({ nilai: m[1], index: m.index });
  return hasil;
}

/** Nomor baris dari offset karakter */
function baris(teks, index) {
  return teks.slice(0, index).split('\n').length;
}

for (const file of HALAMAN) {
  const full = path.join(AKAR, file);
  const html = fs.readFileSync(full, 'utf8');

  /* --- src kosong --- */
  for (const a of semuaAtribut(html, 'src')) {
    if (a.nilai.trim() === '') {
      catat(file, 'src kosong', `baris ${baris(html, a.index)}`);
    }
  }

  /* --- href kosong --- */
  for (const a of semuaAtribut(html, 'href')) {
    if (a.nilai.trim() === '') {
      catat(file, 'href kosong', `baris ${baris(html, a.index)}`);
    }
  }

  /* --- id ganda --- */
  const ids = semuaAtribut(html, 'id').map((a) => a.nilai);
  const hitung = {};
  for (const id of ids) hitung[id] = (hitung[id] || 0) + 1;
  for (const [id, n] of Object.entries(hitung)) {
    if (n > 1) catat(file, 'id ganda', `"${id}" muncul ${n} kali`);
  }

  /* --- img tanpa alt --- */
  const imgRe = /<img\b[^>]*>/gi;
  let m;
  while ((m = imgRe.exec(html))) {
    if (!/\balt\s*=/i.test(m[0])) {
      catat(file, 'img tanpa alt', `baris ${baris(html, m.index)}: ${m[0].slice(0, 70)}`);
    }
  }

  /* --- tautan internal ke berkas yang tidak ada --- */
  for (const a of semuaAtribut(html, 'href')) {
    const h = a.nilai.trim();
    if (!h || h.startsWith('#') || h.startsWith('http') || h.startsWith('mailto:')) continue;
    if (h.startsWith('tel:') || h.startsWith('data:')) continue;
    const target = h.split('#')[0].split('?')[0];
    if (!target) continue;
    const ada = fs.existsSync(path.join(AKAR, decodeURIComponent(target)));
    if (!ada) catat(file, 'tautan mati', `"${h}"`);
  }

  /* --- gambar internal yang hilang --- */
  for (const a of semuaAtribut(html, 'src')) {
    const s = a.nilai.trim();
    if (!s || s.startsWith('http') || s.startsWith('data:')) continue;
    const target = s.split('#')[0].split('?')[0];
    if (!target) continue;
    const ada = fs.existsSync(path.join(AKAR, decodeURIComponent(target)));
    if (!ada) catat(file, 'gambar hilang', `"${s}"`);
  }

  /* --- tautan halaman saja (anchor ke id yang tidak ada) --- */
  const idSet = new Set(ids);
  for (const a of semuaAtribut(html, 'href')) {
    const h = a.nilai.trim();
    if (!h.startsWith('#') || h === '#') continue;
    const target = h.slice(1);
    if (target && !idSet.has(target)) {
      catat(file, 'anchor tanpa target', `"${h}"`);
    }
  }

  /* --- elemen wajib halaman --- */
  if (!/<html[^>]*\slang=/i.test(html)) catat(file, 'lang hilang', '<html> tanpa lang');
  if (!/name=["']viewport["']/i.test(html)) catat(file, 'viewport hilang', '<meta name="viewport">');
  if (!/<title>/i.test(html)) catat(file, 'title hilang', '');
  if (!/<meta[^>]+name=["']description["']/i.test(html)) {
    catat(file, 'meta description hilang', '');
  }
  if (!/<h1[\s>]/i.test(html)) catat(file, 'h1 hilang', 'tidak ada h1');

  /* --- heading melompat --- */
  const heading = [...html.matchAll(/<h([1-6])[\s>]/gi)].map((x) => Number(x[1]));
  for (let i = 1; i < heading.length; i++) {
    if (heading[i] - heading[i - 1] > 1) {
      catat(file, 'heading melompat', `h${heading[i - 1]} lalu h${heading[i]}`);
    }
  }
}

/* ---- Gambar: html yangescape atau berukuran 0 ---- */
for (const dir of ['images']) {
  const p = path.join(AKAR, dir);
  if (!fs.existsSync(p)) continue;
  for (const sub of fs.readdirSync(p, { withFileTypes: true })) {
    if (!sub.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(p, sub.name))) {
      if (!/\.(jpe?g|png|webp|avif|gif)$/i.test(f)) continue;
      const size = fs.statSync(path.join(p, sub.name, f)).size;
      if (size < 3000) catat(`${dir}/${sub.name}/${f}`, 'gambar minuscule', size + ' byte');
    }
  }
}

/* ---- Laporan ---- */
console.log('Berkas diperiksa: ' + HALAMAN.length + ' halaman\n');
if (!masalah.length) {
  console.log('Tidak ada temuan.');
  process.exit(0);
}

const perJenis = {};
for (const m of masalah) (perJenis[m.jenis] ||= []).push(m);

for (const [jenis, list] of Object.entries(perJenis)) {
  console.log('### ' + jenis + ' (' + list.length + ')');
  const tapi = new Map();
  for (const m of list) {
    const k = m.file + '|' + m.detail;
    if (!tapi.has(k)) tapi.set(k, m);
  }
  for (const m of tapi.values()) {
    console.log('  ' + m.file + (m.detail ? '  ->  ' + m.detail : ''));
  }
  console.log('');
}
console.log('Total: ' + masalah.length + ' temuan');