# Asterfin branding and compatibility

Asterfin is an independent Jellyfin client derived from Streamyfin. It is not an
application published or endorsed by Jellyfin or Streamyfin.

The project name and installed app display name are **Asterfin**. The repository
is [z979054461/asterfin](https://github.com/z979054461/asterfin). Active mobile
work remains on `mobile-dev`; the upstream `develop` branch is preserved.

## Stable compatibility identity

Branding changes do not rotate credentials or change the installed application:

- Android application ID and iOS bundle ID: `org.personal.jellyfinmobile.dev`.
- Expo slug and URL scheme: `jellyfin-mobile-dev`.
- Existing Android keystore, certificate, key alias and GitHub Secret names remain
  unchanged. A new brand does not require a new signing key.
- Native extension target names, app-group/Keychain keys, storage keys and
  Streamyfin plugin protocol identifiers stay unchanged for compatibility.

The credentials-only workflow checks the immutable GitHub repository ID, plus
`mobile-dev`, so changing the repository slug cannot skip the check or allow a
separate repository with the old name. It does not build or publish an APK.

Expo generates the iOS project, scheme and app executable from the display name.
The unsigned iOS compile workflow therefore uses `Asterfin` for those paths.
Neither a source check nor an unsigned compile is an installable build or a
real-device playback test.

## Attribution and assets

Keep the Streamyfin attribution, original authors, MPL-2.0 source license and
separate native dependency license notices. The existing icons are inherited
from the development base and still need brand/asset review before a public
release. Existing translation keys and protocol names may retain `streamyfin`;
they are not claims that Asterfin is an official upstream release.

This rename does not establish trademark clearance or promise app-store
availability. Public name searches are preliminary, not a legal clearance.
