import fs from "node:fs";
import path from "node:path";
import app from "../../app.json";
import eas from "../../eas.json";
import en from "../../translations/en.json";
import { danmakuZh } from "./zh";

it("keeps the personal build separate from upstream signing and services", () => {
  const config = app.expo;
  expect(config.name).toBe("Asterfin");
  expect(config.ios.bundleIdentifier).toBe("app.bluuuue.asterfin");
  expect(config.slug).toBe("asterfin");
  expect(config.scheme).toBe("asterfin");
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

it("keeps the renamed app and its iOS compile workflow aligned", () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, "../../.github/workflows/ios-app-check.yml"),
    "utf8",
  );
  expect(workflow).toContain("ios/Asterfin.xcworkspace");
  expect(workflow).toContain("-scheme Asterfin");
  // biome-ignore lint/suspicious/noTemplateCurlyInString: Literal GitHub Actions expression.
  expect(workflow).toContain("Release-${{ matrix.sdk }}/Asterfin.app");
  expect(workflow).toContain("sdk: iphoneos");
  expect(workflow).toContain("sdk: appletvos");
  // biome-ignore lint/suspicious/noTemplateCurlyInString: Literal GitHub Actions expression.
  expect(workflow).toContain("EXPO_TV: ${{ matrix.tv }}");
  expect(workflow).not.toContain("JellyfinMobileDev");
});

it("keeps signing scoped to the same repository across its rename", () => {
  const workflow = fs.readFileSync(
    path.join(
      __dirname,
      "../../.github/workflows/android-signing-preflight.yml",
    ),
    "utf8",
  );
  expect(workflow).toContain("github.repository_id == '1451291617'");
  expect(workflow).toContain("github.ref == 'refs/heads/mobile-dev'");
  expect(workflow).toContain(
    'private static final String ALIAS = "jellyfin-mobile-dev"',
  );
  expect(workflow).not.toContain("z979054461/jellyfin-mobile");
});

it("does not identify the fork as the upstream client or app-store release", () => {
  const provider = fs.readFileSync(
    path.join(__dirname, "../../providers/JellyfinProvider.tsx"),
    "utf8",
  );
  expect(provider).toContain(`Client="\${APP_DISPLAY_NAME}"`);
  expect(provider).not.toContain('Client="Streamyfin"');
  const capabilities = fs.readFileSync(
    path.join(__dirname, "../../providers/WebSocketProvider.tsx"),
    "utf8",
  );
  expect(capabilities).not.toContain("id6593660679");
  expect(capabilities).not.toContain("streamyfin-client-badge.png");
});

it("localizes the launcher name without changing the native target name", () => {
  expect(app.expo.ios.infoPlist.CFBundleAllowMixedLocalizations).toBe(true);
  for (const [language, name] of [
    ["en", "Asterfin"],
    ["zh", "星幕"],
  ]) {
    const file = language === "en" ? app.expo.locales.en : app.expo.locales.zh;
    const metadata = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../..", file), "utf8"),
    );
    expect(metadata.ios.CFBundleDisplayName).toBe(name);
    expect(metadata.android.app_name).toBe(name);
  }
});
