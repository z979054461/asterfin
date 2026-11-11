import { DANMAKU_LIMITS } from "@/constants/Danmaku";
import { type DanmakuSettings, normalizeDanmakuSettings } from "./config";

/** Accept only a complete settings event. Never persist a native player config. */
export function readNativeDanmakuSettings(
  payload: unknown,
): DanmakuSettings | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const input = payload as Record<string, unknown>;
  if (typeof input.enabled !== "boolean") return undefined;
  for (const key of Object.keys(DANMAKU_LIMITS)) {
    if (typeof input[key] !== "number" || !Number.isFinite(input[key]))
      return undefined;
  }
  return normalizeDanmakuSettings(input as unknown as DanmakuSettings);
}
