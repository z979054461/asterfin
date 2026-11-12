from pathlib import Path
root = Path(__file__).resolve().parents[3]
base = root / 'modules/mpv-player/ios'
renderer = (base / 'MPVLayerRenderer.swift').read_text()
model = (base / 'NativePlayer/PlayerViewModel.swift').read_text()
assert 'demuxer-cache-state/raw-input-rate' in renderer
assert 'demuxer-cache-idle' in renderer, 'a full cache must not retain stale throughput'
assert 'activeLoadGeneration == networkLoadGeneration' in renderer, 'same-URL reloads must bind to new source generation'
assert 'pendingLoadGenerations.isEmpty' in renderer
assert 'getStringProperty(handle: handle, name: "path") == expectedURL' in renderer, 'delayed replacements must hide the previous source rate'
assert 'info["networkBytesPerSecond"] = rate' in renderer
assert renderer.count('self.networkSampleNotBefore =') == 3, 'load and both seek paths reset stale samples'
assert 'self?.networkSource = false' in renderer
assert 'self.networkSpeedGeneration == generation' in model, 'discard results from previous source/seek'
assert 'UIApplication.shared.applicationState == .active' in model
assert 'networkSpeedTimer?.invalidate()' in model
assert 'final class NetworkSpeedModel: ObservableObject' in model
for view in ('PlayerControlsRootView.swift', 'PlayerTopBar.swift', 'TV/TVOverlayLayers.swift', 'TV/TVChromeLayerView.swift'):
    assert 'NetworkSpeedLabel(model: viewModel.networkSpeed' in (base / 'NativePlayer/Views' / view).read_text(), view
print('Apple network speed source lifecycle and four placements checked')
