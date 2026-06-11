#!/bin/bash
# Finalize the GitHub release: notarize + staple the DMG, replace the draft's
# asset with the notarized DMG, and flip the draft to a public release.
#
# Prerequisite (one time only): store your Apple notarization credentials in a
# keychain profile named "moleui" — this is the ONLY step that needs your
# Apple ID app-specific password (from https://appleid.apple.com):
#
#   xcrun notarytool store-credentials moleui \
#     --apple-id "you@example.com" --team-id 2NL27AJX3L \
#     --password "abcd-efgh-ijkl-mnop"
#
# Then just run:  ./scripts/publish-release.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAG="v2.1.0"
DMG="$ROOT_DIR/src-tauri/target/universal-apple-darwin/release/bundle/dmg/MoleUI_2.1.0_universal.dmg"

"$ROOT_DIR/scripts/notarize.sh" "$DMG"

echo "==> Uploading notarized DMG to release $TAG…"
gh release upload "$TAG" "$DMG" --clobber

echo "==> Publishing the release…"
gh release edit "$TAG" --draft=false

echo "✓ Released: $(gh release view "$TAG" --json url -q .url)"
