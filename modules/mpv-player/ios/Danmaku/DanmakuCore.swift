import Foundation
#if canImport(FoundationXML)
import FoundationXML
#endif
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

// Limits are shared by the parser, transport and presentation. No server content is logged.
enum DanmakuLimits {
    static let bytes = 8 * 1024 * 1024
    static let records = 20_000
    static let scalars = 300
    static let depth = 8
    static let timeout: TimeInterval = 15
}

// Rolling comments traverse the viewport, so their full width need not fit at once.
// Fixed comments cannot traverse it and are omitted rather than silently clipped.
enum DanmakuLayout {
    static func accepts(width: Double, viewportWidth: Double, mode: Int) -> Bool {
        guard width.isFinite, width > 0, viewportWidth.isFinite, viewportWidth > 0 else { return false }
        return mode == 1 || ([4, 5].contains(mode) && width <= viewportWidth)
    }
}

struct DanmakuConfig: Decodable {
    let retryKey: Int?
    let serverUrl: String
    let itemId: String
    let headers: [String: String]
    var enabled: Bool
    let fontScale: Double
    let opacity: Double
    let maxLines: Int
    let durationSeconds: Double
    let offsetSeconds: Double
    let labels: [String: String]

    var endpoint: URL? {
        guard !itemId.isEmpty, itemId.utf8.allSatisfy({
            (48...57).contains($0) || (65...90).contains($0) || (97...122).contains($0) || $0 == 45 || $0 == 95
        }), var c = URLComponents(string: serverUrl),
        ["http", "https"].contains(c.scheme?.lowercased() ?? ""),
        c.host?.isEmpty == false, c.user == nil, c.password == nil,
        c.query == nil, c.fragment == nil else { return nil }
        // Reject encoded slash/dot ambiguities rather than changing a configured proxy path.
        guard !c.percentEncodedPath.lowercased().contains("%2e"),
              !c.percentEncodedPath.lowercased().contains("%2f"),
              !c.path.split(separator: "/").contains("..") else { return nil }
        c.path = c.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        c.path = "/" + (c.path.isEmpty ? "" : c.path + "/") + "api/danmu/" + itemId + "/raw"
        return c.url
    }
    var valid: Bool {
        endpoint != nil && fontScale.isFinite && opacity.isFinite && durationSeconds.isFinite && offsetSeconds.isFinite &&
        (0.7...1.5).contains(fontScale) && (0.3...1).contains(opacity) && (1...8).contains(maxLines) &&
        (4...12).contains(durationSeconds) && (-30...30).contains(offsetSeconds) &&
        headers.allSatisfy { key, value in
            !key.isEmpty && key.utf8.allSatisfy { $0 > 32 && $0 < 127 && $0 != 58 } &&
            !value.contains("\r") && !value.contains("\n") &&
            !["host", "content-length", "connection", "transfer-encoding"].contains(key.lowercased())
        }
    }
}

struct DanmakuComment {
    let time: Double
    let mode: Int
    let color: UInt32
    let text: String
}

enum DanmakuFailure: Error { case invalid, auth, unavailable, network }

