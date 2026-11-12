"""Source-contract checks only. Run the core tests and device matrix separately."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[3]
base = root / 'modules/mpv-player/android/src/main/java/expo/modules/mpvplayer'
overlay = (base / 'danmaku/DanmakuOverlay.kt').read_text()
session = (base / 'nativeplayer/NativePlayerSession.kt').read_text()
vm = (base / 'nativeplayer/PlayerViewModel.kt').read_text()
menus = (base / 'nativeplayer/ui/tv/TvMenus.kt').read_text()
exo = (base / 'nativeplayer/engine/ExoPlayerEngine.kt').read_text()
remote = (base / 'nativeplayer/TvRemoteKeyHandler.kt').read_text()
assert 'if (DeviceKind.isTelevision(context)) config = null' not in overlay
assert 'var showNativeControls = !DeviceKind.isTelevision(context)' in overlay
assert 'showNativeControls = !isTv' in session
assert 'if (!isTv && engine is' not in session
for method in ['DirectPlay', 'DirectStream']:
    assert f'config.stream.playMethod == "{method}"' in session
assert 'is ExoPlayerEngine -> activeEngine.danmakuTime()' in session
clock = exo.split('fun danmakuTime(): Double?', 1)[1].split('override var delegate', 1)[0]
assert 'Looper.myLooper() != Looper.getMainLooper()' in clock
assert 'p.playbackState != Player.STATE_READY' in clock
assert 'p.currentPosition / 1000.0' in clock
assert 'cachedPositionSec' not in clock
assert 'p.playerError != null' in clock
assert 'p.currentMediaItem?.localConfiguration?.uri?.toString() != currentUrl' in clock
prefs = overlay.split('fun preferences()', 1)[1].split('fun displayLabel', 1)[0]
keys = set(re.findall(r'"([A-Za-z]+)"', prefs))
assert keys == {'enabled', 'fontScale', 'opacity', 'maxLines', 'durationSeconds', 'offsetSeconds'}
assert 'if (key !in preferences().keys) return' in overlay
assert 'emit("onDanmakuSettingsChange", settings)' in session
assert 'viewModel.danmakuPreferences = settings' in session
assert 'if (viewModel.danmakuAvailable)' in menus
assert 'TvMenuScreen.DANMAKU -> DanmakuMenu(viewModel)' in menus
assert 'TvMenuScreen.DANMAKU_VALUE -> DanmakuValueMenu(viewModel)' in menus
for key in keys - {'enabled'}:
    assert f'DanmakuField("{key}"' in menus
assert 'rememberLazyListState(initialFirstVisibleItemIndex = initialIndex)' in menus
assert 'viewModel.onDanmakuRetry?.invoke()' in menus
assert 'viewModel.danmakuStatus' in menus
assert 'viewModel.tvMenuRoute.isNotEmpty()' in remote and 'viewModel.popTvMenu()' in remote
assert 'tvMenuRoute.isEmpty()' in vm  # menus inhibit auto-hide
assert session.count('viewModel.resetTvDanmakuMenu()') >= 4
assert 'fun resetTvDanmakuMenu()' in vm
assert 'danmakuField = "fontScale"' in vm
assert 'viewModel.danmakuStatus = danmakuOverlay?.displayLabel(status).orEmpty()' in session
assert 'if (viewModel.danmakuPreferences["enabled"] == true)' in menus
print('PASS: Android TV source contracts (not Compose/runtime tests)')
