import { DANMAKU_DEFAULTS, DANMAKU_LIMITS } from "@/constants/Danmaku";
import { adjustDanmakuSetting, type DanmakuNumberKey } from "./adjust";
import type { DanmakuSettings } from "./config";

it.each(Object.keys(DANMAKU_LIMITS) as DanmakuNumberKey[])(
  "clamps repeated remote clicks for %s without modifying other preferences",
  (key) => {
    let value: DanmakuSettings = { ...DANMAKU_DEFAULTS };
    const { min, max } = DANMAKU_LIMITS[key];
    for (let i = 0; i < 200; i++) value = adjustDanmakuSetting(value, key, 1);
    expect(value).toEqual({ ...DANMAKU_DEFAULTS, [key]: max });
    for (let i = 0; i < 200; i++) value = adjustDanmakuSetting(value, key, -1);
    expect(value).toEqual({ ...DANMAKU_DEFAULTS, [key]: min });
  },
);

it("preserves offset direction and fractional values without floating point drift", () => {
  expect(
    adjustDanmakuSetting(DANMAKU_DEFAULTS, "offsetSeconds", -1).offsetSeconds,
  ).toBe(-0.5);
  let value = adjustDanmakuSetting(DANMAKU_DEFAULTS, "fontScale", -1);
  value = adjustDanmakuSetting(value, "fontScale", -1);
  expect(value.fontScale).toBe(0.8);
});
