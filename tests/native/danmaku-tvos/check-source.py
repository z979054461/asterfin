"""Structural wiring regression checks, not a substitute for tvOS SDK/device QA."""
from pathlib import Path
root = Path(__file__).resolve().parents[3] / 'modules/mpv-player/ios'

def tv_source(path):
    output, active, stack = [], True, []
    for line in (root / path).read_text().splitlines():
        stripped = line.strip()
        if stripped.startswith('#if '):
            expression = stripped[4:]
            enabled = expression != 'os(iOS)'
            stack.append((active, enabled))
            active = active and enabled
        elif stripped == '#else':
            parent, enabled = stack[-1]
            active = parent and not enabled
        elif stripped == '#endif':
            active = stack.pop()[0]
        elif active:
            output.append(line)
    return '\n'.join(output)

overlay = tv_source('Danmaku/DanmakuOverlay.swift')
assert 'final class DanmakuOverlay' in overlay
assert 'UISwitch' not in overlay and 'UIStepper' not in overlay
assert 'CADisplayLink' in overlay and 'DanmakuDownload()' in overlay
engine = tv_source('PlayerEngine.swift')
for lifecycle in ['reloadForMedia()', 'suspendForReuse()', 'stop()', 'danmakuMediaTime()']:
    assert lifecycle in engine, lifecycle
view = tv_source('MpvPlayerView.swift')
for wiring in ['addSubview(engine.danmakuOverlay)', 'danmakuOverlay.frame', 'danmakuOverlay.configure(json: json)']:
    assert wiring in view, wiring
session = tv_source('NativePlayer/NativePlayerSession.swift')
assert 'emit("onDanmakuSettingsChange", settings)' in session
vc = tv_source('NativePlayer/NativePlayerViewController.swift')
for wiring in ['zone: .danmakuSettings', 'viewModel.$showDanmakuSettings', 'viewModel.closeDanmakuSettings()', 'addSubview(engine.danmakuOverlay)', 'danmakuOverlay.frame']:
    assert wiring in vc, wiring
panel = tv_source('NativePlayer/Views/TV/TVDanmakuSettingsLayerView.swift')
for wiring in ['.onExitCommand', '.tvFocusZone(.danmakuSettings', 'next.enabled.toggle()', 'TVDanmakuAdjustment.allCases', 'overlay.retryDownload()']:
    assert wiring in panel, wiring
print('PASS: tvOS overlay, lifecycle, persistence, remote focus and Back wiring (source checks only)')
