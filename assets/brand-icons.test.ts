import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const config = JSON.parse(readFileSync(join(root, "app.json"), "utf8")).expo;
const tv = config.plugins.find(
  (plugin: unknown) =>
    Array.isArray(plugin) && plugin[0] === "@react-native-tvos/config-tv",
)[1];

function pngHeader(file: string) {
  const bytes = readFileSync(join(root, file));
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  };
}

test("iOS uses the opaque square Asterfin artwork, not the upstream Icon Composer asset", () => {
  expect(config.ios.icon).toBe(config.icon);
  expect(pngHeader(config.ios.icon)).toEqual({
    width: 1024,
    height: 1024,
    colorType: 2,
  });
});

test("Android adaptive and themed icons have transparent full-size foregrounds", () => {
  for (const file of [
    config.android.adaptiveIcon.foregroundImage,
    config.android.adaptiveIcon.monochromeImage,
  ]) {
    expect(pngHeader(file)).toEqual({
      width: 1024,
      height: 1024,
      colorType: 6,
    });
  }
  expect(config.android.adaptiveIcon.backgroundColor).toBe("#030823");
});

test("Android TV has a named banner and dedicated launcher icon", () => {
  expect(pngHeader(tv.androidTVBanner)).toEqual({
    width: 320,
    height: 180,
    colorType: 2,
  });
  expect(pngHeader(tv.androidTVIcon)).toEqual({
    width: 512,
    height: 512,
    colorType: 2,
  });
});

test.each([
  ["icon", 1280, 760],
  ["iconSmall", 400, 240],
  ["iconSmall2x", 800, 480],
  ["topShelf", 1920, 720],
  ["topShelf2x", 3840, 1440],
  ["topShelfWide", 2320, 720],
  ["topShelfWide2x", 4640, 1440],
])("tvOS %s meets native catalog dimensions", (name, width, height) => {
  expect(pngHeader(tv.appleTVImages[name])).toEqual({
    width,
    height,
    colorType: 2,
  });
});