final class DanmakuXML: NSObject, XMLParserDelegate {
    private var comments: [DanmakuComment] = []
    private var depth = 0
    private var records = 0
    private var parameter: String?
    private var body = ""
    private var failed = false
    private var inComment = false
    static func parse(_ data: Data) throws -> [DanmakuComment] {
        guard data.count <= DanmakuLimits.bytes, let decoded = String(data: data, encoding: .utf8) else { throw DanmakuFailure.invalid }
        // UTF-8 BOM is allowed, but must not bypass XML declaration validation.
        let text = decoded.hasPrefix("\u{FEFF}") ? String(decoded.dropFirst()) : decoded
        guard !text.uppercased().contains("<!DOCTYPE"),
              !text.uppercased().contains("<!ENTITY") else { throw DanmakuFailure.invalid }
        if let declarationEnd = text.range(of: "?>"), text.hasPrefix("<?xml") {
            let declaration = String(text[..<declarationEnd.upperBound])
            let pattern = "encoding\\s*=\\s*[\"']([^\"']+)[\"']"
            let expression = try NSRegularExpression(pattern: pattern, options: .caseInsensitive)
            if let match = expression.firstMatch(in: declaration, range: NSRange(declaration.startIndex..., in: declaration)),
               let range = Range(match.range(at: 1), in: declaration), declaration[range].lowercased() != "utf-8" {
                throw DanmakuFailure.invalid
            }
        }
        let delegate = DanmakuXML()
        let parser = XMLParser(data: Data(text.utf8))
        parser.shouldResolveExternalEntities = false
        parser.delegate = delegate
        guard parser.parse(), !delegate.failed else { throw DanmakuFailure.invalid }
        return delegate.comments.enumerated().sorted {
            $0.element.time == $1.element.time ? $0.offset < $1.offset : $0.element.time < $1.element.time
        }.map { $0.element }
    }
    private func reject(_ parser: XMLParser) { failed = true; parser.abortParsing() }
    func parser(_ parser: XMLParser, didStartElement name: String, namespaceURI: String?, qualifiedName: String?, attributes: [String: String]) {
        depth += 1
        guard depth <= DanmakuLimits.depth, !inComment else { reject(parser); return }
        if name == "d" {
            records += 1
            guard records <= DanmakuLimits.records else { reject(parser); return }
            inComment = true; parameter = attributes["p"]; body = ""
        }
    }
    func parser(_ parser: XMLParser, foundCharacters string: String) {
        guard inComment else { return }
        body += string
        if body.unicodeScalars.count > DanmakuLimits.scalars { reject(parser) }
    }
    func parser(_ parser: XMLParser, foundCDATA CDATABlock: Data) {
        guard let value = String(data: CDATABlock, encoding: .utf8) else { reject(parser); return }
        self.parser(parser, foundCharacters: value)
    }
    func parser(_ parser: XMLParser, didEndElement name: String, namespaceURI: String?, qualifiedName: String?) {
        defer { depth -= 1 }
        guard name == "d" else { return }
        inComment = false
        let fields = (parameter ?? "").split(separator: ",", omittingEmptySubsequences: false)
        guard fields.count >= 4, let time = Double(fields[0]), time.isFinite, time >= 0,
              let mode = Int(fields[1]), [1, 4, 5].contains(mode),
              let color = UInt32(fields[3]), color <= 0xFFFFFF else { return }
        let clean = body.unicodeScalars.filter { !CharacterSet.controlCharacters.contains($0) }
        let text = String(String.UnicodeScalarView(clean)).trimmingCharacters(in: .whitespacesAndNewlines)
        if !text.isEmpty { comments.append(DanmakuComment(time: time, mode: mode, color: color, text: text)) }
    }
    func parser(_ parser: XMLParser, resolveExternalEntityName name: String, systemID: String?) -> Data? {
        reject(parser); return nil
    }
}

