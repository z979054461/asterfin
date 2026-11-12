import { atom } from "jotai";
import type { DanmakuStatus } from "@/modules/mpv-player/src/Danmaku.types";

/** Only presentation state and a scoped retry callback; never credentials. */
export interface TVDanmakuModalState {
  sessionId: string;
  available: boolean;
  status: DanmakuStatus;
  onRetry: () => void;
}

export const tvDanmakuModalAtom = atom<TVDanmakuModalState | null>(null);
