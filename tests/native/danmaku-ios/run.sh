#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
if ! command -v swiftc >/dev/null; then
  echo "SKIP: swiftc is not installed. No Swift compilation or native tests ran."
  exit 77
fi
build_dir="$(mktemp -d)"
trap 'rm -rf "$build_dir"' EXIT
swiftc -swift-version 5 modules/mpv-player/ios/Danmaku/DanmakuCore.swift tests/native/danmaku-ios/main.swift -o "$build_dir/danmaku-core-tests"
"$build_dir/danmaku-core-tests"