// Serial URLSession delegate queue bounds decompressed bytes before appending.
final class DanmakuDownload: NSObject, URLSessionDataDelegate {
    private let sessionLock = NSLock()
    private var storedSession: URLSession?
    private var session: URLSession? {
        get { sessionLock.lock(); defer { sessionLock.unlock() }; return storedSession }
        set { sessionLock.lock(); storedSession = newValue; sessionLock.unlock() }
    }
    private var data = Data()
    private var failure: DanmakuFailure?
    private var completion: ((Result<[DanmakuComment], Error>) -> Void)?
    private var deadline: DispatchWorkItem?
    func start(_ config: DanmakuConfig, completion: @escaping (Result<[DanmakuComment], Error>) -> Void) {
        guard config.valid, let url = config.endpoint else { completion(.failure(DanmakuFailure.invalid)); return }
        self.completion = completion
        let settings = URLSessionConfiguration.ephemeral
        settings.timeoutIntervalForRequest = DanmakuLimits.timeout
        settings.timeoutIntervalForResource = DanmakuLimits.timeout
        settings.httpCookieStorage = nil; settings.urlCredentialStorage = nil; settings.urlCache = nil
        let queue = OperationQueue(); queue.maxConcurrentOperationCount = 1
        session = URLSession(configuration: settings, delegate: self, delegateQueue: queue)
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        for (key, value) in config.headers { request.setValue(value, forHTTPHeaderField: key) }
        request.setValue("application/xml,text/xml", forHTTPHeaderField: "Accept")
        let timeout = DispatchWorkItem { [weak self] in self?.cancel() }
        deadline = timeout
        DispatchQueue.global().asyncAfter(deadline: .now() + DanmakuLimits.timeout, execute: timeout)
        session?.dataTask(with: request).resume()
    }
    func cancel() { session?.invalidateAndCancel() }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        failure = .unavailable; completionHandler(nil)
    }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard let response = response as? HTTPURLResponse, response.statusCode == 200,
              response.expectedContentLength <= Int64(DanmakuLimits.bytes) else {
            let code = (response as? HTTPURLResponse)?.statusCode
            failure = (code == 401 || code == 403) ? .auth : .unavailable
            completionHandler(.cancel); return
        }
        completionHandler(.allow)
    }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive chunk: Data) {
        guard data.count <= DanmakuLimits.bytes - chunk.count else { failure = .invalid; session.invalidateAndCancel(); return }
        data.append(chunk)
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        deadline?.cancel(); deadline = nil
        let result: Result<[DanmakuComment], Error>
        if let failure { result = .failure(failure) }
        else if error != nil { result = .failure(DanmakuFailure.network) }
        else { result = Result { try DanmakuXML.parse(data) } }
        data.removeAll(); session.finishTasksAndInvalidate(); self.session = nil
        let callback = completion; completion = nil; callback?(result)
    }
}

/// Epochs protect asynchronous property reads; stages keep queued commands and
/// their start/seek boundary ahead of any restart that could publish a clock.
final class DanmakuMediaClock {
    enum Boundary: Equatable { case load(UInt), seek }
    private enum Stage: Equatable { case idle, commandPending, boundaryPending, restartPending, ready }
    private let lock = NSLock()
    private var epoch: UInt = 0
    private var stage: Stage = .idle
    private var expected: Boundary?
    private var position: Double?
    func request(_ boundary: Boundary) -> UInt {
        lock.lock(); defer { lock.unlock() }
        epoch &+= 1; stage = .commandPending; expected = boundary; position = nil
        return epoch
    }
    func issued(_ token: UInt) {
        lock.lock(); defer { lock.unlock() }
        if epoch == token && stage == .commandPending { stage = .boundaryPending }
    }
    func boundary(_ boundary: Boundary) {
        lock.lock(); defer { lock.unlock() }
        if stage == .boundaryPending && expected == boundary {
            stage = .restartPending; position = nil
        } else if stage == .ready {
            // Includes seeks initiated inside mpv rather than through the bridge.
            epoch &+= 1; stage = .restartPending; position = nil
        }
    }
    func end() {
        lock.lock(); defer { lock.unlock() }
        position = nil
        if stage == .ready || stage == .restartPending { epoch &+= 1; stage = .idle }
    }
    func readToken(restart: Bool) -> UInt? {
        lock.lock(); defer { lock.unlock() }
        return stage == .ready || (restart && stage == .restartPending) ? epoch : nil
    }
    func commit(_ value: Double, token: UInt, restart: Bool) {
        lock.lock(); defer { lock.unlock() }
        guard token == epoch, value.isFinite, value >= 0,
              stage == .ready || (restart && stage == .restartPending) else { return }
        position = value; stage = .ready
    }
    func sample() -> Double? {
        lock.lock(); defer { lock.unlock() }; return position
    }
}
