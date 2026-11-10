import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OFFICIAL_APPLICATION_IDS } from "./Sentry";

const { expo } = JSON.parse(
  readFileSync(join(__dirname, "..", "app.json"), "utf8"),
);

// Only builds carrying these identifiers, as they are or with the suffix a
// sideloading tool appends, report into the project's Sentry
// (utils/sentry.ts). The list is a constant and not a runtime read of the
// config so that a fork's rename does not move it, which means nothing but
// this test keeps it in step with the identifiers the project really ships.
// A fork that renames the app should leave the constant alone and point
// EXPO_PUBLIC_SENTRY_DSN at its own project.
describe("OFFICIAL_APPLICATION_IDS in a personal fork", () => {
  test("does not classify the personal iOS build as upstream", () => {
    expect(OFFICIAL_APPLICATION_IDS).not.toContain(expo.ios.bundleIdentifier);
  });
  test("does not classify the personal Android build as upstream", () => {
    expect(OFFICIAL_APPLICATION_IDS).not.toContain(expo.android.package);
  });
  test("retains the upstream identity for privacy classification", () => {
    expect(OFFICIAL_APPLICATION_IDS).toEqual([
      "com.fredrikburmester.streamyfin",
    ]);
  });
});
