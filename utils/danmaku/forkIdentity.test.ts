import fs from "node:fs";
import path from "node:path";
import app from "../../app.json";
import eas from "../../eas.json";
import en from "../../translations/en.json";
import { danmakuZh } from "./zh";

it("keeps the personal build separate from upstream signing and services", () => {
  const config = app.expo;
  expect(config.name).toBe("Jellyfin Mobile Dev");
  expect(config.ios.bundleIdentifier).toBe(config.android.package);
  expect(config.ios.bundleIdentifier).not.toContain("fredrikburmester");
  expect(config.ios).not.toHaveProperty("appleTeamId");
  expect(config.extra).not.toHaveProperty("eas");
  expect(config).not.toHaveProperty("owner");
  expect(config.updates).toEqual({ enabled: false });
  expect(eas).not.toHaveProperty("submit");
  const sentry = fs.readFileSync(path.join(__dirname, "../sentry.ts"), "utf8");
  expect(sentry).toContain('process.env.EXPO_PUBLIC_SENTRY_DSN ?? ""');
});

it("ships matching English and Simplified Chinese fork strings", () => {
  expect(Object.keys(danmakuZh).sort()).toEqual(Object.keys(en.danmaku).sort());
  for (const text of Object.values(danmakuZh))
    expect(text.length).toBeGreaterThan(0);
});

it("keeps the renamed iOS download keeper aligned with its bundle", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../../modules/background-downloader/ios/DownloadContinuedProcessingKeeper.swift",
    ),
    "utf8",
  );
  expect(source).toContain("Bundle.main.bundleIdentifier");
  expect(source).not.toContain(
    'taskIdentifier = "com.fredrikburmester.streamyfin.downloads"',
  );
});
