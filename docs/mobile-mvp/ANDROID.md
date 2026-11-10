# Android mobile danmaku implementation

## Scope and integration

Only `MPVLayerRenderer` on phones/tablets is supported. `DeviceKind` rejects TV configuration natively as well as the JS gate. Native fullscreen ExoPlayer does not instantiate the layer. Transcoded native fullscreen streams drop their danmaku configuration. JS must also gate live/offline/transcoded normal-view playback.

- Ordinary `MpvPlayerView`: `danmakuConfigJson` changes only the overlay. `onDanmakuStatus` emits `{status,count}` with `loading`, `empty`, `unavailable`, `auth`, `error`, `ready`, or `disabled`. Native buttons are hidden because the React controls own toggle/status/retry. Changing optional `retryKey` in JSON requests a fresh load.
- Native fullscreen `PlayerPresentConfigRecord.danmaku`: optional dictionary matching the shared TS contract. Toggle/status/retry are native Android controls above the mobile gesture chrome. The drawing sibling stays below chrome and separate from video/subtitles. The controls strip follows Compose chrome visibility without hiding the drawing. Temporary view reattachment restarts cancelled loading.
- Clock reads volatile actual `time-pos` samples before the existing one-second JS throttling. There is no wall-time animation extrapolation: pause/buffering leave comments frozen at the last sample. Load/seek/end/stop clear validity; load allows the next real sample; restart explicitly reads raw mpv time-pos on its event thread so paused seeks work even without a later property event. A clock epoch rejects a concurrent seek/load/stop. Load/seek requests additionally close a pending-operation gate before setup, mark issued only immediately before the actual mpv command, and require a matching START_FILE/SEEK boundary plus a valid raw restart sample with mpv seeking=false. FILE_LOADED alone cannot reopen a pending request. The prior file’s END during load setup cannot erase the newer pending load. Playback rate is inherently reflected in media-clock movement.
- PiP/background hides drawing and controls and cancels loading. Foreground reloads. Dismiss/detach cancels and generation-fences posted results. Settings never call a video load. Ordinary same-view destroy retains the last accepted configuration separately, while cancelling/hiding the overlay; the next actual source load invalidates its clock and fetch generation before restoring that configuration. Final cleanup discards it. Native fullscreen source loads likewise invalidate prior fetches even when their JSON is unchanged.

## Safety and resource bounds

The Java core validates server scheme/host, rejects embedded credentials/query/fragment, validates item IDs, preserves the supplied reverse-proxy path and requests `/api/danmu/{itemId}/raw`. Header values reject CR/LF; transport-controlled headers are excluded. No redirects and no token URLs. Gzip is explicitly supported with an 8 MiB decompressed limit. There are 15-second network timeouts and an independent 15-second cancellation deadline, including parser work. Responses, comments, URLs and headers are not logged.

Strict UTF-8 decoding precedes parsing. A UTF-8 BOM is accepted and stripped; non-UTF-8 XML encoding declarations are rejected even after a BOM. Only control characters are stripped from comment text; ZWJ, ZWNJ and variation selectors are preserved for glyph shaping. DTD/entity declarations and external entity resolution are rejected, depth is capped at eight, record count at 20,000, and comment length at 300 Unicode codepoints. Only finite nonnegative timestamps, 24-bit colors and modes 1/4/5 are retained. Invalid individual numeric records are skipped, malformed XML/limits fail the overlay alone.

Measured glyph widths position rolling/fixed text. Measurement and lane planning run on a worker using a private Paint copy; configuration and geometry generations fence results after resize, retry, clear or replacement. Lane reservation is deliberately conservative: a lane is reserved for the complete configured lifetime, so a faster wide comment cannot catch its predecessor. Top and bottom fixed lanes are disjoint from rolling lanes. With fewer than three available lanes, only rolling mode is admitted. The viewport's lower 30% is never used, preserving subtitle space. Per-frame rendering uses binary search into a precomputed plan, then only its active lifetime window (at most the configured lane count).

## Executed validation

Run `bash tests/native/danmaku-android/run.sh`. This compiles the actual production Java core with the installed JRE's `jdk.compiler` module and runs synthetic tests, including a loopback HTTP server. 257 assertions passed on 2026-11-09: prefix preservation, invalid endpoints, modes/sorting/Unicode/entities, malformed UTF-8/XML, depth/text/record/byte limits, measured collision reservations, authenticated headers, redirect refusal, gzip, gzip decompressed-size rejection, pre-cancellation, paused/buffering clock freeze, paused-seek restart snapshots stale-epoch rejection, pre-issue/pre-boundary/wrong-boundary restart rejection, rapid load/seek request replacement, stop/end gating, BOM/declaration encoding and emoji/ZWJ preservation.

The reduced JRE lacks `javac` executable and Java 8 `ct.sym`; the runner uses `java com.sun.tools.javac.Main -source 8 -target 8`. Its bootstrap warnings are expected. This proves Java compilation and behavior against the installed Java runtime, not Android API compatibility or Kotlin/UI compilation.

### Focused Kotlin/API compilation

The production `DanmakuOverlay.kt` and `DeviceKind.kt` also compile successfully with the official JetBrains Kotlin compiler **2.1.20**, production Java core, and Maven Central **org.robolectric:android-all:16-robolectric-13921718** (Android 16/API 36 framework). Maven metadata and the artifact POM coordinates were checked. No DeviceKind stub was needed. This checks Kotlin types and actual Android API signatures, not rendering or Android runtime execution. Only the existing Android `scaledDensity` deprecation warning was emitted by Kotlin.

Reproduce with `KOTLINC=/path/to/kotlinc ANDROID_JAR=/path/to/android-all-16-robolectric-13921718.jar bash tests/native/danmaku-android/compile-overlay.sh`. Downloads are scratch-local, not dependencies added to the project. No SDK/license installation, emulator, remote build service or user device was used.

## Required before release

No Android SDK, full Gradle project build, emulator or physical device was available. The Expo bridge, MPV renderer and fullscreen session integration remain uncompiled and unverified on Android. Do not describe this work as an installable or device-tested application.

1. Generate the mobile native project and build with the repository's Bun/Expo workflow.
2. Test both ordinary MPV and native fullscreen on a physical phone/tablet against synthetic/local XML first.
3. Verify direct-play media resume, long seeks forward/back, paused seeks, 0.5–2x, buffer stalls, and episode replacement with an intentionally delayed prior response.
4. Verify toggle/retry/settings, authentication failure/404, missing XML, malformed/oversized/gzip payloads, proxy prefix and custom proxy auth plus Jellyfin token.
5. Check rotation/font metrics/collision clipping, simultaneous subtitles, touch accessibility, PiP/background/re-entry, dismissal during fetch, and network cancellation.
6. Stress rapid repeated load/seek operations. Clock tests prove request/issue/boundary gating, synchronous epoch fencing and freeze/snapshot behavior, **not** all mpv event ordering. The callback API does not tag START_FILE/SEEK/restart events with a source command ID. Real rapid coalesced commands, loop transitions and native recovery still need device/integration validation; do not claim exhaustive stale-event isolation from the pure clock suite.
7. Confirm unchanged TV, ExoPlayer, subtitles and reporting paths. Profile frame work and battery on long/dense files before raising density; the conservative default intentionally drops overlapping comments.
