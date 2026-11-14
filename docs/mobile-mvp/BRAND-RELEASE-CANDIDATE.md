# 星幕 / Asterfin identity migration candidate

Source-only candidate based on `194cb0f37eefbb845c1ed072baa49a0b15d80e8f`.
Planned release tag: `v0.1.0-beta.2` (not created by this change).
Marketing version remains `0.1.0`; Android versionCode and Apple buildNumber are `3`.

- Android and iOS/tvOS main application ID: `app.bluuuue.asterfin`.
- URL scheme: `asterfin`; no legacy URL alias is registered.
- System-language launcher metadata: Chinese `星幕`, English/default `Asterfin`.
  Native target/executable names remain Asterfin; internal upstream class names remain unchanged.
- TV extension: `app.bluuuue.asterfin.tvtopshelf`; group: `group.app.bluuuue.asterfin.tvtopshelf`.
- Download extension: `app.bluuuue.asterfin.downloadactivity`; group: `group.app.bluuuue.asterfin.downloads`.
- TV keychain sharing and background task identifiers derive from the new base ID.

This is a new application identity, not an in-place upgrade of the old package.
Existing login state, private downloads and preferences do not migrate automatically.
Do not remove an old installation as part of installing this candidate.

Run `node scripts/check-brand-identity.mjs` before builds. If GOOGLE_SERVICES_JSON
is explicitly supplied, the check rejects a config without the new Android ID.
No Firebase app, Apple identifier, certificate, provisioning profile or signing key
is created by these source changes. The Android keystore alias is intentionally
unchanged: a key alias is not an installed application ID.

Release gates: regenerate native projects, inspect generated manifest/plist and
localized resources for both phone and TV, validate matching Apple profiles and
extension entitlements, build/test locally, inspect signed artifacts and source
provenance, then publish only verified artifacts. Existing pinned split-signing
workflows still require a separately reviewed candidate source SHA and build
number before use; changing package assertions alone does not release a build.

Mac remains a possible Designed-for-iPad destination on Apple silicon, not a
verified native macOS/Catalyst release. No Mac compatibility claim is introduced.
