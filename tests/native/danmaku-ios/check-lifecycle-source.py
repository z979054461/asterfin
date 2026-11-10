"""Static regression guards only. This does not compile or execute Swift."""
from pathlib import Path

root = Path(__file__).resolve().parents[3]
source = (root / "modules/mpv-player/ios/Danmaku/DanmakuOverlay.swift").read_text()
assert "startDisplayLinkIfNeeded()\n        if value?.enabled" in source, "mounted reuse must restart display link"
assert "generation += 1; planGeneration += 1; let token = generation" in source, "retry must invalidate old layout work"
assert "self.planGeneration == token" in source, "late layout must be fenced"
assert "self.generation == token" in source, "late network response must be fenced"
assert "func reloadForMedia() { suspendedForReuse = false; configure(resumeConfig) }" in source
assert "guard !suspendedForReuse else { return }" in source
assert "guard window != nil, config?.enabled == true else" in source, "nil/disabled configuration cannot run display link"
assert "displayLink?.invalidate(); displayLink = nil\n            return" in source, "disabling must stop an existing display link"
assert "UIApplication.willResignActiveNotification" in source
assert "UIApplication.didBecomeActiveNotification" in source
assert "func refreshVisibility()" in source, "PiP callbacks need an event-driven visibility refresh"
assert "DanmakuLayout.accepts(width: Double(width), viewportWidth: Double(size.width), mode: comment.mode)" in source
engine = (root / "modules/mpv-player/ios/PlayerEngine.swift").read_text()
assert "existingDanmakuOverlay?.suspendForReuse()" in engine
assert "existingDanmakuOverlay?.stop()" in engine
for callback, next_callback in [("didStartPictureInPicture: Bool", "willStopPictureInPicture: Bool"), ("didStopPictureInPicture: Bool", "restoreUserInterfaceForPictureInPictureStop")]:
    section = engine.split(callback, 1)[1].split(next_callback, 1)[0]
    assert "existingDanmakuOverlay?.refreshVisibility()" in section, "PiP transition must refresh disabled controls without a display link"
renderer = (root / "modules/mpv-player/ios/MPVLayerRenderer.swift").read_text()
assert 'let token = danmakuClock.readToken(restart: true)' in renderer
assert 'danmakuClock.commit(rawTime, token: token, restart: true)' in renderer
assert 'danmakuClock.boundary(.load(activeLoadGeneration))' in renderer
print("PASS: 19 static lifecycle/clock source assertions (not Swift execution)")
