import { act, renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import type { TechnicalInfo } from "@/modules/mpv-player";
import { useNetworkSpeed } from "./useNetworkSpeed";

beforeEach(() => {
  jest.useFakeTimers();
  AppState.currentState = "active";
});
afterEach(() => {
  jest.useRealTimers();
});
it("reads once per interval, clears failures, stops when hidden", async () => {
  const getInfo = jest
    .fn()
    .mockResolvedValue({ networkBytesPerSecond: 1_900_000 });
  const view = await renderHook(
    ({ enabled }: { enabled: boolean }) =>
      useNetworkSpeed(getInfo, enabled, "one"),
    { initialProps: { enabled: true } },
  );
  await act(async () => {});
  expect(view.result.current).toBe("1.9 MB/s");
  getInfo.mockRejectedValueOnce(new Error("unavailable"));
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(view.result.current).toBeNull();
  await view.rerender({ enabled: false });
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(getInfo).toHaveBeenCalledTimes(2);
  expect(view.result.current).toBeNull();
});
it("ignores a late response after switching streams and never overlaps polls", async () => {
  let finish!: (info: TechnicalInfo) => void;
  const getInfo = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<TechnicalInfo>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue({ networkBytesPerSecond: 0 });
  const view = await renderHook(
    ({ stream }: { stream: string }) => useNetworkSpeed(getInfo, true, stream),
    { initialProps: { stream: "one" } },
  );
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(getInfo).toHaveBeenCalledTimes(1);
  await view.rerender({ stream: "two" });
  await act(async () => {
    finish({ networkBytesPerSecond: 9_000_000 });
  });
  expect(view.result.current).toBe("0 B/s");
  await view.unmount();
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(getInfo).toHaveBeenCalledTimes(2);
});
it("does not read native metrics in background", async () => {
  AppState.currentState = "background";
  const getInfo = jest.fn();
  const view = await renderHook(() => useNetworkSpeed(getInfo, true, "one"));
  expect(view.result.current).toBeNull();
  expect(getInfo).not.toHaveBeenCalled();
});
