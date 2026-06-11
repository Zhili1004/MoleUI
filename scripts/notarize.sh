#!/bin/bash
# Notarize and staple the MoleUI universal DMG with Apple.
#
# Run this AFTER `npx tauri build --target universal-apple-darwin` has produced
# a Developer ID signed DMG. Notarization needs YOUR Apple credentials — this
# script never stores them; supply them via a keychain profile or env vars.
#
# One-time: create a keychain profile so you never type the password again:
#   xcrun notarytool store-credentials moleui \
#     --apple-id "you@example.com" \
#     --team-id 2NL27AJX3L \
#     --password "app-specific-password"   # from appleid.apple.com
#
# Then just run:  ./scripts/notarize.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DMG="${1:-$ROOT_DIR/src-tauri/target/universal-apple-darwin/release/bundle/dmg/MoleUI_2.1.0_universal.dmg}"
PROFILE="${NOTARY_PROFILE:-moleui}"

if [[ ! -f "$DMG" ]]; then
  echo "DMG not found: $DMG" >&2
  echo "Build it first:  npx tauri build --target universal-apple-darwin" >&2
  exit 1
fi

echo "==> Submitting $DMG for notarization (this can take a few minutes)…"
xcrun notarytool submit "$DMG" --keychain-profile "$PROFILE" --wait

echo "==> Stapling the notarization ticket…"
xcrun stapler staple "$DMG"

echo "==> Verifying…"
xcrun stapler validate "$DMG"
spctl -a -vvv -t open --context context:primary-signature "$DMG"

echo "✓ Done. $DMG is notarized and stapled — ready to distribute."
