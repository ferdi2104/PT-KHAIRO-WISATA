'use strict';

/**
 * Server bot KHAIRO TOURS - Fase 1 (rule based, tanpa AI).
 *
 * Tanpa dependency: cukup `node src/server.js`.
 * Endpoint:
 *   GET  /            -> halaman demo chat
 *   GET  /api/chat?q= -> uji bot lewat URL
 *   POST /api/chat    -> uji bot via JSON { "pesan": "..." }
 *   POST /webhook     ->-prepared untuk WhatsApp Cloud API / WAHA
 *   GET  /health      -> cek status server
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { jawab } = require('./responder');
const { kontak } = require('./matcher');

// Port 3000 dipakai proses lain di komputer ini, jadi pakai 3100.
const PORT = process.env.PORT || 3100;
// Token default hanya untuk pengembangan lokal. Kalau dipakai tanpa
// WEBHOOK_TOKEN, endpoint /webhook terbuka untuk siapa pun yang tahu
// string ini, jadi hal ini diperingatkan saat boot.
const TOKEN_WEBHOOK = process.env.WEBHOOK_TOKEN || 'ganti-token-ini';
const TOKEN_BELUM_DIGANTI = !process.env.WEBHOOK_TOKEN;

function json(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let penuh = false;
    req.on('data', (chunk) => {
      // Setelah payloadtoo besar, jangan akumulasikan string lagi:
      // request bisa berukuran besar dan menahan memori selama koneksi hidup.
      if (penuh) return;
      data += chunk;
      if (data.length > 1e6) {
        penuh = true;
        data = '';
        reject(new Error('payload terlalu besar'));
      }
    });
    req.on('end', () => {
      if (penuh) return;
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('JSON tidak valid'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Kirim file statis. Baca file DULU, baru tulis header, supaya file yang
 * hilang atau tidak terbaca tidak pernah memanggil writeHead dua kali.
 * Kalau tidak, error kedua dilempar dari dalam catch dan menjatuhkan proses.
 */
function kirimFile(res, file, contentType) {
  let isi;
  try {
    isi = fs.readFileSync(file);
  } catch {
    return json(res, 404, { error: 'tidak ditemukan' });
  }
  res.writeHead(200, { 'Content-Type': contentType });
  return res.end(isi);
}

/* ---------- Adaptor WhatsApp (Cloud API dan WAHA) ---------- */

/** Cloud API (Meta) */
function keluarCloudAPI(payload) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: payload.to,
    type: 'text',
    text: { preview_url: false, body: payload.pesan },
  };
}

/** WAHA / Baileys ( unofficial, opsional) */
function keluarWAHA(payload) {
  return { to: payload.to, text: payload.pesan };
}

/** Ambil teks pesan dari berbagai format webhook */
function ambilPesan(body) {
  // Cloud API
  const entries = body.entry || [];
  for (const e of entries) {
    for (const ch of e.changes || []) {
      const msg = ch.value && ch.value.messages && ch.value.messages[0];
      if (msg && msg.text && msg.text.body) return { to: msg.from, pesan: msg.text.body };
    }
  }
  // WAHA
  if (body.from && body.text) return { to: body.from, pesan: body.text };
  // Mode tes
  if (body.pesan) return { to: body.to || 'test', pesan: body.pesan };
  return null;
}

/* ---------- Server ---------- */

// Batas panjang pesan. Tanpa ini, pencocokan FAQ bersifat O(n^2) dan satu
// request besar bisa memblokir event loop server ini.
/** Batas aman: cukup untuk pertanyaan panjang, tidak untuk payload abusing */
const MAX_PESAN = 500;

const server = http.createServer((req, res) => {
  // Handler dibungkus fungsi async terpisah supaya error-nya masuk ke .catch(),
  // bukan jadi unhandled rejection yang menjatuhkan seluruh proses.
  tangani(req, res).catch((err) => {
    if (res.headersSent) {
      res.end();
      return;
    }
    // Jangan kirim pesan error internal ke klien.
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'terjadi kesalahan di server' }));
    console.error('[bot]', err && err.message);
  });
});

async function tangani(req, res) {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    return json(res, 400, { error: 'URL tidak valid' });
  }

  try {
    // Uji lewat query string
    if (req.method === 'GET' && url.pathname === '/api/chat') {
      const q = (url.searchParams.get('q') || url.searchParams.get('pesan') || '').slice(0, MAX_PESAN);
      return json(res, 200, { input: q, ...jawab(q) });
    }

    // Uji via JSON
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const body = await readBody(req);
      const pesan = String(body.pesan || body.message || body.text || '').slice(0, MAX_PESAN);
      return json(res, 200, { input: pesan, ...jawab(pesan) });
    }

    // Webhook WhatsApp
    if (req.method === 'POST' && url.pathname === '/webhook') {
      const token = url.searchParams.get('token') || req.headers['x-webhook-token'];
      if (token !== TOKEN_WEBHOOK) return json(res, 401, { error: 'token salah' });

      const body = await readBody(req);
      const incoming = ambilPesan(body);
      if (!incoming) return json(res, 400, { error: 'format pesan tidak dikenali' });

      const balasan = jawab(incoming.pesan);

      // Kirim balasan ke WhatsApp.
      // Aktifkan SALAH SATU baris di bawah sesuai provider yang dipakai.
      const mode = process.env.WA_MODE || 'cloud'; // 'cloud' | 'waha' | 'none'

      if (mode === 'none') {
        return json(res, 200, { ok: true, mode, balasan });
      }
      if (mode === 'waha') {
        return json(res, 200, { ok: true, kirim: keluarWAHA({ to: incoming.to, pesan: balasan.teks }) });
      }
      return json(res, 200, { ok: true, kirim: keluarCloudAPI({ to: incoming.to, pesan: balasan.teks }) });
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, waktu: new Date().toISOString() });
    }

    if (req.method === 'GET' && url.pathname === '/kontak') {
      return json(res, 200, kontak);
    }

    // Widget untuk disisipkan ke website
    if (req.method === 'GET' && url.pathname === '/widget.js') {
      return kirimFile(res, path.join(__dirname, '..', 'public', 'widget.js'), 'application/javascript; charset=utf-8');
    }

    // Halaman demo
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return kirimFile(res, path.join(__dirname, '..', 'public', 'demo.html'), 'text/html; charset=utf-8');
    }

    return json(res, 404, { error: 'tidak ditemukan' });
  } catch (err) {
    // Pesan error internal tidak boleh sampai ke klien (bisa memuat path server).
    if (err && /JSON tidak valid|payload terlalu besar/.test(err.message)) {
      return json(res, 400, { error: 'permintaan tidak valid' });
    }
    console.error('[bot]', err && err.message);
    return json(res, 500, { error: 'terjadi kesalahan di server' });
  }
}

server.listen(PORT, () => {
  console.log(`Bot KHAIRO TOURS jalan di http://localhost:${PORT}`);
  console.log(`Uji cepat:  http://localhost:${PORT}/api/chat?q=daftar%20paket`);
  if (TOKEN_BELUM_DIGANTI) {
    console.warn('PERINGATAN: WEBHOOK_TOKEN belum diatur, /webhook memakai token default yang ada di source.');
  }
});