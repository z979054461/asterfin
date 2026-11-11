import type { TFunction } from "i18next";
import { APP_DISPLAY_NAME } from "@/constants/Branding";

// Fork-only copy stays outside the Crowdin-managed upstream catalogues.
const crashReportsDescription = {
  en: "Crash reporting is off by default. Reports are sent only if you enable this option and a reporting service is configured. You can turn this off here or anytime in settings.",
  "zh-CN":
    "崩溃报告默认关闭。仅在你开启此选项且已配置报告服务时，才会发送崩溃和错误报告。你可以在此处或随时在设置中关闭此选项。",
};

export const getIntroCopy = (t: TFunction, language?: string) => {
  const brand = (text: string) =>
    text.replace(/streamyfin/gi, APP_DISPLAY_NAME);
  return {
    welcome: brand(t("home.intro.welcome_to_streamyfin")),
    features: brand(t("home.intro.features_description")),
    crashReportsTitle: brand(t("home.intro.crash_reports_title")),
    // Never fall back to upstream's default-on claim for untranslated locales.
    crashReportsDescription:
      language === "zh-CN"
        ? crashReportsDescription["zh-CN"]
        : crashReportsDescription.en,
  };
};
