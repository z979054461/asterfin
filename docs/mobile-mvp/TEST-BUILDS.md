# Test builds

Asterfin has separate source checks, native compilation, credential preflight and
encrypted test-package workflows. Test packages are not stable releases.

## Build checks

- `native-checks.yml`: Android native build and production Swift core tests.
- `ios-app-check.yml`: complete unsigned iPhone/iPad app compilation with Xcode.
- `source-checks.yml`: TypeScript, unit tests, formatting and related source checks.

An unsigned APK or IPA is not directly installable. Compilation and package
verification do not establish playback or danmaku behavior on a device.

## Android signing

`android-signing-preflight.yml` validates the signing configuration separately
from source builds. Required repository Secrets are:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The configured format is single-key PKCS12 with matching store/key passwords.
Signing uses the pinned certificate identity; do not rotate it for a branding
change. Passwords, keystore data and certificate subjects must not appear in logs.

`android-private-test.yml` separates building from signing and encrypts test
artifacts. Public Actions artifacts must not contain plaintext private test
packages or credentials. Ephemeral runners are not signing-key backups.

## iOS testing

`ios-personal-test.yml` creates an encrypted unsigned IPA with a Personal Team
compatible configuration. It does not receive Apple credentials or sign the app.
See [iOS test configuration](IOS-PERSONAL-TEST.md) for feature differences.

## Acceptance

Check the exact commit's workflow results. Core tests, complete app builds,
signing, installation and runtime validation are distinct stages. The remaining
device checks are listed in [VALIDATION.md](VALIDATION.md).
