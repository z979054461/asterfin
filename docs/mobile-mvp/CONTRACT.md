# Four-platform danmaku integration contract (implementation work)

Base: Streamyfin v0.55.2 / 4917c6aad9fcbc08f2dfb075310f3e85182d780e.

New shared TypeScript `DanmakuConfig` in `modules/mpv-player/src/Danmaku.types.ts`:
```
{
  serverUrl: string; // exact configured Jellyfin base path, including reverse-proxy prefix
  itemId: string;
  headers: Record<string, string>; // current Jellyfin + explicitly scoped proxy headers
  enabled: boolean;
  fontScale: number; // 0.7 .. 1.5, default 1
  opacity: number; // 0.3 .. 1, default .85
  maxLines: number; // 1 .. 8, default 5
  durationSeconds: number; // 4 .. 12, default 8
  offsetSeconds: number; // -30 .. 30, positive shows earlier, default 0
  labels: { loading: string; empty: string; unavailable: string; auth: string; error: string; ready: string; toggle: string; retry: string; };
}
```
Native presentation PlayerConfig gets top-level `danmaku` optional object. Normal MPV view gets `danmakuConfigJson` prop (JSON string or empty); config changes must NOT reload video. The same contract covers Android, iOS, Android TV and tvOS. Android TV native fullscreen additionally samples ExoPlayer directly for DirectPlay/DirectStream. Omit config for offline, live TV, transcode (until absolute clock mapping is verified), or missing server/account/item. TV controls are native Compose/SwiftUI focus surfaces or a navigation-based React TV settings route, never mobile-only sliders forced onto a remote.

Native must build request URL from serverUrl + `/api/danmu/${encoded itemId}/raw`, preserving prefix. No arbitrary metadata URL or token query. For now accept only plain alphanumeric/hyphen/underscore item IDs, reject credentials/query/fragment in serverUrl. No redirects; streaming 8 MiB decompressed cap, 15s total timeout/cancel; strict UTF8, reject DTD/ENTITY, depth cap 8, <=20k records, <=300 Unicode codepoints text, modes 1/4/5. No XML/text/headers/token logging. Error affects overlay only.

Native 1) downloads/parse off main 2) lane plan with measured glyph width (disjoint rolling/top/bottom areas), only top 70% (reserve lower subtitles) 3) bounded active time window 4) draw uses actual renderer media clock, not 1Hz JS events; pause/buffer freezes, seek/load invalidates until real sample 5) load/dismiss/disable cancels and generation-fences late results 6) hide in background and PiP.

Default native controls: toggle and status, retry where useful. JS options live in a settings row and normal player toggle. Do not add dependencies or copy GPL TV code. Preserve upstream license.
