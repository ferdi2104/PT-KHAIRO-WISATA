'use strict';

/**
 * Uji api/chat.js tanpa deploy, pakai req/res tiruan.
 * Jalankan: node bot/test-api.js
 */

const handler = require('../api/chat');
const health = require('../api/health');

function tiruanRes() {
  const r = {
    kode: 200,
    header: {},
    body: '',
    setHeader(k, v) { this.header[k] = v; return this; },
    status(c) { this.kode = c; return this; },
    end(b) { this.body = b || ''; return this; },
  };
  return r;
}

async function panggil(fn, req) {
  const res = tiruanRes();
  await fn(req, res);
  return res;
}

const KASUS = [
  { pesan: 'assalamualaikum' },
  { pesan: 'paket termurah berapa?' },
  { pesan: 'mabrur' },
  { pesan: 'syarat dokumen apa saja?' },
  { pesan: '' },
];

(async function jalankan() {
  let lulus = 0;

  console.log('=== /api/health ===');
  const h = await panggil(health, { method: 'GET' });
  console.log('HTTP ' + h.kode + '  ' + h.body);
  if (h.kode === 200) lulus++;

  console.log('\n=== POST /api/chat ===');
  for (const k of KASUS) {
    const res = await panggil(handler, { method: 'POST', body: k });
    let parsed = null;
    try { parsed = JSON.parse(res.body); } catch (e) {}
    const ok = res.kode === 200 && parsed && parsed.teks;
    if (ok) lulus++;
    console.log(
      (ok ? 'OK   ' : 'GAGAL') +
        ' | ' + JSON.stringify(k.pesan).padEnd(26) +
        ' HTTP ' + res.kode + ' | ' + (parsed ? parsed.tipe : '-') +
        ' | ' + (parsed ? parsed.teks.split('\n')[0].slice(0, 46) : res.body.slice(0, 46)),
    );
  }

  // Method lain harus ditolak
  const salah = await panggil(handler, { method: 'GET', body: {} });
  console.log('\nGET harus ditolak: HTTP ' + salah.kode);
  if (salah.kode === 405) lulus++;

  console.log('\n' + '-'.repeat(60));
  console.log('Lulus: ' + lulus + '/' + (KASUS.length + 2));
  if (lulus < KASUS.length + 2) process.exitCode = 1;
})();