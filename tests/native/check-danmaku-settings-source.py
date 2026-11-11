"""Source-contract regression guards, not native UI/runtime tests.

The Android overlay is separately typechecked against Android APIs. UIKit and
full native presentation still require device/simulator validation.
"""
from pathlib import Path
import os
import re

root = Path(os.environ.get("SOURCE_ROOT", Path(__file__).resolve().parents[2]))
ios = (root / "modules/mpv-player/ios/Danmaku/DanmakuOverlay.swift").read_text()
android = (root / "modules/mpv-player/android/src/main/java/expo/modules/mpvplayer/danmaku/DanmakuOverlay.kt").read_text()
expected = {"enabled", "fontScale", "opacity", "maxLines", "durationSeconds", "offsetSeconds"}

for source, begin, end in [(ios, 'onSettingsChange?([', '])'), (android, 'onSettingsChange(mapOf(', ')))')]:
    assert begin in source, "Settings changes must emit a safe preference payload"
    payload = source.split(begin, 1)[1].split(end, 1)[0]
    # Keys only; nested number() calls repeat keys but must never add config/auth.
    keys = set(re.findall(r'"([A-Za-z]+)"', payload))
    assert keys == expected, f"Only safe settings may cross bridge: {keys}"
    assert 'label("settings")' in source or 'labels["settings"]' in source
    assert 'label("close")' in source or 'labels["close"]' in source

assert "applySettings(value, notify: false)" in ios
assert 'applySetting("enabled", decoded.optBoolean("enabled", false), notify = false)' in android
for key in ["serverUrl", "itemId", "headers", "retryKey"]:
    assert f"current.{key} == value.{key}" in ios
    transport_keys = android.split('listOf("serverUrl"', 1)[1].split(").all", 1)[0]
    if key != "serverUrl":
        assert f'"{key}"' in transport_keys
assert "config = value; resumeConfig = value" in ios
assert "sourceJson = current.toString()" in android
assert "if wasSuppressed { settingsOpen = false" in ios
assert "settingsViewport != bounds.size { settingsOpen = false" in ios
assert "if (value) dismissSettings()" in android
assert "fun clear() { dismissSettings()" in android
assert "oldw > 0 && (w != oldw || h != oldh)) dismissSettings()" in android
assert "#if os(iOS)" in ios
assert "DeviceKind.isTelevision(context)" in android
for platform, suffix in [("ios/NativePlayer", "swift"), ("android/src/main/java/expo/modules/mpvplayer/nativeplayer", "kt")]:
    folder = root / "modules/mpv-player" / platform
    module = (folder / f"NativePlayerModule.{suffix}").read_text()
    session = (folder / f"NativePlayerSession.{suffix}").read_text()
    assert '"onDanmakuSettingsChange"' in module
    assert 'emit("onDanmakuSettingsChange", settings)' in session
    assert "danmakuSettings = settings" in session
print("PASS: native settings source contracts (safe events, controls, in-place updates, lifecycle, mobile-only)")
