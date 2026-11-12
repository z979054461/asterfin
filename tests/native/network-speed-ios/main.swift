import Foundation

func check(_ condition: @autoclosure () -> Bool, _ message: String) {
    if !condition() { fatalError(message) }
}
check(NetworkSpeed.label(nil) == nil, "Unknown must stay hidden")
check(NetworkSpeed.label(-1) == nil, "Negative rates must stay hidden")
check(NetworkSpeed.label(.nan) == nil, "NaN must stay hidden")
check(NetworkSpeed.label(.infinity) == nil, "Infinity must stay hidden")
check(NetworkSpeed.label(0) == "0 B/s", "Zero is an observed idle rate")
check(NetworkSpeed.label(999) == "999 B/s", "Byte boundary")
check(NetworkSpeed.label(1_000) == "1.0 KB/s", "Decimal KB units")
check(NetworkSpeed.label(1_900_000) == "1.9 MB/s", "Screenshot units are bytes, not bits")
check(NetworkSpeed.isRemote(URL(string: "https://example.test/video")!), "HTTPS stream")
check(NetworkSpeed.isRemote(URL(string: "HTTP://example.test/video")!), "Case insensitive HTTP")
check(!NetworkSpeed.isRemote(URL(fileURLWithPath: "/tmp/video.mp4")), "Offline file must stay hidden")
check(!NetworkSpeed.isRemote(URL(string: "content://video/42")!), "Content URI must stay hidden")
print("Network speed: 12 checks passed")
