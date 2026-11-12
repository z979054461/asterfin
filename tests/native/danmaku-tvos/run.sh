#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
python3 tests/native/danmaku-tvos/check-source.py
if ! command -v swiftc >/dev/null; then
  echo "SKIP: swiftc is not installed. No Swift compilation or runtime tests ran."
  exit 77
fi
build_dir="$(mktemp -d)"
trap 'rm -rf "$build_dir"' EXIT
swiftc -swift-version 5 modules/mpv-player/ios/Danmaku/DanmakuCore.swift modules/mpv-player/ios/Danmaku/TVDanmakuAdjustment.swift tests/native/danmaku-tvos/main.swift -o "$build_dir/tvos-danmaku-tests"
"$build_dir/tvos-danmaku-tests"
