package expo.modules.mpvplayer.nativeplayer.engine;

import java.util.Locale;

/** Per-media-source read throughput, never device traffic or bandwidth capacity. */
public final class NetworkReadSpeed {
    public static final long SAMPLE_INTERVAL_MS = 1000L;
    private long sampledAtMs;
    private long bytes;
    private Double lastRate;

    public NetworkReadSpeed(long nowMs) { reset(nowMs); }

    public synchronized void reset(long nowMs) {
        sampledAtMs = nowMs;
        bytes = 0L;
        lastRate = null;
    }

    public synchronized void addBytes(int count) {
        if (count > 0) bytes += count;
    }

    public synchronized Double sample(long nowMs) {
        long elapsed = nowMs - sampledAtMs;
        if (elapsed < 0) {
            reset(nowMs);
            return null;
        }
        if (elapsed < SAMPLE_INTERVAL_MS) return lastRate;
        lastRate = bytes * 1000.0 / elapsed;
        sampledAtMs = nowMs;
        bytes = 0L;
        return lastRate;
    }

    public static String format(Double bytesPerSecond) {
        if (bytesPerSecond == null || !Double.isFinite(bytesPerSecond) || bytesPerSecond < 0) return null;
        if (bytesPerSecond >= 1_000_000) return String.format(Locale.ROOT, "%.1f MB/s", bytesPerSecond / 1_000_000);
        if (bytesPerSecond >= 1_000) return String.format(Locale.ROOT, "%.1f KB/s", bytesPerSecond / 1_000);
        return String.format(Locale.ROOT, "%.0f B/s", bytesPerSecond);
    }
}
