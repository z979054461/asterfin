# Asterfin icon

The blue-purple ribbon is the Asterfin app mark. Native assets are generated from
`asterfin-blue-purple-source.png` (opaque square) and
`asterfin-blue-purple-symbol.png` (transparent symbol).

`node scripts/brand/generate-icons.cjs` regenerates the platform PNGs when
Sharp 0.34.x is available in the Node environment. No credentials are needed.

- iOS: opaque 1024px square; the system applies its own corner mask.
- Android: transparent adaptive foreground, monochrome themed icon, navy background.
- Android TV: 512px icon and 320×180 banner with the application name.
- tvOS: native icon and top-shelf dimensions, preserving the symbol's aspect ratio.
- Login and launch screens reuse the transparent symbol; notifications use its silhouette.

`assets/brand-icons.test.ts` validates the configured asset dimensions and formats.
Artwork previews are not device screenshots; launcher and TV focus appearance
still need validation on real devices.
