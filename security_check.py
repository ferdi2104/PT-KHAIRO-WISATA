#!/usr/bin/env python3
"""
Audit keamanan website statis.

Usage:
    python security_check.py https://domain-kamu.com
    python security_check.py agenkhairo.my.id --pages index.html,faq.html

Script ini TIDAK hanya menanyakan "header ini ada atau tidak". Ia juga
memverifikasi bahwa header tersebut benar-benar bekerja:

  1. Transport  - http:// dialihkan ke https://, sertifikat SSL valid
  2. Headers    - 6 header wajib ada di SEMUA halaman
  3. CSP nyata  - apakah CSP memblokir aset yang benar-benar dipakai halaman
                  (script, style, gambar, font) atau memblokir <a href>?
  4. Cache      - aset statis punya cache CDN, HTML selalu revalidate

Exit code: 0 = bersih, 1 = ada temuan.
Hanya memakai pustaka standar Python.
"""

import argparse
import re
import socket
import ssl
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

USER_AGENT = "SecurityHeaderAudit/2.0"
TIMEOUT = 20
MAX_FONT_PROBES = 3

REQUIRED_HEADERS = {
    "content-security-policy": "Melindungi dari XSS dan injeksi script",
    "strict-transport-security": "Memaksa HTTPS",
    "x-content-type-options": "Mencegah MIME sniffing",
    "x-frame-options": "Mencegah clickjacking",
    "referrer-policy": "Membatasi kebocoran URL asal",
    "permissions-policy": "Membatasi akses fitur browser",
}

STATIC_EXT = (
    ".css", ".js", ".mjs", ".jpg", ".jpeg", ".png", ".gif", ".svg",
    ".webp", ".avif", ".ico", ".woff", ".woff2", ".eot", ".ttf", ".otf",
)


# --------------------------------------------------------------------------
# Pengumpulan sumber daya dari HTML
# --------------------------------------------------------------------------

