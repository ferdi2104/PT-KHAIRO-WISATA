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
const TOKEN_WEBHOOK = process.env.WEBHOOK_TOKEN || 'ganti-token-ini';

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
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) reject(new Error('payload terlalu besar'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('JSON tidak valid'));
      }
    });
    req.on('error', reject);
  });
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    // Uji lewat query string
    if (req.method === 'GET' && url.pathname === '/api/chat') {
      const q = url.searchParams.get('q') || url.searchParams.get('pesan') || '';
      return json(res, 200, { input: q, ...jawab(q) });
    }

    // Uji via JSON
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const body = await readBody(req);
      const pesan = body.pesan || body.message || body.text || '';
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
      return json(res, 200, { ok: true, kirim: keluarCloudAPI({ to: incoming.to, pesan: balanas.teks }) });
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, waktu: new Date().toISOString() });
    }

    if (req.method === 'GET' && url.pathname === '/kontak') {
      return json(res, 200, kontak);
    }

    // Widget untuk disisipkan ke website
    if (req.method === 'GET' && url.pathname === '/widget.js') {
      const file = path.join(__dirname, '..', 'public', 'widget.js');
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      return res.end(fs.readFileSync(file));
    }

    // Halaman demo
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const file = path.join(__dirname, '..', 'public', 'demo.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(file));
    }

    return json(res, 404, { error: 'tidak ditemukan' });
  } catch (err) {
    return json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Bot KHAIRO TOURS jalan di http://localhost:${PORT}`);
  console.log(`Uji cepat:  http://localhost:${PORT}/api/chat?q=daftar%20paket`);
});