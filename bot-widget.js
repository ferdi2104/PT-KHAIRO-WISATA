/**
 * Widget chat KHAIRO TOURS & TRAVELS.
 *
 * Cara pakai, taruh sebelum </body> di halaman mana pun:
 *   <script src="bot-widget.js" defer></script>
 *
 * Chat dirender langsung di dalam halaman, tanpa iframe,
 * supaya tidak bentrok dengan Content-Security-Policy situs
 * (frame-ancestors 'none' dan X-Frame-Options: DENY).
 */
(function () {
  'use strict';

  var CONFIG = {
    nama: 'KHAIRO TOURS',
    sub: 'Online &middot; balas otomatis',
    // Serverless function milik situs sendiri.
    api: '/api/chat',
    posisi: 'kanan', // 'kanan' | 'kiri'
  };

  // Jarak dari bawah mengikuti .wa-float yang sudah ada di situs:
  // 22px + tinggi tombol ~46px + jarak 12px = 80px
  var BAWAH = 'calc(80px + env(safe-area-inset-bottom))';
  var SISI = '24px';
  var SISI_CSS = CONFIG.posisi === 'kiri' ? 'left' : 'right';

  var sudahAda = false;

  var CONTOH = [
    'Assalamualaikum',
    'Paket termurah berapa?',
    'Paket Mabrur',
    'Syarat dokumen apa saja?',
    'Berapa uang muka?',
  ];

  function sisipkanGaya() {
    if (document.getElementById('khairo-bot-gaya')) return;

    var css = [
      '#khairo-bot-wrap{position:fixed;bottom:' + BAWAH + ';' + SISI_CSS + ':' + SISI + ';',
      'z-index:10002;display:flex;flex-direction:column;',
      'align-items:' + (CONFIG.posisi === 'kiri' ? 'flex-start' : 'flex-end') + ';gap:12px;}',
      '#khairo-bot-wrap button,#khairo-bot-wrap input{font-family:var(--font);',
      '-webkit-tap-highlight-color:transparent;}',

      '#khairo-bot-btn{width:56px;height:56px;border-radius:var(--r-pill);',
      'background:var(--green-800);color:var(--gold-500);',
      'border:1px solid rgba(255,255,255,.12);cursor:pointer;padding:0;',
      'display:flex;align-items:center;justify-content:center;',
      'box-shadow:var(--shadow-md);',
      'transition:transform 150ms cubic-bezier(.2,0,0,1),background-color 150ms linear;}',
      '#khairo-bot-btn:hover{background:var(--green-700);}',
      '#khairo-bot-btn:active{transform:scale(.96);}',
      '#khairo-bot-btn:focus-visible{outline:2px solid var(--gold-500);outline-offset:3px;}',

      '#khairo-bot-panel{display:none;width:340px;max-width:calc(100vw - 32px);',
      'height:min(520px,calc(100vh - 140px));background:var(--white);',
      'border-radius:var(--r-lg);overflow:hidden;',
      'box-shadow:0 12px 40px rgba(0,0,0,.28);',
      'border:1px solid rgba(0,0,0,.08);flex-direction:column;}',
      '#khairo-bot-panel.khuis{display:flex;}',
      '#khairo-bot-kepala{background:var(--green-800);color:#fff;padding:12px 15px;',
      'border-bottom:2px solid var(--gold-500);display:flex;',
      'align-items:center;justify-content:space-between;gap:8px;flex:0 0 auto;}',
      '#khairo-bot-judul{font-size:.92rem;font-weight:600;letter-spacing:.2px;}',
      '#khairo-bot-sub{font-size:.74rem;opacity:.85;margin-top:2px;}',
      '#khairo-bot-tutup{background:transparent;border:0;color:#fff;cursor:pointer;',
      'padding:6px;display:flex;border-radius:var(--r-sm);}',
      '#khairo-bot-tutup:hover{background:rgba(255,255,255,.12);}',
      '#khairo-bot-tutup:focus-visible{outline:2px solid var(--gold-500);outline-offset:2px;}',

      '#khairo-bot-log{flex:1;overflow-y:auto;overscroll-behavior:contain;',
      'padding:14px;display:flex;flex-direction:column;gap:9px;}',
      '.kb-msg{max-width:82%;padding:9px 12px;border-radius:14px;font-size:.86rem;',
      'line-height:1.55;white-space:pre-wrap;word-wrap:break-word;}',
      '.kb-bot{background:#eef2f0;align-self:flex-start;border-bottom-left-radius:4px;}',
      '.kb-me{background:var(--green-800);color:#fff;align-self:flex-end;',
      'border-bottom-right-radius:4px;}',
      '.kb-tip{font-size:.72rem;color:#7c8c86;text-align:center;}',

      '#khairo-bot-contoh{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 10px;}',
      '#khairo-bot-contoh button{background:#eef2f0;color:var(--green-800);',
      'font-size:.74rem;font-weight:600;padding:7px 12px;border:0;',
      'border-radius:var(--r-pill);cursor:pointer;}',
      '#khairo-bot-contoh button:hover{background:var(--green-800);color:#fff;}',

      '#khairo-bot-form{display:flex;gap:8px;padding:11px 12px;',
      'border-top:1px solid #e3e7e5;flex:0 0 auto;}',
      '#khairo-bot-input{flex:1;padding:10px 13px;border:1px solid #d6ddda;',
      'border-radius:var(--r-pill);font-size:.86rem;outline:none;}',
      '#khairo-bot-input:focus-visible{border-color:var(--green-700);',
      'outline:2px solid var(--gold-500);outline-offset:1px;}',
      '#khairo-bot-kirim{padding:10px 18px;border:0;border-radius:var(--r-pill);',
      'background:var(--green-800);color:var(--gold-500);font-size:.86rem;',
      'font-weight:600;cursor:pointer;}',
      '#khairo-bot-kirim:hover{background:var(--green-700);}',
      '#khairo-bot-kirim:disabled{opacity:.5;cursor:default;}',

      '@media(max-width:480px){#khairo-bot-panel{width:calc(100vw - 32px);',
      'height:min(460px,calc(100vh - 150px));}}',
      '@media(prefers-reduced-motion:reduce){#khairo-bot-btn{transition:none;}}',
    ].join('');

    var style = document.createElement('style');
    style.id = 'khairo-bot-gaya';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ikonBuka() {
    return (
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5a8.4 8.4 0 0 1-.9-3.8 8.4 8.4 0 0 1 8.4-9 8.4 8.4 0 0 1 8.6 8.4z"/></svg>'
    );
  }

  function ikonTutup() {
    return (
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M18 6 6 18M6 6l12 12"/></svg>'
    );
  }

  function buat() {
    if (sudahAda) return;
    sudahAda = true;
    sisipkanGaya();

    var wrap = document.createElement('div');
    wrap.id = 'khairo-bot-wrap';

    var panel = document.createElement('div');
    panel.id = 'khairo-bot-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chat dengan asisten ' + CONFIG.nama);

    var kepala = document.createElement('div');
    kepala.id = 'khairo-bot-kepala';
    var kiri = document.createElement('div');
    var judul = document.createElement('div');
    judul.id = 'khairo-bot-judul';
    judul.textContent = CONFIG.nama;
    var sub = document.createElement('div');
    sub.id = 'khairo-bot-sub';
    sub.innerHTML = CONFIG.sub;
    kiri.appendChild(judul);
    kiri.appendChild(sub);
    var tutup = document.createElement('button');
    tutup.id = 'khairo-bot-tutup';
    tutup.type = 'button';
    tutup.setAttribute('aria-label', 'Tutup chat');
    tutup.innerHTML = ikonTutup();
    kepala.appendChild(kiri);
    kepala.appendChild(tutup);

    var log = document.createElement('div');
    log.id = 'khairo-bot-log';
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');

    var contoh = document.createElement('div');
    contoh.id = 'khairo-bot-contoh';
    CONTOH.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = t;
      b.addEventListener('click', function () { kirim(t); });
      contoh.appendChild(b);
    });

    var form = document.createElement('form');
    form.id = 'khairo-bot-form';
    var input = document.createElement('input');
    input.id = 'khairo-bot-input';
    input.type = 'text';
    input.placeholder = 'Tulis pertanyaan...';
    input.setAttribute('aria-label', 'Tulis pertanyaan');
    input.autocomplete = 'off';
    var kirimBtn = document.createElement('button');
    kirimBtn.id = 'khairo-bot-kirim';
    kirimBtn.type = 'submit';
    kirimBtn.textContent = 'Kirim';
    form.appendChild(input);
    form.appendChild(kirimBtn);

    panel.appendChild(kepala);
    panel.appendChild(log);
    panel.appendChild(contoh);
    panel.appendChild(form);

    var btn = document.createElement('button');
    btn.id = 'khairo-bot-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Buka chat dengan asisten');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'khairo-bot-panel');
    btn.innerHTML = ikonBuka();

    function bukaAturTutup() {
      var buka = !panel.classList.contains('khuis');
      panel.classList.toggle('khuis', buka);
      btn.setAttribute('aria-expanded', String(buka));
      btn.setAttribute('aria-label', buka ? 'Tutup chat' : 'Buka chat dengan asisten');
      btn.innerHTML = buka ? ikonTutup() : ikonBuka();
      if (buka) setTimeout(function () { input.focus(); }, 60);
    }

    btn.addEventListener('click', bukaAturTutup);
    tutup.addEventListener('click', bukaAturTutup);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('khuis')) {
        bukaAturTutup();
        btn.focus();
      }
    });

    function tambah(teks, sisi) {
      var d = document.createElement('div');
      d.className = 'kb-msg kb-' + sisi;
      d.textContent = teks;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    }

    function mengetik() {
      var d = document.createElement('div');
      d.className = 'kb-msg kb-bot';
      d.textContent = 'Mengetik...';
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
      return d;
    }

    async function kirim(pesan) {
      pesan = String(pesan || '').trim();
      if (!pesan) return;
      tambah(pesan, 'me');
      input.value = '';
      kirimBtn.disabled = true;
      var draf = mengetik();

      try {
        var r = await fetch(CONFIG.api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pesan: pesan }),
        });
        var d = await r.json();
        draf.textContent = d.teks || 'Maaf Kak, ada gangguan.';
      } catch (e) {
        draf.textContent = 'Maaf Kak, tidak bisa menghubungi server. Coba lagi sebentar.';
      }
      kirimBtn.disabled = false;
      input.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      kirim(input.value);
    });

    tambah(
      'Assalamualaikum, selamat datang di ' + CONFIG.nama +
      '. Saya asisten virtual. Silakan tanya apa saja tentang paket umroh kami.',
      'bot',
    );

    wrap.appendChild(panel);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buat);
  } else {
    buat();
  }
})();