#!/bin/bash
# Build a notarization-ready, Developer ID signed universal DMG.
#
# Why this script exists: `tauri build` signs the app, but the Go helper
# binaries bundled inside mole-dist (analyze-go, status-go) are NOT signed by
# Tauri. Apple notarization rejects any unsigned Mach-O in the bundle, so we
# sign them (hardened runtime + secure timestamp) and re-seal the app before
# packaging the DMG. Run this, then ./scripts/publish-release.sh to notarize.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ID="${SIGN_IDENTITY:-Developer ID Application: Zhili Liang (2NL27AJX3L)}"
BUNDLE="$ROOT_DIR/src-tauri/target/universal-apple-darwin/release/bundle"
APP="$BUNDLE/macos/MoleUI.app"
DMG="$BUNDLE/dmg/MoleUI_2.1.0_universal.dmg"

echo "==> Building universal app (Intel + Apple Silicon)…"
( cd "$ROOT_DIR" && npx tauri build --target universal-apple-darwin )

echo "==> Signing bundled Mach-O helpers inside mole-dist (hardened runtime)…"
find "$APP/Contents/Resources/mole-dist" -type f -perm +111 | while read -r f; do
  if file "$f" | grep -q "Mach-O"; then
    codesign --force --options runtime --timestamp --sign "$ID" "$f"
  fi
done

echo "==> Re-sealing the app…"
codesign --force --options runtime --timestamp --sign "$ID" "$APP"
codesign --verify --deep --strict "$APP"

echo "==> Packaging LZMA-compressed DMG…"
STAGE="$(mktemp -d)/MoleUI"
mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/MoleUI.app"
ln -s /Applications "$STAGE/Applications"
rm -f "$DMG"
hdiutil create -volname "MoleUI" -srcfolder "$STAGE" -ov -format ULMO "$DMG"
codesign --force --timestamp --sign "$ID" "$DMG"

echo "✓ Built and signed: $DMG"
echo "  $(du -h "$DMG" | cut -f1) — next: ./scripts/publish-release.sh"
