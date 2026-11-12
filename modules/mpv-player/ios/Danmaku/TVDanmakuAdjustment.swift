import Foundation

/// Remote-friendly equivalents of mobile's steppers. Kept free of UIKit so
/// bounds and repeated remote presses can be verified without an Apple SDK.
enum TVDanmakuAdjustment: String, CaseIterable {
    case fontScale, opacity, maxLines, durationSeconds, offsetSeconds

    private var limits: (minimum: Double, maximum: Double, step: Double) {
        switch self {
        case .fontScale: return (0.7, 1.5, 0.1)
        case .opacity: return (0.3, 1, 0.05)
        case .maxLines: return (1, 8, 1)
        case .durationSeconds: return (4, 12, 1)
        case .offsetSeconds: return (-30, 30, 0.5)
        }
    }

    func value(_ config: DanmakuConfig) -> Double {
        switch self {
        case .fontScale: return config.fontScale
        case .opacity: return config.opacity
        case .maxLines: return Double(config.maxLines)
        case .durationSeconds: return config.durationSeconds
        case .offsetSeconds: return config.offsetSeconds
        }
    }

    func adjust(_ config: DanmakuConfig, direction: Int) -> DanmakuConfig {
        var next = config
        let bounds = limits
        let step = direction < 0 ? -bounds.step : direction > 0 ? bounds.step : 0
        let number = min(bounds.maximum, max(bounds.minimum, ((value(config) + step) * 100).rounded() / 100))
        switch self {
        case .fontScale: next.fontScale = number
        case .opacity: next.opacity = number
        case .maxLines: next.maxLines = Int(number)
        case .durationSeconds: next.durationSeconds = number
        case .offsetSeconds: next.offsetSeconds = number
        }
        return next
    }
}
