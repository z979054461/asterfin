# Test builds, not releases

The `mobile-dev` branch runs source checks, production Swift core tests, an Android
unsigned APK build, and a complete unsigned iOS app build. The build workflows
have read-only repository permissions. They do not use EAS/Apple credentials,
publish GitHub Releases, upload APK/IPA artifacts, or access a Jellyfin server.

## Android

`native-checks.yml` runs `expo prebuild --platform android --no-install`, then:

```sh
cd android
NODE_ENV=production ./gradlew :app:assembleRelease --no-daemon --max-workers=2 \
  -PreactNativeArchitectures=arm64-v8a
```

The Release variant bundles Hermes/JavaScript. Before Gradle runs, the workflow
removes the two debug-signing bindings in Expo's generated template. It fails
closed if the expected template changes. No development or release signing key
is used. The unsigned APK **cannot be installed** until signing is separately
authorized; this stage checks packaging and compilation only.

The job checks that APK signature verification fails, plus the development application ID, non-debuggable
manifest, JavaScript bundle, DEX files, and ARM64 MPV/Hermes/React Native libraries.
It prints a SHA256 in the job summary. The unsigned APK stays on the temporary runner; it is
not made available for download while runtime testing is incomplete.

Package verification is not an emulator/device pass. Still required: clean
install and launch, MPV and native fullscreen playback, subtitles/danmaku,
background/PiP, seek/speed/episode changes, and credential-redacted logs. See
[ANDROID.md](ANDROID.md) for the full test matrix. The ARM64 package does not
validate x86_64 emulator support.

## iOS

`ios-app-check.yml` builds the full iPhone/iPad app and its Live Activity extension
using CocoaPods and Xcode, with code signing disabled. It does not package an IPA
or upload the `.app`. An unsigned device `.app` cannot be installed on a normal
iPhone. Signing, provisioning, App Store/TestFlight, simulator launch, and physical
device tests remain separate unverified stages. See [IOS.md](IOS.md).

## Reporting results

Only report a stage as passed after checking the workflow for the exact commit.
A green Swift core job does not mean the iOS app built. A green Android package job
does not mean playback or danmaku works on a device. The known Expo Doctor warnings
are separate from these native build results.
