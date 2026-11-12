#if os(iOS) || os(tvOS)
import UIKit
import Combine
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
final class DanmakuOverlay: UIView, ObservableObject {
    var onSettingsChange: (([String: Any]) -> Void)?
    var onStatus: ((String, Int) -> Void)?
    var nativeControls = true { didSet { updateControls() } }
    var clock: (() -> Double?)?
    var suppressed: (() -> Bool)?
    var controlsVisible = true { didSet { updateControls() } }
    private var suspendedForReuse = false
    private var resumeConfig: DanmakuConfig?
    @Published private(set) var config: DanmakuConfig?
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
    @Published private(set) var state = "" { didSet {
        if state != oldValue { onStatus?(state.isEmpty ? "disabled" : state, comments.count) }
    } }
    private var settingsOpen = false
    #if os(iOS)
    private let toggle = UIButton(type: .system)
    private let settings = UIButton(type: .system)
    private let settingsPanel = UIScrollView()
    private let settingsRows = UIStackView()
    private var settingsViewport = CGSize.zero
    private let retry = UIButton(type: .system)
    private let status = UILabel()
    #endif

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear; isOpaque = false; clipsToBounds = true
        displayTarget.overlay = self
        #if os(iOS)
        toggle.addTarget(self, action: #selector(toggleEnabled), for: .touchUpInside)
        retry.addTarget(self, action: #selector(retryDownload), for: .touchUpInside)
        settings.addTarget(self, action: #selector(openSettings), for: .touchUpInside)
        settingsPanel.backgroundColor = UIColor.black.withAlphaComponent(0.92)
        settingsPanel.layer.cornerRadius = 12
        settingsRows.axis = .vertical; settingsRows.spacing = 4
        settingsPanel.addSubview(settingsRows); addSubview(settingsPanel)
        for button in [toggle, retry, settings] {
            button.tintColor = .white; button.backgroundColor = UIColor.black.withAlphaComponent(0.65)
            button.layer.cornerRadius = 8; button.titleLabel?.font = .systemFont(ofSize: 13)
            addSubview(button)
        }
        status.font = .systemFont(ofSize: 11); status.textColor = .white
        status.backgroundColor = UIColor.black.withAlphaComponent(0.65)
        status.isAccessibilityElement = true; addSubview(status)
        #endif
        NotificationCenter.default.addObserver(self, selector: #selector(applicationWillResignActive), name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(applicationDidBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        updateControls()
    }
    // The drawing stays below SwiftUI chrome. Only these small controls are
    // reparented above its transparent full-screen gesture surface.
    #if os(iOS)
    func attachControls(to host: UIView) {
        for control in [toggle, retry, status, settings, settingsPanel] { host.addSubview(control) }
    }
    #endif
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
    deinit { NotificationCenter.default.removeObserver(self); displayLink?.invalidate(); download?.cancel() }

    @objc private func applicationWillResignActive() { applicationInactive = true; refreshVisibility() }
    @objc private func applicationDidBecomeActive() { applicationInactive = false; refreshVisibility() }
    // Hosts call this when PiP changes. Disabled controls need updates even without a display link.
    func refreshVisibility() {
        wasSuppressed = presentationSuppressed
        if wasSuppressed { settingsOpen = false; mediaTime = nil; setNeedsDisplay() }
        updateControls()
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        displayLink?.invalidate(); displayLink = nil
        if window != nil {
            startDisplayLinkIfNeeded()
            if config?.enabled == true && download == nil && comments.isEmpty { fetch() }
        } else {
            settingsOpen = false; updateControls()
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
        if let value, let current = config, !suspendedForReuse,
           current.serverUrl == value.serverUrl, current.itemId == value.itemId,
           current.headers == value.headers, current.retryKey == value.retryKey {
            applySettings(value, notify: false)
            return
        }
        settingsOpen = false
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
        config.enabled.toggle(); applySettings(config)
    }
    func applySettings(_ value: DanmakuConfig, notify: Bool = true) {
        guard value.valid else { return }
        let changedEnabled = config?.enabled != value.enabled
        config = value; resumeConfig = value
        if changedEnabled {
            if value.enabled { state = comments.isEmpty ? "loading" : "ready"; if comments.isEmpty { fetch() } }
            else { generation += 1; download?.cancel(); download = nil; state = "disabled"; mediaTime = nil }
            startDisplayLinkIfNeeded()
        }
        rebuild(); updateControls()
        if notify { onSettingsChange?(["enabled": value.enabled, "fontScale": value.fontScale,
            "opacity": value.opacity, "maxLines": value.maxLines,
            "durationSeconds": value.durationSeconds, "offsetSeconds": value.offsetSeconds]) }
    }
    #if os(iOS)
    @objc private func openSettings() { settingsOpen.toggle(); if settingsOpen { buildSettings() }; updateControls(); setNeedsLayout() }
    private func buildSettings() {
        for view in settingsRows.arrangedSubviews { settingsRows.removeArrangedSubview(view); view.removeFromSuperview() }
        guard let config else { return }
        let close = UIButton(type: .system)
        close.setTitle(config.labels["close"], for: .normal); close.tintColor = .white
        close.addTarget(self, action: #selector(openSettings), for: .touchUpInside)
        settingsRows.addArrangedSubview(close)
        let enabledSwitch = UISwitch(); enabledSwitch.isOn = config.enabled
        enabledSwitch.accessibilityLabel = config.labels["enabled"]
        enabledSwitch.addAction(UIAction { [weak self, weak enabledSwitch] _ in
            guard let self, let enabledSwitch, var value = self.config else { return }
            value.enabled = enabledSwitch.isOn; self.applySettings(value)
        }, for: .valueChanged)
        addSettingsRow(title: config.labels["enabled"] ?? "", control: enabledSwitch)
        let fields: [(String, Double, Double, Double, Double)] = [
            ("fontScale", config.fontScale, 0.7, 1.5, 0.1),
            ("opacity", config.opacity, 0.3, 1, 0.05),
            ("maxLines", Double(config.maxLines), 1, 8, 1),
            ("durationSeconds", config.durationSeconds, 4, 12, 1),
            ("offsetSeconds", config.offsetSeconds, -30, 30, 0.5)]
        for (key, value, minimum, maximum, step) in fields {
            let stepper = UIStepper(); stepper.minimumValue = minimum; stepper.maximumValue = maximum
            stepper.stepValue = step; stepper.value = value
            stepper.accessibilityLabel = config.labels[key]
            let title = UILabel(); title.textColor = .white; title.font = .systemFont(ofSize: 13)
            let updateTitle = { [weak stepper] in guard let stepper else { return }; title.text = "\(config.labels[key] ?? key): \(String(format: "%.2g", stepper.value))"; stepper.accessibilityValue = String(format: "%.2g", stepper.value) }
            updateTitle()
            stepper.addAction(UIAction { [weak self, weak stepper] _ in
                guard let self, let stepper, var next = self.config else { return }
                let number = (stepper.value * 100).rounded() / 100
                switch key {
                case "fontScale": next.fontScale = number
                case "opacity": next.opacity = number
                case "maxLines": next.maxLines = Int(number)
                case "durationSeconds": next.durationSeconds = number
                default: next.offsetSeconds = number
                }
                updateTitle(); self.applySettings(next)
            }, for: .valueChanged)
            addSettingsRow(label: title, control: stepper)
        }
    }
    private func addSettingsRow(title: String, control: UIView) {
        let label = UILabel(); label.text = title; label.textColor = .white; label.font = .systemFont(ofSize: 13)
        addSettingsRow(label: label, control: control)
    }
    private func addSettingsRow(label: UILabel, control: UIView) {
        let row = UIStackView(arrangedSubviews: [label, control]); row.axis = .horizontal
        row.alignment = .center; row.spacing = 8
        row.heightAnchor.constraint(equalToConstant: 44).isActive = true
        settingsRows.addArrangedSubview(row)
    }
    #endif
    @objc func retryDownload() { fetch() }
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
        #if os(iOS)
        if settingsViewport != .zero && settingsViewport != bounds.size { settingsOpen = false; updateControls() }
        settingsViewport = bounds.size
        let left = safeAreaInsets.left + 12
        let top = safeAreaInsets.top + 62
        toggle.frame = CGRect(x: left, y: top, width: 110, height: 44)
        settings.frame = CGRect(x: left + 114, y: top, width: 110, height: 44)
        settingsPanel.frame = CGRect(x: left, y: safeAreaInsets.top + 12, width: min(360, bounds.width - left - safeAreaInsets.right - 12), height: max(0, min(390, bounds.height - safeAreaInsets.top - safeAreaInsets.bottom - 24)))
        settingsRows.frame = CGRect(x: 12, y: 8, width: settingsPanel.bounds.width - 24, height: 380)
        settingsPanel.contentSize = CGSize(width: settingsPanel.bounds.width, height: 396)
        retry.frame = CGRect(x: left + 228, y: top, width: 90, height: 44)
        status.frame = CGRect(x: left, y: top + 46, width: min(260, max(0, bounds.width - left)), height: 22)
        #endif
        if plannedSize != bounds.size { rebuild() }
    }
    private func updateControls() {
        #if os(iOS)
        let hidden = !nativeControls || config == nil || (!controlsVisible && !settingsOpen) || presentationSuppressed
        settingsPanel.isHidden = hidden || !settingsOpen
        settings.isHidden = hidden || settingsOpen
        settings.setTitle(config?.labels["settings"], for: .normal)
        settings.accessibilityLabel = config?.labels["settings"]
        toggle.isHidden = hidden || settingsOpen
        retry.isHidden = hidden || settingsOpen || !["auth", "unavailable", "error", "empty"].contains(state) || config?.enabled != true
        status.isHidden = hidden || settingsOpen || state.isEmpty || config?.enabled != true
        let title = config?.labels["toggle"] ?? ""
        toggle.setTitle(title + (config?.enabled == true ? " ✓" : ""), for: .normal)
        toggle.accessibilityLabel = title
        toggle.accessibilityTraits = config?.enabled == true ? [.button, .selected] : [.button]
        retry.setTitle(config?.labels["retry"], for: .normal)
        status.text = config?.labels[state]
        #endif
    }
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        #if os(iOS)
        if !settingsPanel.isHidden && settingsPanel.superview === self && settingsPanel.frame.contains(point) { return settingsPanel.hitTest(convert(point, to: settingsPanel), with: event) }
        for button in [toggle, retry, settings] where !button.isHidden && button.superview === self {
            if button.frame.contains(point) { return button }
        }
        #endif
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
