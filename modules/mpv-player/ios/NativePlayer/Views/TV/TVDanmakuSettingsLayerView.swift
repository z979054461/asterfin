#if os(tvOS)
import SwiftUI
import UIKit

/// A dedicated focus host, not mobile UIKit controls stretched onto a TV.
/// Transport recognizers stand down while this zone owns the remote.
@available(tvOS 26.0, *)
struct TVDanmakuSettingsLayerView: View {
    @ObservedObject var viewModel: PlayerViewModel
    @ObservedObject var overlay: DanmakuOverlay
    let focusCoordinator: TVFocusCoordinator
    @FocusState private var focusedElement: String?

    var body: some View {
        ZStack {
            if viewModel.showDanmakuSettings, let config = overlay.config {
                Color.black.opacity(0.6).ignoresSafeArea()
                VStack(spacing: 24) {
                    HStack {
                        Text(config.labels["settings"] ?? "Danmaku").font(.title3.weight(.semibold))
                        Spacer()
                        Button(config.labels["close"] ?? "Close") { viewModel.closeDanmakuSettings() }
                            .focused($focusedElement, equals: "close")
                    }
                    HStack {
                        Text(config.labels["enabled"] ?? "Enabled")
                        Spacer()
                        Button {
                            var next = config
                            next.enabled.toggle()
                            overlay.applySettings(next)
                        } label: {
                            Image(systemName: config.enabled ? "checkmark.square.fill" : "square")
                                .frame(width: 64)
                        }
                        .accessibilityLabel(config.labels["enabled"] ?? "Enabled")
                        .accessibilityValue(config.enabled ? "✓" : "−")
                        .focused($focusedElement, equals: "enabled")
                    }
                    ForEach(TVDanmakuAdjustment.allCases, id: \.self) { field in
                        HStack(spacing: 24) {
                            Text(config.labels[field.rawValue] ?? field.rawValue)
                            Spacer()
                            Button {
                                overlay.applySettings(field.adjust(config, direction: -1))
                            } label: { Image(systemName: "minus").frame(width: 64) }
                            .accessibilityLabel("− " + (config.labels[field.rawValue] ?? field.rawValue))
                            .focused($focusedElement, equals: field.rawValue + "minus")
                            Text(String(format: "%.2g", field.value(config)))
                                .monospacedDigit().frame(width: 100)
                            Button {
                                overlay.applySettings(field.adjust(config, direction: 1))
                            } label: { Image(systemName: "plus").frame(width: 64) }
                            .accessibilityLabel("+ " + (config.labels[field.rawValue] ?? field.rawValue))
                            .focused($focusedElement, equals: field.rawValue + "plus")
                        }
                    }
                    HStack {
                        Text(config.enabled ? (config.labels[overlay.state] ?? "") : "")
                            .font(.callout).foregroundStyle(.secondary)
                        Spacer()
                        if config.enabled && ["auth", "unavailable", "error", "empty"].contains(overlay.state) {
                            Button(config.labels["retry"] ?? "Retry") { overlay.retryDownload() }
                                .focused($focusedElement, equals: "retry")
                        }
                    }
                }
                .font(.callout)
                .buttonStyle(.glass)
                .padding(44)
                .frame(width: 1100)
                .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 24))
                .defaultFocus($focusedElement, "close", priority: .userInitiated)
                .focusSection()
                .tvFocusZone(.danmakuSettings, coordinator: focusCoordinator,
                             focus: $focusedElement, target: { "close" })
                .onExitCommand { viewModel.closeDanmakuSettings() }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.willResignActiveNotification)) { _ in
            viewModel.closeDanmakuSettings()
        }
        .onChange(of: overlay.config == nil) { unavailable in
            if unavailable { viewModel.closeDanmakuSettings() }
        }
    }
}
#endif
