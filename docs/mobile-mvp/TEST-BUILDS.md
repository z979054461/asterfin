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

### Isolated Android credential preflight

`android-signing-preflight.yml` checks the four configured repository Secrets:
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and
`ANDROID_KEY_PASSWORD`. It runs only for this repository's `mobile-dev` branch,
with no checkout, project scripts, build dependencies, cache, or artifact upload.
The existing unsigned build workflows do not receive these Secrets.

The preflight accepts a single-key PKCS12 with the `jellyfin-mobile-dev` alias,
matching store/key passwords, and a generic Jellyfin Mobile certificate subject.
Passwords are passed to Java as exact UTF-8 text without trimming, normalization,
or additional length/ASCII restrictions. Line breaks and NUL are rejected as input
errors for this interactive-keytool configuration. Keystore unlocking determines
whether the supplied password is valid; a strength recommendation is not a format gate.
Before emitting certificate information, it accepts only three built-in neutral
CN-only templates and checks issuer, alternative names, and extension types. A
non-matching certificate is marked for identity review; this does not establish
that it contains personal information and does not require changing the key.
Fixed boolean diagnostics distinguish subject-template matching, issuer matching,
supported extension types, and absence of alternative names. They never include
the field values. An unresolved identity check continues to block acceptance. A temporary
in-memory signature proof checks that the private key matches the certificate.
Only fixed pass/failure messages and the validated certificate's public SHA-256
fingerprint are logged. Passwords, encoded keystores, and certificate subjects
are never printed or uploaded. Temporary credential files are removed on normal
completion; the runner is ephemeral, not a backup location.

This is a credentials check, not a signed APK build or an installation test.
Signing and source builds must retain separate trust boundaries. Public-repository
Actions artifacts are not a private transfer channel. Do not upload unsigned or
signed test APKs without explicit authorization for that visibility, and do not
reuse an unrelated upstream README/PR build as the custom mobile client.

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
