#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
if ! command -v swiftc >/dev/null; then
  echo "SKIP: swiftc is not installed; no native Swift tests ran."
  exit 77
fi
build_dir="$(mktemp -d)"
trap 'rm -rf "$build_dir"' EXIT
swiftc -swift-version 5 modules/mpv-player/ios/NetworkSpeed.swift tests/native/network-speed-ios/main.swift -o "$build_dir/network-speed-tests"
"$build_dir/network-speed-tests"
