'use strict';

/**
 * Perintah singkat untuk mengirim perubahan ke live.
 *
 * Pakai:
 *   node kirim.js                  -> commit dengan pesan otomatis
 *   node kirim.js "pesan saya"      -> commit dengan pesan sendiri
 *
 * Urutannya: cek tes dulu. Kalau ada yang gagal, proses dibatalkan
 * supaya data yang salah tidak ikut ke live.
 */

const path = require('path');
const { execFileSync } = require('child_process');

const AKAR = path.join(__dirname, '..');          // akar repo git
const TES = path.join(__dirname, 'test.js');      // selalu path penuh

function jalankan(cmd, args, opsi = {}) {
  return execFileSync(cmd, args, {
    cwd: AKAR,
    encoding: 'utf8',
    stdio: opsi.diam ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
}

function gagal(pesan) {
  console.error('\nDibatalkan: ' + pesan);
  process.exit(1);
}

/* ---- 1. Tes dulu ---- */
console.log('Menjalankan tes...');
let hasilTes;
try {
  hasilTes = jalankan(process.execPath, [TES], { diam: true });
} catch (e) {
  process.stdout.write(e.stdout || '');
  process.stderr.write(e.stderr || '');
  gagal('tes gagal, perbaiki dulu sebelum kirim');
}
console.log('Tes OK: ' + hasilTes.trim().split('\n').pop());

/* ---- 2. Ada perubahan? ---- */
let status;
try {
  status = jalankan('git', ['status', '--porcelain'], { diam: true });
} catch (e) {
  gagal('gagal membaca status git: ' + e.message);
}

if (!status.trim()) {
  console.log('\nTidak ada perubahan. Tidak ada yang perlu dikirim.');
  process.exit(0);
}

const jumlah = status.trim().split('\n').length;
console.log('\n' + jumlah + ' berkas berubah:');
status.trim().split('\n').forEach((b) => console.log('  ' + b));

/* ---- 3. Commit ---- */
const pesan = process.argv[2] || 'Perbarui data bot';
try {
  jalankan('git', ['add', '-A']);
  jalankan('git', ['commit', '-m', pesan]);
} catch (e) {
  gagal('gagal membuat commit: ' + e.message);
}

/* ---- 4. Push ---- */
try {
  jalankan('git', ['push']);
} catch (e) {
  gagal('gagal push. Periksa koneksi atau hak akses GitHub.');
}

console.log('\nTerkirim. Vercel akan deploy otomatis dalam sekitar 1 menit.');