import Foundation

var checks = 0
func check(_ condition: @autoclosure () -> Bool, _ name: String) {
    precondition(condition(), name); checks += 1
}
func rejects(_ xml: String) {
    do { _ = try DanmakuXML.parse(Data(xml.utf8)); fatalError("accepted unsafe XML") }
    catch { checks += 1 }
}
// Rolling text may be wider than the viewport; fixed text must fit.
check(DanmakuLayout.accepts(width: 640, viewportWidth: 320, mode: 1), "long rolling comment survives planning")
check(!DanmakuLayout.accepts(width: 640, viewportWidth: 320, mode: 4), "long bottom comment omitted")
check(!DanmakuLayout.accepts(width: 640, viewportWidth: 320, mode: 5), "long top comment omitted")
check(DanmakuLayout.accepts(width: 320, viewportWidth: 320, mode: 5), "fitting fixed comment retained")
for width in [0.0, -1.0, Double.infinity, Double.nan] {
    check(!DanmakuLayout.accepts(width: width, viewportWidth: 320, mode: 1), "invalid measured width omitted")
}
check(!DanmakuLayout.accepts(width: 10, viewportWidth: 0, mode: 1), "zero viewport omitted")
check(!DanmakuLayout.accepts(width: 10, viewportWidth: 320, mode: 7), "unsupported layout mode omitted")

let good = "<i><d p='2,1,25,16777215'>你好 &amp; world 😀</d><d p='1,5,25,255'>Top</d><d p='1,4,25,0'>Bottom</d><d p='0,7,25,0'>Unsupported</d></i>"
let parsed = try DanmakuXML.parse(Data(good.utf8))
check(parsed.count == 3, "supported modes only")
check(parsed.map { $0.time } == [1, 1, 2], "sorted, stable ties")
check(parsed.last?.text == "你好 & world 😀", "Unicode and escaped ampersand")
check(parsed[0].mode == 5 && parsed[1].mode == 4, "top/bottom order")
let bomValid = try DanmakuXML.parse(Data(("\u{FEFF}<?xml version='1.0' encoding='UTF-8'?><i><d p='1,1,25,0'>中文</d></i>").utf8))
check(bomValid.first?.text == "中文", "UTF8 BOM and Chinese retained")
rejects("\u{FEFF}<?xml version='1.0' encoding='ISO-8859-1'?><i><d p='1,1,25,0'>中文</d></i>")
rejects("<?xml version='1.0' encoding='ISO-8859-1'?><i><d p='1,1,25,0'>中文</d></i>")
let empty = try DanmakuXML.parse(Data("<i/>".utf8))
check(empty.isEmpty, "empty")
rejects("<!DOCTYPE i [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><i>&x;</i>")
rejects("<!DOCTYPE i><i/>")
rejects("<i><d p='0,1,25,0'>" + String(repeating: "😀", count: 301) + "</d></i>")
rejects(String(repeating: "<i>", count: 9) + String(repeating: "</i>", count: 9))
rejects("<i><d p='0,1,25,0'><b>nested</b></d></i>")
rejects("<i><d>unterminated</i>")
rejects("<?xml version='1.0' encoding='ISO-8859-1'?><i/>")
rejects("<i>" + String(repeating: "<d p='0,1,25,0'>x</d>", count: 20_001) + "</i>")
rejects("<i>" + String(repeating: "x", count: DanmakuLimits.bytes) + "</i>")
do { _ = try DanmakuXML.parse(Data([0xff, 0xfe, 0x3c, 0x00])); fatalError("accepted invalid UTF8") }
catch { checks += 1 }
let malformed = try DanmakuXML.parse(Data("<i><d p='NaN,1,25,0'>a</d><d p='-1,1,25,0'>b</d><d p='1,1,25,99999999999'>c</d></i>".utf8))
check(malformed.isEmpty, "invalid records skipped")
func config(_ base: String, item: String = "abc-123_9") -> DanmakuConfig {
    DanmakuConfig(retryKey: nil, serverUrl: base, itemId: item, headers: ["X-Emby-Token": "synthetic"], enabled: true, fontScale: 1, opacity: 0.85, maxLines: 5, durationSeconds: 8, offsetSeconds: 0, labels: [:])
}
check(config("https://example.invalid/jellyfin/").endpoint?.absoluteString == "https://example.invalid/jellyfin/api/danmu/abc-123_9/raw", "proxy prefix preserved")
check(config("https://example.invalid").valid, "valid root")
for base in ["file:///tmp/x", "https://u:p@example.invalid", "https://example.invalid?token=x", "https://example.invalid#x", "https://example.invalid/%2e%2e/"] {
    check(!config(base).valid, "unsafe base rejected")
}
for item in ["", "../x", "a/b", "a?b", "中文"] { check(!config("https://example.invalid", item: item).valid, "unsafe item rejected") }

let proxyCookie = DanmakuConfig(retryKey: nil, serverUrl: "https://example.invalid/jellyfin", itemId: "abc", headers: ["Cookie": "proxy_session=synthetic", "X-Emby-Token": "synthetic"], enabled: true, fontScale: 1, opacity: 0.85, maxLines: 5, durationSeconds: 8, offsetSeconds: 0, labels: [:])
check(proxyCookie.valid, "explicit scoped proxy Cookie allowed")

// Exercise the actual lock/epoch state machine without UIKit or libmpv.
let clock = DanmakuMediaClock()
let firstLoad = clock.request(.load(1))
check(clock.readToken(restart: true) == nil, "restart before queued load command is blocked")
clock.boundary(.load(1))
check(clock.readToken(restart: true) == nil, "boundary before command issue cannot enable clock")
clock.issued(firstLoad)
clock.boundary(.load(999))
check(clock.readToken(restart: true) == nil, "wrong load generation cannot enable clock")
clock.boundary(.load(1))
let firstRead = clock.readToken(restart: true)!
let seek = clock.request(.seek)
clock.commit(10, token: firstRead, restart: true)
check(clock.sample() == nil, "concurrent seek fences restart read commit")
check(clock.readToken(restart: true) == nil, "stale restart after invalidate remains blocked")
clock.issued(seek)
check(clock.readToken(restart: true) == nil, "issued seek still waits for seek boundary")
clock.boundary(.seek)
let seekRead = clock.readToken(restart: true)!
clock.commit(20, token: seekRead, restart: true)
check(clock.sample() == 20, "matching boundary and real sample publish clock")
let ordinaryRead = clock.readToken(restart: false)!
let secondLoad = clock.request(.load(2))
clock.commit(21, token: ordinaryRead, restart: false)
check(clock.sample() == nil, "time-pos read also epoch fenced")
clock.issued(firstLoad)
clock.boundary(.load(1))
check(clock.readToken(restart: true) == nil, "older queued load cannot enable latest request")
clock.issued(secondLoad)
clock.boundary(.load(2))
clock.commit(40, token: clock.readToken(restart: true)!, restart: true)
check(clock.sample() == 40, "latest load sample accepted")
clock.end()
check(clock.sample() == nil && clock.readToken(restart: true) == nil, "end hides and prevents stale restart")
print("Passed \(checks) danmaku iOS core assertions")
