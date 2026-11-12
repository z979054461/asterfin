# Android phone and TV danmaku implementation

## Scope and integration

`MPVLayerRenderer` supports phone/tablet and TV. Native Android TV fullscreen supports MPV and ExoPlayer for DirectPlay/DirectStream; ExoPlayer is sampled on the main thread at the current media position, never the one-second bridge cache. Mobile ExoPlayer remains outside this overlay path. Live/offline/transcoded and unknown playback methods are rejected. Native TV uses the existing Compose More menu and Back stack for settings; Android touch buttons are hidden on TV. See [TV-PARITY.md](TV-PARITY.md) for validation limits.

- Ordinary `MpvPlayerView`: `danmakuConfigJson` changes only the overlay. `onDanmakuStatus` emits `{status,count}` with `loading`, `empty`, `unavailable`, `auth`, `error`, `ready`, or `disabled`. Native buttons are hidden because React controls own toggle/status/retry and the in-player settings panel. Appearance-only updates retain downloaded comments; changing optional `retryKey` requests a fresh load.
- Native fullscreen `PlayerPresentConfigRecord.danmaku`: optional dictionary matching the shared TS contract. Toggle/status/retry/settings are native Android controls above the mobile gesture chrome. The drawing sibling stays below chrome and separate from video/subtitles. The controls strip follows Compose chrome visibility without hiding the drawing. Temporary view reattachment restarts cancelled loading.

- The settings dialog applies preferences immediately and emits only the six appearance fields through `onDanmakuSettingsChange`; the shared settings store persists them. Transport URLs and credentials are never included in that event. Rotation, PiP, background, media replacement and teardown dismiss the dialog.
- Clock reads volatile actual `time-pos` samples before the existing one-second JS throttling. There is no wall-time animation extrapolation: pause/buffering leave comments frozen at the last sample. Load/seek/end/stop clear validity; load allows the next real sample; restart explicitly reads raw mpv time-pos on its event thread so paused seeks work even without a later property event. A clock epoch rejects a concurrent seek/load/stop. Load/seek requests additionally close a pending-operation gate before setup, mark issued only immediately before the actual mpv command, and require a matching START_FILE/SEEK boundary plus a valid raw restart sample with mpv seeking=false. FILE_LOADED alone cannot reopen a pending request. The prior file’s END during load setup cannot erase the newer pending load. Playback rate is inherently reflected in media-clock movement.
- PiP/background hides drawing and controls and cancels loading. Foreground reloads. Dismiss/detach cancels and generation-fences posted results. Settings never call a video load. Ordinary same-view destroy retains the last accepted configuration separately, while cancelling/hiding the overlay; the next actual source load invalidates its clock and fetch generation before restoring that configuration. Final cleanup discards it. Native fullscreen source loads likewise invalidate prior fetches even when their JSON is unchanged.

## Safety and resource bounds

The Java core validates server scheme/host, rejects embedded credentials/query/fragment, validates item IDs, preserves the supplied reverse-proxy path and requests `/api/danmu/{itemId}/raw`. Header values reject CR/LF; transport-controlled headers are excluded. No redirects and no token URLs. Gzip is explicitly supported with an 8 MiB decompressed limit. There are 15-second network timeouts and an independent 15-second cancellation deadline, including parser work. Responses, comments, URLs and headers are not logged.

Strict UTF-8 decoding precedes parsing. A UTF-8 BOM is accepted and stripped; non-UTF-8 XML encoding declarations are rejected even after a BOM. Only control characters are stripped from comment text; ZWJ, ZWNJ and variation selectors are preserved for glyph shaping. DTD/entity declarations and external entity resolution are rejected, depth is capped at eight, record count at 20,000, and comment length at 300 Unicode codepoints. Only finite nonnegative timestamps, 24-bit colors and modes 1/4/5 are retained. Invalid individual numeric records are skipped, malformed XML/limits fail the overlay alone.

Measured glyph widths position rolling/fixed text. Measurement and lane planning run on a worker using a private Paint copy; configuration and geometry generations fence results after resize, retry, clear or replacement. Lane reservation is deliberately conservative: a lane is reserved for the complete configured lifetime, so a faster wide comment cannot catch its predecessor. Top and bottom fixed lanes are disjoint from rolling lanes. With fewer than three available lanes, only rolling mode is admitted. The viewport's lower 30% is never used, preserving subtitle space. Per-frame rendering uses binary search into a precomputed plan, then only its active lifetime window (at most the configured lane count).

## Validation

Run `bash tests/native/danmaku-android/run.sh` for the production Java core tests,
including synthetic loopback HTTP fixtures. The optional Kotlin/API check is
`bash tests/native/danmaku-android/compile-overlay.sh` with `KOTLINC` and
`ANDROID_JAR` pointing to compatible local tools.

Core/API tests do not execute the Android UI. Full compilation and package checks
are described in [TEST-BUILDS.md](TEST-BUILDS.md). Device acceptance remains
required for both MPV paths, playback clocks, subtitles, lifecycle transitions,
network cancellation, accessibility and performance; see [VALIDATION.md](VALIDATION.md).

Rapid overlapping libmpv load/seek events still need integration testing. The callback
API does not tag every boundary with a source command ID, so core clock tests do not
establish exhaustive real-event isolation.
