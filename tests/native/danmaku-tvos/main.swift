import Foundation

let json = #"{"serverUrl":"https://example.test","itemId":"item","headers":{},"enabled":true,"fontScale":1,"opacity":0.8,"maxLines":4,"durationSeconds":8,"offsetSeconds":0,"labels":{}}"#
let base = try JSONDecoder().decode(DanmakuConfig.self, from: Data(json.utf8))
let minimums: [TVDanmakuAdjustment: Double] = [.fontScale: 0.7, .opacity: 0.3, .maxLines: 1, .durationSeconds: 4, .offsetSeconds: -30]
let maximums: [TVDanmakuAdjustment: Double] = [.fontScale: 1.5, .opacity: 1, .maxLines: 8, .durationSeconds: 12, .offsetSeconds: 30]
for field in TVDanmakuAdjustment.allCases {
    var current = base
    for _ in 0..<200 { current = field.adjust(current, direction: -1); precondition(current.valid) }
    precondition(field.value(current) == minimums[field])
    for _ in 0..<200 { current = field.adjust(current, direction: 1); precondition(current.valid) }
    precondition(field.value(current) == maximums[field])
    precondition(current.headers == base.headers && current.itemId == base.itemId && current.enabled == base.enabled)
    precondition(field.value(field.adjust(current, direction: 0)) == field.value(current))
}
precondition(TVDanmakuAdjustment.offsetSeconds.value(TVDanmakuAdjustment.offsetSeconds.adjust(base, direction: -1)) == -0.5)
print("PASS: tvOS remote adjustments stay valid across repeated presses and both bounds")
