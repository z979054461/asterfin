#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
java com.sun.tools.javac.Main -source 8 -target 8 -d "$out" modules/mpv-player/android/src/main/java/expo/modules/mpvplayer/danmaku/DanmakuCore.java
java com.sun.tools.javac.Main -cp "$out" -d "$out" tests/native/danmaku-android/DanmakuCoreTest.java
java -cp "$out" DanmakuCoreTest
