import Foundation

/// Units are decimal bytes per second, not media bitrate or playback rate.
/// Unknown values stay absent; an observed zero is a valid idle read rate.
enum NetworkSpeed {
    static let sampleInterval: TimeInterval = 1

    static func isRemote(_ url: URL) -> Bool {
        ["http", "https"].contains(url.scheme?.lowercased() ?? "")
    }

    static func validated(_ bytesPerSecond: Double?) -> Double? {
        guard let value = bytesPerSecond, value.isFinite, value >= 0 else { return nil }
        return value
    }

    static func label(_ bytesPerSecond: Double?) -> String? {
        guard let value = validated(bytesPerSecond) else { return nil }
        let locale = Locale(identifier: "en_US_POSIX")
        if value >= 1_000_000 {
            return String(format: "%.1f MB/s", locale: locale, value / 1_000_000)
        }
        if value >= 1_000 {
            return String(format: "%.1f KB/s", locale: locale, value / 1_000)
        }
        return String(format: "%.0f B/s", locale: locale, value)
    }
}
