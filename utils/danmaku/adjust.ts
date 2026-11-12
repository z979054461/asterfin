import { DANMAKU_LIMITS } from "@/constants/Danmaku";
import type { DanmakuSettings } from "./config";

export type DanmakuNumberKey = keyof typeof DANMAKU_LIMITS;

/** Round after each remote click so repeated 0.1/0.05 steps stay stable. */
export function adjustDanmakuSetting(
  value: DanmakuSettings,
  key: DanmakuNumberKey,
  direction: -1 | 1,
): DanmakuSettings {
  const { min, max, step } = DANMAKU_LIMITS[key];
  const next = Math.round((value[key] + direction * step) * 100) / 100;
  return { ...value, [key]: Math.min(max, Math.max(min, next)) };
}
