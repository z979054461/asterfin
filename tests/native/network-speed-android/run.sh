#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
javac -d "$OUT" \
  "$ROOT/modules/mpv-player/android/src/main/java/expo/modules/mpvplayer/nativeplayer/engine/NetworkReadSpeed.java" \
  "$ROOT/modules/exoplayer-player/android/src/main/java/expo/modules/exoplayerplayer/NetworkReadSpeed.java" \
  "$ROOT/tests/native/network-speed-android/NetworkReadSpeedTest.java"
java -cp "$OUT" NetworkReadSpeedTest
