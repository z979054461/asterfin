import { act, renderHook } from "@testing-library/react-native";
import type { DanmakuStatus } from "@/modules/mpv-player/src/Danmaku.types";
import { tvDanmakuModalAtom } from "@/utils/atoms/tvDanmakuModal";
import { store } from "@/utils/store";
import { useTVDanmakuModal } from "./useTVDanmakuModal";

const mockPush = jest.fn();
const mockRouter = { push: mockPush };
jest.mock("@/hooks/useAppRouter", () => ({
  __esModule: true,
  default: () => mockRouter,
}));
beforeEach(() => {
  mockPush.mockClear();
  store.set(tvDanmakuModalAtom, null);
});

it("guards repeated opens, updates status and retry, and clears only its own media session", async () => {
  const firstRetry = jest.fn();
  const nextRetry = jest.fn();
  const view = await renderHook(
    (props: { mediaId: string; status: DanmakuStatus; onRetry: () => void }) =>
      useTVDanmakuModal({ ...props, available: true }),
    {
      initialProps: {
        mediaId: "item1",
        status: "loading",
        onRetry: firstRetry,
      },
    },
  );
  await act(() => {
    view.result.current();
    view.result.current();
  });
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith("/(auth)/tv-danmaku-modal");
  const retainedRetry = store.get(tvDanmakuModalAtom)?.onRetry;
  await view.rerender({
    mediaId: "item1",
    status: "ready",
    onRetry: nextRetry,
  });
  expect(store.get(tvDanmakuModalAtom)?.status).toBe("ready");
  retainedRetry?.();
  expect(nextRetry).toHaveBeenCalledTimes(1);
  expect(firstRetry).not.toHaveBeenCalled();
  expect(Object.keys(store.get(tvDanmakuModalAtom) ?? {}).sort()).toEqual([
    "available",
    "onRetry",
    "sessionId",
    "status",
  ]);
  await view.rerender({
    mediaId: "item2",
    status: "loading",
    onRetry: nextRetry,
  });
  expect(store.get(tvDanmakuModalAtom)).toBeNull();
  await act(() => view.result.current());
  expect(mockPush).toHaveBeenCalledTimes(2);
  await view.unmount();
  expect(store.get(tvDanmakuModalAtom)).toBeNull();
});
