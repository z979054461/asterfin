# iOS mobile danmaku implementation and verification

The iOS implementation supports mobile MPV playback. Device acceptance remains required.

## Implementation

- `DanmakuCore.swift` uses Foundation only. Endpoint stays on configured Jellyfin origin and proxy prefix, with strict item-ID validation and no credential/query/fragment base URLs. X-Emby-Token and explicit scoped proxy headers (including Cookie) are sent as headers, never logged. Ambient cookie storage remains disabled. Ephemeral URLSession disables shared cookies, credentials and cache; all redirects are rejected. HTTP authorization, unavailable, parse and network failures affect the overlay only.
- Download is streamed on a serial delegate queue, capped at 8 MiB of delivered/decompressed bytes, with request/resource timeouts and a 15-second cancellation deadline. Parsing is off-main, strict UTF-8 (including declaration after BOM normalization, with normalized UTF-8 bytes passed to XMLParser), rejects DTD/ENTITY, external entities, nested comment content, depth >8, >20,000 comment elements and text >300 Unicode scalars. Invalid record metadata/unsupported modes are skipped. Malformed whole XML fails closed.
- CoreText measures and builds an immutable plan off-main. Top, rolling and bottom modes have disjoint lanes in the upper 70% of the view. Each lane reserves an entire comment lifetime: deliberately sparse, collision-safe even at changing speed. Very wide comments are dropped rather than truncated or overflowing. With fewer than three available lanes, fixed modes are dropped. Binary search bounds per-frame work to currently active comments. Font scale, opacity, density, duration and offset come from JS settings.
- Both MpvPlayerView and NativePlayerViewController use the same overlay. Native full-screen has accessible toggle/status/retry controls that follow chrome visibility. The ordinary React path supplies its own controls and receives `onDanmakuStatus`; `retryKey` config changes trigger a new request. Overlay hit testing passes through outside its buttons.
- Renderer maintains an independent thread-safe media-time snapshot from raw mpv time-pos events and an actual time-pos sample on playback restart. Load/seek/end invalidate it; a lock-protected epoch fences property read/commit races, and a command/boundary gate blocks restarts until the requested load generation or seek boundary arrives; no wall-clock extrapolation or JS progress timing is used. Existing 1 Hz bridge throttling remains. Since no time is extrapolated, pause and buffering do not advance comments.
- Source reload, disable, detach and teardown cancel downloads and generation-fence late download/layout completions. Appearance-only configuration updates reuse downloaded comments without restarting video. Detach also invalidates CADisplayLink. Temporary engine destroy suspends the overlay while retaining its latest accepted configuration for the next actual load; final shutdown discards it. Background and PiP suppress drawing and controls. PiP intentionally contains no danmaku. TV hosts do not instantiate this overlay.
- Native fullscreen includes a scrollable settings panel. Its `onDanmakuSettingsChange` event carries only the six appearance preferences, which the shared settings store persists. The panel closes on rotation, background, PiP, media replacement and teardown; transport URLs and credentials never enter the preferences event.

## Validation

Run `bash tests/native/danmaku-ios/run.sh` on a Swift host for production core tests.
`python tests/native/danmaku-ios/check-lifecycle-source.py` checks source guards,
not runtime behavior. Full Xcode compilation and packaging are separate checks;
see [TEST-BUILDS.md](TEST-BUILDS.md).

## Reproducible next checks

1. On a Swift host, run `tests/native/danmaku-ios/run.sh`. It compiles the actual Foundation parser/URL code with synthetic fixtures; it does not substitute a Python implementation. Verify valid Unicode/escaped text/mode sorting, empty XML, malformed/DTD/entity/nesting/depth/size/count/text/UTF-8 limits, invalid timestamps/colors, URL prefix, unsafe bases and item IDs.
2. Run the repository's documented Bun iOS prebuild/build steps on a Mac with the required Xcode/MPVKit toolchain. Resolve any Swift/Expo bridge integration errors before further claims.
3. Against a disposable test server with synthetic XML, test 200/empty/401/403/404/500, delayed chunks, timeout, gzip expansion beyond cap, redirects to another origin (confirm no credentials reach it), malformed XML, and disconnects. Do not use real secrets in fixtures/logs.
4. Test native full-screen and ordinary MPV on iPhone and iPad: resume, pause, buffer, seek forward/backward, 0.5×/1×/2×, rapid episode/account/server switches, disable during download, repeated retry, rotation, safe areas, HDR, video zoom, controls, subtitle coexistence, background/foreground and PiP return. Verify no old comments reappear and no repeated requests remain after dismiss.
5. Confirm VoiceOver labels, target sizes and long translated status strings on device, and profile animation time/memory/power with 20,000 comments. Check TV still builds and remains unchanged.

## Known MVP tradeoffs

Lane scheduling is conservative, not a high-density collision predictor. The overlay is sized to the player bounds rather than the letterboxed video rectangle. In the presented native player the drawing stays below SwiftUI chrome; only its small controls are reparented above the gesture surface. Verify visual interaction with menus and sheets. Transport is covered by design review and synthetic parser tests only until the integration checks above are run; server compatibility and entitlements must be checked on the target device.

Rapid overlapping libmpv load/seek event ordering still requires native integration testing: the standalone state-machine cases and source guards do not prove exhaustive real-event correctness. Seek boundaries have no per-command libmpv identifier; a restart additionally checks the actual mpv seeking flag before publishing its epoch-fenced sample.
