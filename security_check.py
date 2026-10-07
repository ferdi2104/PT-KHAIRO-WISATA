import sys
from urllib.request import Request, urlopen

REQUIRED_HEADERS = {
    "content-security-policy": "Melindungi dari XSS dan injeksi script",
    "strict-transport-security": "Memaksa HTTPS",
    "x-content-type-options": "Mencegah MIME sniffing",
    "x-frame-options": "Mencegah clickjacking",
    "referrer-policy": "Membatasi kebocoran URL asal",
    "permissions-policy": "Membatasi akses fitur browser",
}


def check(url):
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    request = Request(url, headers={"User-Agent": "SecurityHeaderChecker/1.0"})
    with urlopen(request, timeout=15) as response:
        headers = {key.lower(): value for key, value in response.headers.items()}

    score = 0
    for header, reason in REQUIRED_HEADERS.items():
        if header in headers:
            score += 1
            print(f"OK      {header}: {headers[header]}")
        else:
            print(f"MISSING {header} - {reason}")

    grade = "A" if score == 6 else "B" if score >= 5 else "C" if score >= 4 else "D" if score >= 2 else "F"
    print(f"\nScore: {score}/6")
    print(f"Grade: {grade}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python security_check.py https://domain-kamu.com")
        sys.exit(1)

    check(sys.argv[1])
