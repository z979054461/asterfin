import { DANMAKU_DEFAULTS, DANMAKU_LIMITS } from "@/constants/Danmaku";
import type { DanmakuConfig } from "@/modules/mpv-player/src/Danmaku.types";

export interface DanmakuSettings {
  enabled: boolean;
  fontScale: number;
  opacity: number;
  maxLines: number;
  durationSeconds: number;
  offsetSeconds: number;
}

export function normalizeDanmakuSettings(
  input: Partial<DanmakuSettings> | undefined,
): DanmakuSettings {
  const result: DanmakuSettings = { ...DANMAKU_DEFAULTS };
  if (typeof input?.enabled === "boolean") result.enabled = input.enabled;
  for (const key of Object.keys(DANMAKU_LIMITS) as Array<
    keyof typeof DANMAKU_LIMITS
  >) {
    const value = input?.[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const { min, max } = DANMAKU_LIMITS[key];
    const clamped = Math.min(max, Math.max(min, value));
    result[key] = key === "maxLines" ? Math.round(clamped) : clamped;
  }
  return result;
}

/** Retains a /jellyfin reverse-proxy prefix; never derives this from a stream URL. */
export function danmakuEndpoint(
  serverUrl: string,
  itemId: string,
): string | undefined {
  if (!/^[A-Za-z0-9_-]+$/.test(itemId) || /%2[ef]/i.test(serverUrl))
    return undefined;
  try {
    const url = new URL(serverUrl);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return undefined;
    return `${url.toString().replace(/\/+$/, "")}/api/danmu/${encodeURIComponent(itemId)}/raw`;
  } catch {
    return undefined;
  }
}

interface ConfigInput {
  serverUrl?: string | null;
  accessToken?: string;
  userId?: string | null;
  itemId?: string | null;
  itemType?: string | null;
  offline: boolean;
  isTV: boolean;
  playMethod?: string;
  customHeaders?: Record<string, string>;
  settings?: Partial<DanmakuSettings>;
  labels: DanmakuConfig["labels"];
}

export function buildDanmakuConfig(
  input: ConfigInput,
): DanmakuConfig | undefined {
  const { serverUrl, accessToken, itemId } = input;
  if (
    input.offline ||
    input.isTV ||
    !input.userId ||
    !serverUrl ||
    !accessToken ||
    !itemId ||
    !["Movie", "Episode", "Video"].includes(input.itemType ?? "") ||
    !["DirectPlay", "DirectStream"].includes(input.playMethod ?? "") ||
    !danmakuEndpoint(serverUrl, itemId) ||
    /[\r\n\0]/.test(accessToken)
  )
    return undefined;

  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(input.customHeaders ?? {})) {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || /[\r\n\0]/.test(value))
      continue;
    if (
      [
        "host",
        "content-length",
        "transfer-encoding",
        "connection",
        "accept-encoding",
        "x-emby-token",
      ].includes(name.toLowerCase())
    )
      continue;
    headers[name] = value;
  }
  // A separate token header preserves a reverse proxy's HTTP Basic Authorization.
  headers["X-Emby-Token"] = accessToken;
  return {
    serverUrl: new URL(serverUrl).toString().replace(/\/+$/, ""),
    itemId,
    headers,
    ...normalizeDanmakuSettings(input.settings),
    labels: input.labels,
  };
}
