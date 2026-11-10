# SDK 57 expo-image URL logging

The mobile fork backports the security fix from Streamyfin commit
[`df7bdf9cc57c824eba525961295cc0e65fb46c7d`](https://github.com/streamyfin/streamyfin/commit/df7bdf9cc57c824eba525961295cc0e65fb46c7d).

Upstream found that the SDK 57 prebuilt expo-image AAR has
`BuildConfig.ALLOW_GLIDE_LOGS` enabled. Glide can log complete image URLs,
including Jellyfin trickplay query tokens, even in release builds.

`package.json` sets `expo.autolinking.android.buildFromSource` to include
`expo-image`. This compiles its source with the default logging flag disabled.
Setting a Gradle property cannot change a flag already compiled into a prebuilt
AAR. Do not remove the override without checking the actual replacement binary.

The same backport redacts credentials from app-controlled subtitle, download and
stream URL logs. External stream URLs are not logged because credentials may be
in their userinfo or path. This is a targeted source fix, not a full log audit or
evidence that an APK has been tested. Final Android verification must inspect the
compiled logging flag and actual logcat output using synthetic credentials.
