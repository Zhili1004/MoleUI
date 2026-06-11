#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/bin" "$TMP_DIR/target"
cat > "$TMP_DIR/bin/rm" <<'SH'
#!/bin/bash
sleep 1
exit 0
SH
chmod +x "$TMP_DIR/bin/rm"

PATH="$TMP_DIR/bin:$PATH" \
MOLE_TIMEOUT_REMOVE_SEC=0.2 \
MO_TIMEOUT_BIN="" \
MO_TIMEOUT_PERL_BIN="" \
bash -c '
  set -euo pipefail
  source "$1/src-tauri/resources/mole-dist/lib/core/file_ops.sh"
  start=$(perl -MTime::HiRes=time -e "print time")
  rc=0
  safe_remove "$2" true || rc=$?
  end=$(perl -MTime::HiRes=time -e "print time")
  elapsed_ms=$(perl -e "printf q(%d), ((\$ARGV[1] - \$ARGV[0]) * 1000)" "$start" "$end")
  if [[ "$rc" -ne 124 ]]; then
    exit 1
  fi
  if [[ "${MOLE_REMOVE_TIMEOUT_COUNT:-0}" -ne 1 ]]; then
    exit 1
  fi
  if [[ "$elapsed_ms" -ge 900 ]]; then
    exit 1
  fi
' _ "$ROOT_DIR" "$TMP_DIR/target"
