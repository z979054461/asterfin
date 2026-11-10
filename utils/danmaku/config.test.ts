import { DANMAKU_DEFAULTS } from "@/constants/Danmaku";
import {
  buildDanmakuConfig,
  danmakuEndpoint,
  normalizeDanmakuSettings,
} from "./config";

const labels = {
  loading: "loading",
  empty: "empty",
  unavailable: "unavailable",
  auth: "auth",
  error: "error",
  ready: "ready",
  toggle: "toggle",
  retry: "retry",
};
const input = {
  serverUrl: "https://media.example/jellyfin/",
  accessToken: "synthetic-token",
  userId: "user-1",
  itemId: "item-2",
  itemType: "Episode",
  offline: false,
  isTV: false,
  playMethod: "DirectPlay",
  labels,
};

describe("Jellyfin danmaku request policy", () => {
  it("keeps the reverse proxy prefix and uses only the configured server", () => {
    expect(danmakuEndpoint(input.serverUrl, input.itemId)).toBe(
      "https://media.example/jellyfin/api/danmu/item-2/raw",
    );
    expect(danmakuEndpoint("https://media.example", "abc123")).toBe(
      "https://media.example/api/danmu/abc123/raw",
    );
  });
  it.each([
    "file:///data/local",
    "ftp://media.example",
    "https://user:pass@media.example",
    "https://media.example?a=b",
    "https://media.example#frag",
    "not a url",
  ])("rejects unsafe base URL %s", (serverUrl) => {
    expect(buildDanmakuConfig({ ...input, serverUrl })).toBeUndefined();
  });
  it.each(["../foo", "a/b", "a?token=x", "a#b", "", "中文", "item%2fother"])(
    "rejects an invalid item ID %s",
    (itemId) => {
      expect(buildDanmakuConfig({ ...input, itemId })).toBeUndefined();
    },
  );
  it("uses a separate auth header so a reverse proxy can retain Basic auth", () => {
    const config = buildDanmakuConfig({
      ...input,
      customHeaders: {
        Authorization: "Basic synthetic",
        "X-Proxy-Key": "synthetic-key",
        "x-emby-token": "stale",
      },
    });
    expect(config?.headers).toEqual({
      Authorization: "Basic synthetic",
      "X-Proxy-Key": "synthetic-key",
      "X-Emby-Token": "synthetic-token",
    });
    expect(config?.serverUrl).not.toContain("synthetic-token");
  });
  it("rejects header injection and does not accept transport-control overrides", () => {
    const config = buildDanmakuConfig({
      ...input,
      customHeaders: {
        Host: "evil.example",
        "Content-Length": "1",
        "Accept-Encoding": "br",
        "Bad Name": "x",
        "X-Bad": "a\r\nb",
        "X-Good": "ok",
      },
    });
    expect(config?.headers).toEqual({
      "X-Good": "ok",
      "X-Emby-Token": "synthetic-token",
    });
    expect(
      buildDanmakuConfig({ ...input, accessToken: "bad\r\nvalue" }),
    ).toBeUndefined();
  });
  it.each([
    { offline: true },
    { isTV: true },
    { playMethod: "Transcode" },
    { playMethod: undefined },
    { userId: "" },
    { accessToken: "" },
    { itemType: "LiveTvChannel" },
    { itemType: "Audio" },
  ])("does not load unsupported content %p", (override) => {
    expect(buildDanmakuConfig({ ...input, ...override })).toBeUndefined();
  });
  it("allows Direct Stream and sends no stream-provided headers", () => {
    expect(
      buildDanmakuConfig({ ...input, playMethod: "DirectStream" })?.headers,
    ).toEqual({ "X-Emby-Token": "synthetic-token" });
  });
  it("keeps a disabled config so the in-player switch can re-enable it", () => {
    expect(
      buildDanmakuConfig({ ...input, settings: { enabled: false } })?.enabled,
    ).toBe(false);
  });
  it("never modifies shared header objects", () => {
    const customHeaders = Object.freeze({ "X-Test": "ok" });
    buildDanmakuConfig({ ...input, customHeaders });
    expect(customHeaders).toEqual({ "X-Test": "ok" });
  });
});

describe("danmaku settings", () => {
  it("fills absent persisted settings without migration", () => {
    expect(normalizeDanmakuSettings(undefined)).toEqual(DANMAKU_DEFAULTS);
    expect(normalizeDanmakuSettings({ opacity: 0.5 })).toEqual({
      ...DANMAKU_DEFAULTS,
      opacity: 0.5,
    });
  });
  it("clamps unsafe values and ignores NaN and Infinity", () => {
    expect(
      normalizeDanmakuSettings({
        fontScale: 9,
        opacity: -2,
        maxLines: 4.7,
        durationSeconds: Infinity,
        offsetSeconds: NaN,
      }),
    ).toEqual({
      ...DANMAKU_DEFAULTS,
      fontScale: 1.5,
      opacity: 0.3,
      maxLines: 5,
    });
    expect(
      normalizeDanmakuSettings({ maxLines: 999, offsetSeconds: -999 }).maxLines,
    ).toBe(8);
    expect(
      normalizeDanmakuSettings({ offsetSeconds: -999 }).offsetSeconds,
    ).toBe(-30);
  });
  it("preserves the sign of the media-time offset", () => {
    expect(normalizeDanmakuSettings({ offsetSeconds: 2.5 }).offsetSeconds).toBe(
      2.5,
    );
    expect(
      normalizeDanmakuSettings({ offsetSeconds: -2.5 }).offsetSeconds,
    ).toBe(-2.5);
  });
});
