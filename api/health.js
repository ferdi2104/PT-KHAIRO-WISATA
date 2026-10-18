'use strict';

/** Health check bot: GET /api/health */

const { paket, faq } = require('../bot/src/matcher');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).end(
    JSON.stringify({
      ok: true,
      paket: paket.length,
      faq: faq.length,
      waktu: new Date().toISOString(),
    }),
  );
};