// Dependency-free release identity preflight. Never reads signing credentials.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const config = JSON.parse(read("app.json")).expo;
const identity = "app.bluuuue.asterfin";
assert.equal(config.ios.bundleIdentifier, identity);
assert.equal(config.android.package, identity);
assert.equal(config.scheme, "asterfin");
assert.equal(config.slug, "asterfin");
assert.equal(config.version, "0.1.0");
assert.equal(config.android.versionCode, 3);
assert.equal(config.ios.buildNumber, "3");
assert.equal(config.name, "Asterfin");
assert.equal(config.ios.infoPlist.CFBundleAllowMixedLocalizations, true);
for (const [language, display] of [
  ["en", "Asterfin"],
  ["zh", "星幕"],
]) {
  const metadata = JSON.parse(read(config.locales[language]));
  assert.equal(metadata.ios.CFBundleDisplayName, display);
  assert.equal(metadata.android.app_name, display);
}
for (const file of [
  "utils/tvDiscovery/payload.ts",
  "modules/tv-recommendations/android/src/main/java/expo/modules/tvrecommendations/TvRecommendationsPublisher.kt",
]) {
  assert.ok(read(file).includes("asterfin://"), file);
  assert.ok(!read(file).includes("streamyfin://"), file);
}
for (const [file, extension, group] of [
  ["plugins/withTVOSTopShelf.ts", "tvtopshelf", "tvtopshelf"],
  ["plugins/withDownloadLiveActivity.ts", "downloadactivity", "downloads"],
]) {
  const source = read(file);
  assert.ok(
    source.includes('config.ios?.bundleIdentifier || "' + identity + '"'),
    file,
  );
  assert.ok(source.includes("`${bundleIdentifier}." + extension + "`"), file);
  assert.ok(
    source.includes("`group.${getBundleIdentifier(config)}." + group + "`"),
    file,
  );
}
for (const file of [
  ".github/workflows/ios-app-check.yml",
  ".github/workflows/native-checks.yml",
  ".github/workflows/android-private-test.yml",
  ".github/workflows/android-tv-private-test.yml",
  "scripts/ios/package-personal-test.py",
]) {
  assert.ok(read(file).includes(identity), file);
  assert.ok(!read(file).includes("org.personal.jellyfinmobile.dev"), file);
}
// A supplied Firebase config must belong to this app, not the upstream project.
// No file is provisioned or modified; print neither client IDs nor API keys.
if (process.env.GOOGLE_SERVICES_JSON) {
  const google = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SERVICES_JSON, "utf8"),
  );
  assert.ok(
    google.client?.some(
      (client) =>
        client.client_info?.android_client_info?.package_name === identity,
    ),
    "Supplied Firebase config does not contain the Asterfin Android application ID",
  );
}
console.log(
  "PASS: branded IDs, localized launcher names, TV URLs and release verifier identity",
);
