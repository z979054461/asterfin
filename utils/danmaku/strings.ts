import type { TFunction } from "i18next";
import type { DanmakuConfig } from "@/modules/mpv-player/src/Danmaku.types";

export function buildDanmakuLabels(t: TFunction): DanmakuConfig["labels"] {
  return {
    loading: t("danmaku.loading"),
    empty: t("danmaku.empty"),
    unavailable: t("danmaku.unavailable"),
    auth: t("danmaku.auth"),
    error: t("danmaku.error"),
    ready: t("danmaku.ready"),
    toggle: t("danmaku.title"),
    retry: t("danmaku.retry"),
  };
}
