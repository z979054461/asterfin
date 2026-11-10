#if os(iOS)
import UIKit
import CoreText

private struct DanmakuGlyph {
    let start: Double
    let line: CTLine
    let width: CGFloat
    let lane: Int
    let rolling: Bool
}

private final class DanmakuDisplayTarget: NSObject {
    weak var overlay: DanmakuOverlay?
    @objc func tick() { overlay?.tick() }
}

/// Does not composite into the video sample buffer: PiP and subtitles stay independent.
final class DanmakuOverlay: UIView {
    var onStatus: ((String, Int) -> Void)?
    var nativeControls = true { didSet { updateControls() } }
    var clock: (() -> Double?)?
    var suppressed: (() -> Bool)?
    var controlsVisible = true { didSet { updateControls() } }
    private var suspendedForReuse = false
    private var resumeConfig: DanmakuConfig?
    private var config: DanmakuConfig?
    private var download: DanmakuDownload?
    private var generation = 0
    private var planGeneration = 0
    private var comments: [DanmakuComment] = []
    private var glyphs: [DanmakuGlyph] = []
    private var plannedSize = CGSize.zero
    private var displayLink: CADisplayLink?
    private let displayTarget = DanmakuDisplayTarget()
    private var applicationInactive = false
    private var presentationSuppressed: Bool {
        applicationInactive || UIApplication.shared.applicationState != .active || (suppressed?() ?? false)
    }
    private var wasSuppressed = false
    private var mediaTime: Double?
    private var state = "" { didSet {
        if state != oldValue { onStatus?(state.isEmpty ? "disabled" : state, comments.count) }
    } }
    private let toggle = UIButton(type: .system)
    private let retry = UIButton(type: .system)
    private let status = UILabel()

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear; isOpaque = false; clipsToBounds = true
        displayTarget.overlay = self
        toggle.addTarget(self, action: #selector(toggleEnabled), for: .touchUpInside)
        retry.addTarget(self, action: #selector(retryDownload), for: .touchUpInside)
        for button in [toggle, retry] {
            button.tintColor = .white; button.backgroundColor = UIColor.black.withAlphaComponent(0.65)
            button.layer.cornerRadius = 8; button.titleLabel?.font = .systemFont(ofSize: 13)
            addSubview(button)
        }
        status.font = .systemFont(ofSize: 11); status.textColor = .white
        status.backgroundColor = UIColor.black.withAlphaComponent(0.65)
        status.isAccessibilityElement = true; addSubview(status)
        NotificationCenter.default.addObserver(self, selector: #selector(applicationWillResignActive), name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(applicationDidBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        updateControls()
    }
    // The drawing stays below SwiftUI chrome. Only these small controls are
    // reparented above its transparent full-screen gesture surface.
    func attachControls(to host: UIView) {
        for control in [toggle, retry, status] { host.addSubview(control) }
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
    deinit { NotificationCenter.default.removeObserver(self); displayLink?.invalidate(); download?.cancel() }

    @objc private func applicationWillResignActive() { applicationInactive = true; refreshVisibility() }
    @objc private func applicationDidBecomeActive() { applicationInactive = false; refreshVisibility() }
    // Hosts call this when PiP changes. Disabled controls need updates even without a display link.
    func refreshVisibility() {
        wasSuppressed = presentationSuppressed
        if wasSuppressed { mediaTime = nil; setNeedsDisplay() }
        updateControls()
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        displayLink?.invalidate(); displayLink = nil
        if window != nil {
            startDisplayLinkIfNeeded()
            if config?.enabled == true && download == nil && comments.isEmpty { fetch() }
        } else {
            generation += 1; planGeneration += 1; download?.cancel(); download = nil
            glyphs = []; comments = []; mediaTime = nil
        }
    }
    private func startDisplayLinkIfNeeded() {
        guard window != nil, config?.enabled == true else {
            displayLink?.invalidate(); displayLink = nil
            return
        }
        guard displayLink == nil else { return }
        let link = CADisplayLink(target: displayTarget, selector: #selector(DanmakuDisplayTarget.tick))
        link.preferredFramesPerSecond = 30
        link.add(to: .main, forMode: .common)
        displayLink = link
    }
    func configure(json: String) {
        let decoded = json.data(using: .utf8).flatMap { try? JSONDecoder().decode(DanmakuConfig.self, from: $0) }
        configure(decoded?.valid == true ? decoded : nil)
    }
    func configure(_ value: DanmakuConfig?) {
        resumeConfig = value
        guard !suspendedForReuse else { return }
        generation += 1; planGeneration += 1
        download?.cancel(); download = nil; comments = []; glyphs = []; mediaTime = nil
        config = value; state = value?.enabled == true ? "loading" : "disabled"; setNeedsDisplay(); updateControls()
        startDisplayLinkIfNeeded()
        if value?.enabled == true { fetch() }
    }
    func reloadForMedia() { suspendedForReuse = false; configure(resumeConfig) }
    func suspendForReuse() {
        let latest = resumeConfig
        stop()
        resumeConfig = latest
        suspendedForReuse = true
    }
    func stop() { suspendedForReuse = false; configure(nil); displayLink?.invalidate(); displayLink = nil }
    @objc private func toggleEnabled() {
        guard var config else { return }
        config.enabled.toggle(); configure(config)
    }
    @objc private func retryDownload() { fetch() }
    private func fetch() {
        guard let config, config.enabled else { return }
        generation += 1; planGeneration += 1; let token = generation
        download?.cancel(); comments = []; glyphs = []; setNeedsDisplay()
        state = "loading"; updateControls()
        let task = DanmakuDownload(); download = task
        task.start(config) { [weak self] result in
            DispatchQueue.main.async {
                guard let self, self.generation == token else { return }
                self.download = nil
                switch result {
                case .success(let comments):
                    self.comments = comments; self.state = comments.isEmpty ? "empty" : "ready"; self.rebuild()
                case .failure(let error):
                    switch error as? DanmakuFailure {
                    case .auth: self.state = "auth"
                    case .unavailable: self.state = "unavailable"
                    default: self.state = "error"
                    }
                }
                self.updateControls()
            }
        }
    }
    override func layoutSubviews() {
        super.layoutSubviews()
        let left = safeAreaInsets.left + 12
        let top = safeAreaInsets.top + 62
        toggle.frame = CGRect(x: left, y: top, width: 110, height: 44)
        retry.frame = CGRect(x: left + 114, y: top, width: 90, height: 44)
        status.frame = CGRect(x: left, y: top + 46, width: min(260, max(0, bounds.width - left)), height: 22)
        if plannedSize != bounds.size { rebuild() }
    }
    private func updateControls() {
        let hidden = !nativeControls || config == nil || !controlsVisible || presentationSuppressed
        toggle.isHidden = hidden
        retry.isHidden = hidden || !["auth", "unavailable", "error", "empty"].contains(state) || config?.enabled != true
        status.isHidden = hidden || state.isEmpty || config?.enabled != true
        let title = config?.labels["toggle"] ?? ""
        toggle.setTitle(title + (config?.enabled == true ? " ✓" : ""), for: .normal)
        toggle.accessibilityLabel = title
        toggle.accessibilityTraits = config?.enabled == true ? [.button, .selected] : [.button]
        retry.setTitle(config?.labels["retry"], for: .normal)
        status.text = config?.labels[state]
    }
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        for button in [toggle, retry] where !button.isHidden && button.superview === self {
            if button.frame.contains(point) { return button }
        }
        return nil
    }
    private func rebuild() {
        planGeneration += 1; let token = planGeneration
        glyphs = []; setNeedsDisplay()
        let size = bounds.size; plannedSize = size
        guard let config, config.enabled, size.width > 0, size.height > 0 else { return }
        let source = comments
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let font = CTFontCreateWithName("Helvetica" as CFString, CGFloat(24 * config.fontScale), nil)
            let lineHeight = CGFloat(34 * config.fontScale)
            let count = min(config.maxLines, Int(size.height * 0.7 / lineHeight))
            guard count > 0 else { return }
            var available = Array(repeating: -Double.infinity, count: count)
            var result: [DanmakuGlyph] = []
            for comment in source {
                // Separate top, rolling and bottom lanes. At very small heights/densities,
                // fixed comments are dropped rather than drawn on top of another mode.
                let lanes: [Int]
                if count >= 3 {
                    lanes = comment.mode == 5 ? [0] : comment.mode == 4 ? [count - 1] : Array(1..<(count - 1))
                } else { lanes = comment.mode == 1 ? Array(0..<count) : [] }
                guard let lane = lanes.first(where: { available[$0] <= comment.time }) else { continue }
                let rgb = comment.color
                let color = UIColor(red: CGFloat((rgb >> 16) & 255) / 255, green: CGFloat((rgb >> 8) & 255) / 255, blue: CGFloat(rgb & 255) / 255, alpha: CGFloat(config.opacity))
                let text = NSAttributedString(string: comment.text, attributes: [
                    NSAttributedString.Key(kCTFontAttributeName as String): font,
                    NSAttributedString.Key(kCTForegroundColorAttributeName as String): color.cgColor,
                ])
                let line = CTLineCreateWithAttributedString(text as CFAttributedString)
                let width = CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil))
                guard DanmakuLayout.accepts(width: Double(width), viewportWidth: Double(size.width), mode: comment.mode) else { continue }
                // A full lifetime per lane is intentionally conservative and cannot collide,
                // even for unequal widths, rate changes, seeks or fixed-mode comments.
                available[lane] = comment.time + config.durationSeconds
                result.append(DanmakuGlyph(start: comment.time, line: line, width: width, lane: lane, rolling: comment.mode == 1))
            }
            DispatchQueue.main.async {
                guard let self, self.planGeneration == token else { return }
                self.glyphs = result; self.setNeedsDisplay()
            }
        }
    }
    fileprivate func tick() {
        let hidden = presentationSuppressed
        let next = hidden || config?.enabled != true ? nil : clock?()
        if next != mediaTime { mediaTime = next; setNeedsDisplay() }
        if hidden != wasSuppressed { wasSuppressed = hidden; updateControls() }
    }
    override func draw(_ rect: CGRect) {
        guard let time = mediaTime, let config, let context = UIGraphicsGetCurrentContext() else { return }
        let now = time + config.offsetSeconds
        // Binary search only the bounded active interval; no full-file scan on a frame.
        var low = 0; var high = glyphs.count
        while low < high {
            let mid = (low + high) / 2
            if glyphs[mid].start <= now - config.durationSeconds { low = mid + 1 } else { high = mid }
        }
        context.saveGState()
        context.setShadow(offset: CGSize(width: 1, height: 1), blur: 2, color: UIColor.black.cgColor)
        var index = low
        while index < glyphs.count && glyphs[index].start <= now {
            let item = glyphs[index]
            let fraction = CGFloat((now - item.start) / config.durationSeconds)
            let x = item.rolling ? bounds.width - fraction * (bounds.width + item.width) : (bounds.width - item.width) / 2
            let y = CGFloat(item.lane + 1) * CGFloat(34 * config.fontScale)
            context.saveGState(); context.translateBy(x: x, y: y); context.scaleBy(x: 1, y: -1)
            context.textPosition = .zero; CTLineDraw(item.line, context); context.restoreGState()
            index += 1
        }
        context.restoreGState()
    }
}
#endif
