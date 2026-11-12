# Android TV danmaku validation

`python tests/native/danmaku-tv-android/check.py` guards TV wiring, six preferences,
remote routes, safe state, and Media3 clock selection. These are source checks,
not proof of runtime rendering or Compose focus.

Also run `bash tests/native/danmaku-android/run.sh` and
`tests/native/danmaku-android/compile-overlay.sh` with its documented compiler/API variables.

## Capability

Native TV chrome supports MPV and Media3/ExoPlayer for DirectPlay and DirectStream.
Media3 is sampled on the main thread from `Player.currentPosition`, not its
one-second reporting cache. Paused playback naturally freezes. Buffering, idle,
ended, and error states hide cues. Media3 seek masking immediately changes the
sample to the requested position. The active media URI must match the loaded
configuration before its clock is accepted. Transcodes and unknown methods are excluded
because their timeline origin is not guaranteed to match source timestamps.
The embedded React MPV surface renders TV comments without Android buttons;
React owns its controls. Embedded React Exo is outside this module's support.

## Device matrix still required

- MPV and Exo: start/resume a DirectPlay and DirectStream item, pause/play,
  change speed, seek forward/back repeatedly, and stall/recover the network.
- D-pad: open More → danmaku; toggle and adjust every setting; offset opens at
  the current value and scrolls through -30 to +30 seconds in 0.5-second steps.
- Back: value list → danmaku → More → player, with no accidental seek or exit.
  Reopen repeatedly and confirm focus remains visible; controls must not auto-hide.
- Confirm Retry is hidden while disabled and the disabled status remains visible.
- Retry errors, disable while loading, navigate to the next episode, switch to a
  transcode, background/foreground, PiP, and dismiss/reopen. No stale comments,
  authentication leakage, duplicate buttons, or settings dialog should remain.
  Background, PiP entry and every stream replacement must close danmaku menus
  and reset the selected field, including when replacement awaits a surface.
- Verify settings bridge persistence when reopening playback and localization.

No device or full Compose/Media3 integration build is claimed by these checks.
