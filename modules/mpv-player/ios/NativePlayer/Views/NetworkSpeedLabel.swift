import SwiftUI

/// Display only: never steals a TV focus target or blocks playback gestures.
struct NetworkSpeedLabel: View {
    @ObservedObject var model: NetworkSpeedModel
    var prominent = false

    var body: some View {
        if let label = NetworkSpeed.label(model.bytesPerSecond) {
            Text(label)
                .font(prominent ? .headline.monospacedDigit() : .caption.monospacedDigit())
                .foregroundStyle(.white)
                .lineLimit(1)
                .fixedSize()
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(.black.opacity(0.45), in: RoundedRectangle(cornerRadius: 6))
                .allowsHitTesting(false)
                .accessibilityLabel("Network receive speed: \(label)")
        }
    }
}
