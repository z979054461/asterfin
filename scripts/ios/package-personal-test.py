#!/usr/bin/env python3
"""Verify and package a device app for local re-signing, never for direct install."""
import hashlib
import json
import os
import plistlib
import re
import shutil
import subprocess
import sys
from pathlib import Path

app, output = map(Path, sys.argv[1:])
assert app.name == "Asterfin.app" and app.is_dir()
assert not output.exists(), "Refusing to overwrite output"
sha = os.environ["GITHUB_SHA"]
assert re.fullmatch(r"[a-f0-9]{40}", sha)
info = plistlib.loads((app / "Info.plist").read_bytes())
assert info["CFBundleIdentifier"] == "app.bluuuue.asterfin"
assert info["CFBundleExecutable"] == "Asterfin"
assert info.get("NSSupportsLiveActivities") is False
assert not list(app.rglob("*.appex")), "Unexpected extension"
assert not list(app.rglob("embedded.mobileprovision")), "Unexpected provisioning profile"
assert not (app / "_CodeSignature").exists(), "Unexpected app signature"
assert (app / "Asterfin").stat().st_size > 0
assert (app / "main.jsbundle").stat().st_size > 0
subprocess.run(["xcrun", "lipo", str(app / "Asterfin"), "-verify_arch", "arm64"], check=True)
output.mkdir(mode=0o700)
staging = output / "staging"
(staging / "Payload").mkdir(parents=True)
shutil.copytree(app, staging / "Payload/Asterfin.app", symlinks=True)
ipa = output / "Asterfin-personal-test-unsigned.ipa"
subprocess.run(["ditto", "-c", "-k", "--keepParent", "Payload", str(ipa.resolve())], cwd=staging, check=True)
shutil.rmtree(staging)
manifest = {
    "source_commit": sha,
    "source_url": f"https://github.com/z979054461/asterfin/tree/{sha}",
    "run_id": os.environ["GITHUB_RUN_ID"],
    "run_attempt": os.environ["GITHUB_RUN_ATTEMPT"],
    "flavor": "ios-personal-team-test",
    "signed": False,
    "requires_local_resigning": True,
    "device_tested": False,
    "bundle_identifier": info["CFBundleIdentifier"],
    "minimum_os": info.get("MinimumOSVersion"),
    "ipa_sha256": hashlib.sha256(ipa.read_bytes()).hexdigest(),
    "removed_features": ["Wi-Fi SSID detection", "remote push", "download Live Activity"],
}
(output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
shutil.copy("LICENSE.txt", output / "LICENSE.txt")
shutil.copy("docs/mobile-mvp/IOS-PERSONAL-TEST.md", output / "INSTALL-AND-LICENSE.md")
shutil.copy("ios/Podfile.lock", output / "Podfile.lock")
subprocess.run(["git", "archive", "--format=tar.gz", f"--output={output.resolve()}/source.tar.gz", sha], check=True)
print("PASS: unsigned arm64 app and exact source packaged for private delivery")
