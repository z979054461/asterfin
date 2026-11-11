#!/usr/bin/env python3
"""Fail closed if Expo prebuild reintroduces unsupported signing capabilities."""
import plistlib
from pathlib import Path

root = Path("ios")
project = root / "Asterfin.xcodeproj/project.pbxproj"
assert "StreamyfinDownloadActivity" not in project.read_text(), "Unexpected extension"
entitlements = list(root.glob("**/*.entitlements"))
assert entitlements, "Missing entitlements output"
for path in entitlements:
    values = plistlib.loads(path.read_bytes())
    # Currently the Personal Team phone target should require no entitlements.
    assert not values, "Unexpected entitlement in Personal Team flavor"
info = plistlib.loads((root / "Asterfin/Info.plist").read_bytes())
assert info.get("NSSupportsLiveActivities") is False
assert "StreamyfinDownloadsAppGroupIdentifier" not in info
assert "remote-notification" not in info.get("UIBackgroundModes", [])
print("PASS: Personal Team app has no extension or restricted entitlements")
