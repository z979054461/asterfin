import { DANMAKU_DEFAULTS } from "@/constants/Danmaku";
import { readNativeDanmakuSettings } from "./nativeSettings";

it("persists only appearance preferences, never credentials from native input", () => {
  expect(
    readNativeDanmakuSettings({
      ...DANMAKU_DEFAULTS,
      fontScale: 0.8,
      opacity: 0.5,
      serverUrl: "https://private.example",
      headers: { Authorization: "secret" },
    }),
  ).toEqual({ ...DANMAKU_DEFAULTS, fontScale: 0.8, opacity: 0.5 });
});

it("bounds native preferences like the global settings screen", () => {
  expect(
    readNativeDanmakuSettings({
      ...DANMAKU_DEFAULTS,
      maxLines: 50,
      fontScale: 0.1,
      offsetSeconds: -100,
    }),
  ).toEqual({
    ...DANMAKU_DEFAULTS,
    maxLines: 8,
    fontScale: 0.7,
    offsetSeconds: -30,
  });
});

it.each([
  null,
  undefined,
  {},
  { enabled: false },
  { ...DANMAKU_DEFAULTS, opacity: NaN },
  { ...DANMAKU_DEFAULTS, fontScale: "1" },
  { ...DANMAKU_DEFAULTS, enabled: "false" },
])(
  "ignores incomplete or malformed events rather than resetting saved values",
  (payload) => {
    expect(readNativeDanmakuSettings(payload)).toBeUndefined();
  },
);
