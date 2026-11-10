# iOS mobile danmaku implementation and verification

Local development only. No user server/device/account was accessed. No iOS build, signing, installation or distribution has been performed.

## Implementation

- `DanmakuCore.swift` uses Foundation only. Endpoint stays on configured Jellyfin origin and proxy prefix, with strict item-ID validation and no credential/query/fragment base URLs. X-Emby-Token and explicit scoped proxy headers (including Cookie) are sent as headers, never logged. Ambient cookie storage remains disabled. Ephemeral URLSession disables shared cookies, credentials and cache; all redirects are rejected. HTTP authorization, unavailable, parse and network failures affect the overlay only.
- Download is streamed on a serial delegate queue, capped at 8 MiB of delivered/decompressed bytes, with request/resource timeouts and a 15-second cancellation deadline. Parsing is off-main, strict UTF-8 (including declaration after BOM normalization, with normalized UTF-8 bytes passed to XMLParser), rejects DTD/ENTITY, external entities, nested comment content, depth >8, >20,000 comment elements and text >300 Unicode scalars. Invalid record metadata/unsupported modes are skipped. Malformed whole XML fails closed.
- CoreText measures and builds an immutable plan off-main. Top, rolling and bottom modes have disjoint lanes in the upper 70% of the view. Each lane reserves an entire comment lifetime: deliberately sparse, collision-safe even at changing speed. Very wide comments are dropped rather than truncated or overflowing. With fewer than three available lanes, fixed modes are dropped. Binary search bounds per-frame work to currently active comments. Font scale, opacity, density, duration and offset come from JS settings.
- Both MpvPlayerView and NativePlayerViewController use the same overlay. Native full-screen has accessible toggle/status/retry controls that follow chrome visibility. The ordinary React path supplies its own controls and receives `onDanmakuStatus`; `retryKey` config changes trigger a new request. Overlay hit testing passes through outside its buttons.
- Renderer maintains an independent thread-safe media-time snapshot from raw mpv time-pos events and an actual time-pos sample on playback restart. Load/seek/end invalidate it; a lock-protected epoch fences property read/commit races, and a command/boundary gate blocks restarts until the requested load generation or seek boundary arrives; no wall-clock extrapolation or JS progress timing is used. Existing 1 Hz bridge throttling remains. Since no time is extrapolated, pause and buffering do not advance comments.
- Every configuration/source reload, disable, detach and teardown cancels download and generation-fences late download/layout completions. Detach also invalidates CADisplayLink. Temporary engine destroy suspends the overlay while retaining its latest accepted configuration for the next actual load; final shutdown discards it. Background and PiP suppress drawing and controls. PiP intentionally contains no danmaku. TV hosts do not instantiate this overlay.

## Verification performed here

- `git diff --check -- modules/mpv-player/ios tests/native/danmaku-ios`: passed.
- `python tests/native/danmaku-ios/check-lifecycle-source.py`: passed eleven static source guards for mounted reuse, network/layout generations and clock fencing. This does not execute Swift.
- `tests/native/danmaku-ios/run.sh`: **SKIPPED (77)** because `swiftc` is not installed. This is not a native test pass.
- No Xcode/UIKit/CoreText/Expo/MPVKit compile or simulator/device check is possible on this Linux host. Swift code remains uncompiled and needs a native integration review before any build is called usable.

## Reproducible next checks

1. On a Swift host, run `tests/native/danmaku-ios/run.sh`. It compiles the actual Foundation parser/URL code with synthetic fixtures; it does not substitute a Python implementation. Verify valid Unicode/escaped text/mode sorting, empty XML, malformed/DTD/entity/nesting/depth/size/count/text/UTF-8 limits, invalid timestamps/colors, URL prefix, unsafe bases and item IDs.
2. Run the repository's documented Bun iOS prebuild/build steps on a Mac with the required Xcode/MPVKit toolchain. Resolve any Swift/Expo bridge integration errors before further claims.
3. Against a disposable test server with synthetic XML, test 200/empty/401/403/404/500, delayed chunks, timeout, gzip expansion beyond cap, redirects to another origin (confirm no credentials reach it), malformed XML, and disconnects. Do not use real secrets in fixtures/logs.
4. Test native full-screen and ordinary MPV on iPhone and iPad: resume, pause, buffer, seek forward/backward, 0.5×/1×/2×, rapid episode/account/server switches, disable during download, repeated retry, rotation, safe areas, HDR, video zoom, controls, subtitle coexistence, background/foreground and PiP return. Verify no old comments reappear and no repeated requests remain after dismiss.
5. Confirm VoiceOver labels, target sizes and long translated status strings on device, and profile animation time/memory/power with 20,000 comments. Check TV still builds and remains unchanged.

## Known MVP tradeoffs

Lane scheduling is conservative, not a high-density collision predictor. The overlay is sized to the player bounds rather than the letterboxed video rectangle. In the presented native player the drawing stays below SwiftUI chrome; only its small controls are reparented above the gesture surface. Verify visual interaction with menus and sheets. Transport is covered by design review and synthetic parser tests only until the integration checks above are run; no endpoint or entitlement has been inferred to work on the user's server.

Rapid overlapping libmpv load/seek event ordering still requires native integration testing: the standalone state-machine cases and source guards do not prove exhaustive real-event correctness. Seek boundaries have no per-command libmpv identifier; a restart additionally checks the actual mpv seeking flag before publishing its epoch-fenced sample.
