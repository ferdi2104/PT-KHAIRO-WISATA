'use strict';

/**
 * Serverless function untuk Vercel.
 * Dipanggil dari widget chat di situs https://agenkhairo.my.id
 *
 * Endpoint: POST /api/chat  { "pesan": "..." }
 */

const { jawab } = require('../bot/src/responder');
const { kontak } = require('../bot/src/matcher');

function kirim(res, kode, data) {
  res.status(kode).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  // Hanya boleh dipanggil dari halaman situs sendiri.
  res.setHeader('Access-Control-Allow-Origin', 'https://agenkhairo.my.id');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return kirim(res, 405, { error: 'Gunakan POST' });
  }

  const body = req.body || {};
  let pesan = '';

  if (typeof body === 'string') {
    try {
      pesan = (JSON.parse(body).pesan) || '';
    } catch (e) {
      return kirim(res, 400, { error: 'JSON tidak valid' });
    }
  } else {
    pesan = body.pesan || body.message || '';
  }

  pesan = String(pesan).slice(0, 500);
  if (!pesan.trim()) {
    return kirim(res, 200, {
      tipe: 'sapaan',
      teks: 'Assalamualaikum Kak, ada yang bisa saya bantu?',
    });
  }

  try {
    const hasil = jawab(pesan);
    return kirim(res, 200, {
      tipe: hasil.tipe,
      teks: hasil.teks,
      kontak: { telepon: kontak.telepon, wa: kontak.wa },
    });
  } catch (err) {
    return kirim(res, 500, {
      tipe: 'error',
      teks: 'Maaf Kak, ada gangguan. Silakan hubungi ' + kontak.telepon,
    });
  }
};