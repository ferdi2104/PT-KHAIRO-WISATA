#!/bin/sh
# Memperbarui penghitung commit di README.md secara otomatis.
# Dijalankan oleh git hook `pre-commit`.
#
# Cara kerja:
#   - Menghitung jumlah commit saat ini (git rev-list --count HEAD)
#   - Menambah 1 karena commit yang sedang dibuat akan masuk
#   - Mengganti angka setelah marker <!-- commit-count --> di README.md
#
# Kalau README tidak punya marker, script keluar diam-diam tanpa error.

set -e

README="README.md"

# Jangan sentuh README kalau tidak ada marker.
grep -q '<!-- commit-count -->' "$README" || exit 0

CURRENT=$(git rev-list --count HEAD 2>/dev/null || echo 0)
NEXT=$((CURRENT + 1))

# Garis target, dipisah dari teks lain supaya tidak ikut ter-substitute.
TMP="$README.tmp.$$"
sed "s|<!-- commit-count -->\*\*[0-9][0-9]*\*\*|<!-- commit-count -->**$NEXT**|" "$README" > "$TMP"

# Hanya pindahkan kalau benar-benar ada perubahan.
if cmp -s "$README" "$TMP"; then
  rm -f "$TMP"
  exit 0
fi

mv "$TMP" "$README"
echo "[commit-count] README.md diperbarui -> $NEXT"