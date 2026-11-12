// Packaging only: resize the approved artwork into native platform assets.
// Run with Node and Sharp 0.34.x available: node scripts/brand/generate-icons.cjs
const sharp = require("sharp");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const dir = path.join(root, "assets/images");
const source = path.join(root, "assets/brand/asterfin-blue-purple-source.png");
const symbol = path.join(root, "assets/brand/asterfin-blue-purple-symbol.png");
const bg = "#030823";
async function square(name, size) {
  await sharp(source)
    .resize(size, size)
    .flatten({ background: bg })
    .removeAlpha()
    .png()
    .toFile(path.join(dir, name));
}
async function landscape(name, width, height, label = false) {
  const side = Math.round(height * (label ? 0.88 : 1));
  const art = await sharp(symbol).resize(side, side).png().toBuffer();
  const layers = [
    {
      input: art,
      left: label ? Math.round(width * 0.04) : Math.round((width - side) / 2),
      top: Math.round((height - side) / 2),
    },
  ];
  if (label) {
    const svg = `<svg width="${width}" height="${height}"><text x="${width * 0.49}" y="${height * 0.56}" font-family="DejaVu Sans,sans-serif" font-size="${height * 0.15}" font-weight="600" fill="white">Asterfin</text></svg>`;
    layers.push({ input: Buffer.from(svg) });
  }
  await sharp({ create: { width, height, channels: 3, background: bg } })
    .composite(layers)
    .removeAlpha()
    .png()
    .toFile(path.join(dir, name));
}
(async () => {
  await square("icon.png", 1024);
  await square("icon-android-tv.png", 512);
  await sharp(symbol)
    .resize(1024)
    .png()
    .toFile(path.join(dir, "icon-ios-plain.png"));
  // The symbol stays inside Android adaptive-icon mask safe bounds.
  const foreground = await sharp(symbol).resize(850).png().toBuffer();
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: "#00000000" },
  })
    .composite([{ input: foreground, left: 87, top: 87 }])
    .png()
    .toFile(path.join(dir, "icon-android-plain.png"));
  const { data, info } = await sharp(path.join(dir, "icon-android-plain.png"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
  }
  await sharp(data, { raw: info })
    .png()
    .toFile(path.join(dir, "icon-android-themed.png"));
  await sharp(data, { raw: info })
    .resize(96)
    .png()
    .toFile(path.join(dir, "notification.png"));
  for (const [name, w, h] of [
    ["icon-tvos.png", 1280, 760],
    ["icon-tvos-small.png", 400, 240],
    ["icon-tvos-small-2x.png", 800, 480],
    ["icon-tvos-topshelf.png", 1920, 720],
    ["icon-tvos-topshelf-2x.png", 3840, 1440],
    ["icon-tvos-topshelf-wide.png", 2320, 720],
    ["icon-tvos-topshelf-wide-2x.png", 4640, 1440],
  ])
    await landscape(name, w, h);
  await landscape("icon-android-tv-banner.png", 320, 180, true);
})();
