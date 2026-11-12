import java.lang.reflect.Method;

/** Runs the same contract against both independently buildable Android modules. */
public final class NetworkReadSpeedTest {
    private static void eq(Object expected, Object actual) {
        if (expected == null ? actual != null : !expected.equals(actual))
            throw new AssertionError("Expected " + expected + ", got " + actual);
    }
    private static void verify(String name) throws Exception {
        Class<?> type = Class.forName(name);
        Method sample = type.getMethod("sample", long.class);
        Method add = type.getMethod("addBytes", int.class);
        Method reset = type.getMethod("reset", long.class);
        Method format = type.getMethod("format", Double.class);
        Object counter = type.getConstructor(long.class).newInstance(1000L);
        eq(null, sample.invoke(counter, 1500L)); // Unknown, not fake zero.
        add.invoke(counter, 2_000_000);
        eq(1_000_000.0, sample.invoke(counter, 3000L)); // Elapsed time, not requested interval.
        eq(1_000_000.0, sample.invoke(counter, 3500L)); // Shared readers do not consume the sample.
        eq(0.0, sample.invoke(counter, 4000L)); // No traffic is zero, not stale previous speed.
        add.invoke(counter, -100);
        eq(0.0, sample.invoke(counter, 5000L));
        add.invoke(counter, 1000);
        reset.invoke(counter, 6000L); // Seek/item boundary discards previous traffic.
        eq(null, sample.invoke(counter, 6500L));
        eq(0.0, sample.invoke(counter, 7000L));
        eq(null, sample.invoke(counter, 6900L)); // Defensive monotonic reset.
        Object oldSource = type.getConstructor(long.class).newInstance(0L);
        Object newSource = type.getConstructor(long.class).newInstance(0L);
        add.invoke(oldSource, 1000000);
        eq(0.0, sample.invoke(newSource, 1000L)); // Late old callbacks cannot leak.
        eq(null, format.invoke(null, new Object[]{null}));
        eq(null, format.invoke(null, Double.NaN));
        eq(null, format.invoke(null, Double.POSITIVE_INFINITY));
        eq(null, format.invoke(null, -1.0));
        eq("0 B/s", format.invoke(null, 0.0));
        eq("999 B/s", format.invoke(null, 999.0));
        eq("1.0 KB/s", format.invoke(null, 1000.0));
        eq("1.9 MB/s", format.invoke(null, 1900000.0));
        eq("1000.0 MB/s", format.invoke(null, 1000000000.0));
        System.out.println(name + ": passed");
    }
    public static void main(String[] args) throws Exception {
        verify("expo.modules.mpvplayer.nativeplayer.engine.NetworkReadSpeed");
        verify("expo.modules.exoplayerplayer.NetworkReadSpeed");
    }
}