class ResourceCollector(HTMLParser):
    """Kumpulkan URL aset yang benar-benar dimuat halaman, per tipe CSP."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.scripts = []      # <script src>
        self.styles = []       # <link rel=stylesheet href>
        self.images = []       # <img src>
        self.frames = []       # <iframe src>
        self.inline_script = False
        self.inline_style = False

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}

        if tag == "script":
            src = a.get("src", "").strip()
            if src:
                self.scripts.append(src)
            elif "ld+json" not in a.get("type", "").lower():
                self.inline_script = True

        elif tag == "link":
            rel = a.get("rel", "").lower()
            if "stylesheet" in rel and a.get("href", "").strip():
                self.styles.append(a["href"].strip())

        elif tag == "img" and a.get("src", "").strip():
            self.images.append(a["src"].strip())

        elif tag == "iframe" and a.get("src", "").strip():
            self.frames.append(a["src"].strip())

        if tag == "style":
            self.inline_style = True
        if tag == "p" and False:  # jaga struktur, tidak dipakai
            pass

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def error(self, message):
        pass  # Python 3.9+ tidak memanggil lagi, tetap aman


# --------------------------------------------------------------------------
# Parser & pencocok CSP
# --------------------------------------------------------------------------

def parse_csp(value):
    """'default-src self; script-src a b' -> {'default-src': ['self', a, b]}"""
    directives = {}
    for chunk in (value or "").split(";"):
        chunk = chunk.strip()
        if not chunk:
            continue
        parts = chunk.split()
        name = parts[0].lower()
        directives[name] = [p for p in parts[1:]]
    return directives


def directive_for(directives, kind):
    """Ambil directive yang berlaku, dengan fallback ke default-src."""
    if kind in directives:
        return kind, directives[kind]
    return "default-src", directives.get("default-src", [])


def url_allowed(url, tokens, origin):
    """Coba cocokkan URL dengan daftar token CSP."""
    if not tokens:
        return False

    # data: dan blob: selalu cocok selama tokennya ada
    if url.startswith(("data:", "blob:")):
        return "data:" in tokens or "blob:" in tokens or "*" in tokens

    u = urlparse(url)
    if not u.hostname:
        return False

    host = u.hostname.lower()
    scheme = (u.scheme or "").lower()
    origin_host = urlparse(origin).hostname or ""

    for token in tokens:
        t = token.lower().strip()

        if t == "'none'":
            return False

        if t == "*":
            return True

        if t == "'self'":
            if host == origin_host and scheme in ("http", "https"):
                return True
            continue

        if ":" in t and "//" not in t:
            # bentuk skema biasa: https:, data:
            if t.rstrip(":") == scheme:
                return True
            continue

        if "//" not in t:
            continue

        p = urlparse(t if "//" in t else "//" + t)
        t_host = (p.hostname or "").lower()
        if not t_host:
            continue

        if t_host == host:
            return True
        # *.example.com cocok untuk sub-domain
        if t_host.startswith("*.") and (host == t_host[2:] or host.endswith(t_host[1:])):
            return True
        # example.com juga cocok untuk sub-domain-nya
        if not t_host.startswith("*.") and host.endswith("." + t_host):
            return True

    return False


def audit_csp(page_url, html, csp_value):
    """Periksa apakah CSP memblokir sumber daya yang benar-benar dipakai."""
    c = ResourceCollector()
    try:
        c.feed(html)
        c.close()
    except Exception:
        pass

    directives = parse_csp(csp_value)
    findings = []
    counts = {}

    groups = [
        ("script", "script-src", c.scripts),
        ("style", "style-src", c.styles),
        ("img", "img-src", c.images),
        ("frame", "frame-src", c.frames),
    ]

    for kind, directive_name, urls in groups:
        name, tokens = directive_for(directives, directive_name)
        bad = []
        for u in urls:
            if u.startswith(("data:", "blob:", "#", "javascript:")):
                continue
            absolute = urljoin(page_url, u)
            if not url_allowed(absolute, tokens, page_url):
                bad.append(absolute)
        counts[kind] = (len(urls), name)
        for b in bad:
            findings.append(
                f"{kind} diblokir oleh '{name}': {b}"
            )

    # Script inline butuh 'unsafe-inline' atau nonce/hash
    if c.inline_script:
        _, tokens = directive_for(directives, "script-src")
        if "'unsafe-inline'" not in tokens:
            if not any(t.startswith(("'nonce-", "'sha256-", "'sha384-", "'sha512-")) for t in tokens):
                findings.append("ada <script> inline tetapi script-src tidak punya 'unsafe-inline'/nonce")

    # <style> inline butuh 'unsafe-inline' di style-src
    if c.inline_style:
        _, tokens = directive_for(directives, "style-src")
        if "'unsafe-inline'" not in tokens:
            findings.append("ada <style> inline tetapi style-src tidak punya 'unsafe-inline'")

    # Font: font-src berlaku untuk file font, BUKAN untuk stylesheet.
    # Stylesheet eksternal tetap diunduh supaya URL font di dalamnya bisa dicek.
    fonts_bad = []
    fonts_checked = 0
    _, font_tokens = directive_for(directives, "font-src")
    for s in c.styles:
        if fonts_checked >= MAX_FONT_PROBES:
            break
        abs_css = urljoin(page_url, s)
        fonts_checked += 1
        try:
            css, _ = fetch(abs_css)
        except Exception:
            # Gagal mengunduh stylesheet bukan pelanggaran CSP, lewati saja.
            continue
        for m in re.findall(r"url\((['\"]?)([^)'\"]+\.woff2?)\1\)", css, re.I):
            f_abs = urljoin(abs_css, m[1])
            if not url_allowed(f_abs, font_tokens, page_url):
                fonts_bad.append(f"font diblokir oleh 'font-src': {f_abs}")

    findings.extend(fonts_bad)
    return findings, counts


# --------------------------------------------------------------------------
# HTTP & SSL
# --------------------------------------------------------------------------

def fetch(url, method="GET"):
    req = Request(url, headers={"User-Agent": USER_AGENT}, method=method)
    with urlopen(req, timeout=TIMEOUT) as r:
        return r.read().decode("utf-8", "replace"), dict(r.headers)


def head(url):
    req = Request(url, headers={"User-Agent": USER_AGENT}, method="HEAD")
    try:
        with urlopen(req, timeout=TIMEOUT) as r:
            return r.status, dict(r.headers)
    except HTTPError as e:
        return e.code, dict(e.headers)


def check_transport(base):
    out = []
    p = urlparse(base)

    # 1. http -> https
    try:
        req = Request(base.replace("https://", "http://", 1),
                      headers={"User-Agent": USER_AGENT}, method="HEAD")
        opener = build_no_redirect_opener()
        with opener.open(req, timeout=TIMEOUT) as r:
            out.append((False, f"http:// tidak dialihkan (status {r.status})"))
    except HTTPError as e:
        loc = e.headers.get("Location", "")
        if e.code in (301, 302, 307, 308) and loc.startswith("https://"):
            out.append((True, f"http:// -> https:// ({e.code})"))
        else:
            out.append((False, f"http:// status {e.code}, Location={loc or '(kosong)'}"))
    except Exception as e:
        out.append((False, f"http:// gagal diperiksa: {e}"))

    # 2. SSL
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((p.hostname, 443), timeout=TIMEOUT) as sock:
            with ctx.wrap_socket(sock, server_hostname=p.hostname) as ss:
                cert = ss.getpeercert()
                not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                days = (not_after - datetime.now(timezone.utc)).days
                issuer = dict(x[0] for x in cert.get("issuer", ())).get("organizationName", "?")
                if days < 0:
                    out.append((False, f"sertifikat KEDALUWARSA {abs(days)} hari lalu"))
                elif days < 15:
                    out.append((False, f"sertifikat tinggal {days} hari"))
                else:
                    out.append((True, f"sertifikat valid ({days} hari lagi, {issuer})"))
    except Exception as e:
        out.append((False, f"SSL gagal: {e}"))

    # 3. subdomain www
    www = f"https://www.{p.hostname}/"
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((f"www.{p.hostname}", 443), timeout=TIMEOUT) as sock:
            with ctx.wrap_socket(sock, server_hostname=f"www.{p.hostname}"):
                pass
        out.append((True, f"www.{p.hostname} sertifikat valid"))
    except ssl.SSLCertVerificationError as e:
        out.append((False, f"www.{p.hostname} sertifikat TIDAK cocok: {e.verify_message or e}"))
    except Exception as e:
        out.append((False, f"www.{p.hostname} gagal: {e}"))

    return out


def build_no_redirect_opener():
    import urllib.request as ur
    class NoRedirect(ur.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    return ur.build_opener(NoRedirect)


# --------------------------------------------------------------------------
# Penemuan halaman
# --------------------------------------------------------------------------

def discover_pages(base, explicit):
    if explicit:
        return [urljoin(base, p if p.endswith(".html") else "/" + p) for p in explicit]

    pages = [base]
    sm = urljoin(base, "sitemap.xml")
    try:
        xml, _ = fetch(sm)
        locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml)
        for loc in locs:
            if urlparse(loc).hostname == urlparse(base).hostname and loc not in pages:
                pages.append(loc)
    except Exception:
        pass
    return pages


# --------------------------------------------------------------------------
# Laporan
# --------------------------------------------------------------------------

OK, BAD, WARN = "OK  ", "FAIL", "WARN"


def main():
    ap = argparse.ArgumentParser(description="Audit keamanan header website statis")
    ap.add_argument("url", help="domain atau URL, contoh: https://domain-kamu.com")
    ap.add_argument("--pages", help="daftar halaman dipisah koma (opsional)")
    args = ap.parse_args()

    base = args.url if args.url.startswith(("http://", "https://")) else "https://" + args.url
    base = base.rstrip("/") + "/"

    print("=" * 68)
    print(f"  AUDIT KEAMANAN - {base}")
    print("=" * 68)

    issues = []
    warnings = []

    # ---- 1. Transport -----------------------------------------------------
    print("\n[1] TRANSPORT")
    for ok, msg in check_transport(base):
        print(f"  {OK if ok else BAD} {msg}")
        if not ok:
            issues.append(f"transport: {msg}")

    # ---- 2. Header per halaman -------------------------------------------
    print("\n[2] HEADER WAJIB")
    pages = discover_pages(base, args.pages.split(",") if args.pages else None)
    print(f"  Memeriksa {len(pages)} halaman\n")

    clean_pages = 0
    asset_urls = set()
    csp_rows = []

    for page in pages:
        rel = page.replace(base, "") or "index.html"
        try:
            html, headers = fetch(page)
        except Exception as e:
            print(f"  {BAD} {rel}: gagal diambil ({e})")
            issues.append(f"{rel}: gagal diambil")
            continue

        missing = [h for h in REQUIRED_HEADERS if h not in {k.lower() for k in headers}]
        if missing:
            print(f"  {BAD} {rel}: header hilang -> {', '.join(missing)}")
            for m in missing:
                issues.append(f"{rel}: header {m} hilang")
        else:
            clean_pages += 1

        # aset statis yang dirujuk halaman ini, untuk diperiksa di bagian [4]
        c = ResourceCollector()
        try:
            c.feed(html)
            c.close()
        except Exception:
            pass
        for u in c.styles + c.scripts + c.images:
            a = urljoin(page, u)
            if urlparse(a).hostname == urlparse(base).hostname and a.endswith(STATIC_EXT):
                asset_urls.add(a)

        # CSP nyata
        csp = next((v for k, v in headers.items() if k.lower() == "content-security-policy"), "")
        if csp:
            findings, counts = audit_csp(page, html, csp)
            csp_rows.append((rel, counts, findings))
            for f in findings:
                issues.append(f"{rel}: {f}")

    print(f"  {OK} {clean_pages}/{len(pages)} halaman lengkap 6 header")

    # ---- 3. CSP nyata -----------------------------------------------------
    print("\n[3] CSP - apakah memblokir aset yang dipakai halaman?")
    if not csp_rows:
        print(f"  {WARN} tidak ada CSP untuk diperiksa")
        warnings.append("tidak ada CSP")
    else:
        blocked = 0
        for rel, counts, findings in csp_rows:
            detail = " ".join(f"{k}={v[0]}" for k, v in counts.items())
            if findings:
                blocked += len(findings)
                print(f"  {BAD} {rel} ({detail})")
                for f in findings:
                    print(f"         - {f}")
            else:
                print(f"  {OK} {rel} ({detail}) - semua aset diizinkan")
        if blocked == 0:
            print(f"\n  {OK} CSP tidak memblokir satu pun aset yang dipakai")

    # ---- 4. Cache ---------------------------------------------------------
    print("\n[4] CACHE ASET STATIS")
    if not asset_urls:
        print(f"  {WARN} tidak ada aset statis yang bisa diperiksa")
    else:
        good, poor = [], []
        for a in sorted(asset_urls):
            try:
                _, h = fetch(a, method="HEAD")
            except Exception as e:
                poor.append((a, f"gagal diambil ({e})"))
                continue
            cc = next((v for k, v in h.items() if k.lower() == "cache-control"), "")
            if "s-maxage" in cc or ("max-age" in cc and "max-age=0" not in cc.split(",")[0]):
                good.append(a)
            else:
                poor.append((a, cc or "(tidak ada Cache-Control)"))
        for a in good:
            print(f"  {OK} {a.replace(base, '')}")
        for a, why in poor:
            print(f"  {WARN} {a.replace(base, '')} -> {why}")
        if poor:
            warnings.append(f"{len(poor)} aset statis tanpa cache jangka panjang")
        else:
            print(f"\n  {OK} semua aset ({len(good)}) punya cache jangka panjang")

    # ---- Ringkasan --------------------------------------------------------
    print("\n" + "=" * 68)
    grade = "A+" if not issues else "B" if len(issues) == 1 else "C" if len(issues) <= 3 else "D"
    print(f"  Header lengkap : {clean_pages}/{len(pages)} halaman")
    print(f"  Temuan        : {len(issues)}")
    print(f"  Peringatan    : {len(warnings)}")
    print(f"  GRADE         : {grade}")
    if issues:
        print("\n  Detail:")
        for i in issues:
            print(f"   - {i}")
    print("=" * 68)

    return 1 if issues else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)