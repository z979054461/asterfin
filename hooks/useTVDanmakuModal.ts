import { useCallback, useEffect, useId, useRef } from "react";
import useRouter from "@/hooks/useAppRouter";
import type { DanmakuStatus } from "@/modules/mpv-player/src/Danmaku.types";
import { tvDanmakuModalAtom } from "@/utils/atoms/tvDanmakuModal";
import { store } from "@/utils/store";

export function useTVDanmakuModal({
  mediaId,
  available,
  status,
  onRetry,
}: {
  mediaId?: string;
  available: boolean;
  status: DanmakuStatus;
  onRetry: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const sessionId = `${id}:${mediaId ?? ""}`;
  const retry = useRef(onRetry);
  retry.current = onRetry;
  const requestRetry = useCallback(() => retry.current(), []);

  useEffect(
    () => () => {
      if (store.get(tvDanmakuModalAtom)?.sessionId === sessionId) {
        store.set(tvDanmakuModalAtom, null);
      }
    },
    [sessionId],
  );
  useEffect(() => {
    const current = store.get(tvDanmakuModalAtom);
    if (current?.sessionId === sessionId) {
      store.set(tvDanmakuModalAtom, { ...current, available, status });
    }
  }, [sessionId, available, status]);

  return useCallback(() => {
    // Repeated Select events must not stack a second route or steal focus.
    if (store.get(tvDanmakuModalAtom)) return;
    store.set(tvDanmakuModalAtom, {
      sessionId,
      available,
      status,
      onRetry: requestRetry,
    });
    try {
      router.push("/(auth)/tv-danmaku-modal");
    } catch (error) {
      if (store.get(tvDanmakuModalAtom)?.sessionId === sessionId) {
        store.set(tvDanmakuModalAtom, null);
      }
      throw error;
    }
  }, [sessionId, available, status, requestRetry, router]);
}
