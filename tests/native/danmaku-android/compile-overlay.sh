#!/usr/bin/env bash
# Focused production-source compilation only: does not compile Expo/mpv integration.
set -euo pipefail
: "${KOTLINC:?Set KOTLINC to the official Kotlin compiler executable}"
: "${ANDROID_JAR:?Set ANDROID_JAR to a local Android framework/API jar}"
cd "$(dirname "$0")/../../.."
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
java com.sun.tools.javac.Main -source 8 -target 8 -d "$out" modules/mpv-player/android/src/main/java/expo/modules/mpvplayer/danmaku/DanmakuCore.java
"$KOTLINC" -classpath "$ANDROID_JAR:$out" -d "$out/overlay.jar" \
  modules/mpv-player/android/src/main/java/expo/modules/mpvplayer/DeviceKind.kt \
  modules/mpv-player/android/src/main/java/expo/modules/mpvplayer/danmaku/DanmakuOverlay.kt
printf 'PASS: focused production Java core + Kotlin overlay/DeviceKind compilation (not full native integration)\n'
