import { render, screen } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { stubReactNative } from "@/test-utils/reactNative";
import de from "@/translations/de-DE.json";
import en from "@/translations/en.json";
import zh from "@/translations/zh-CN.json";
import { IntroSheet } from "./IntroSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));
jest.mock("@gorhom/bottom-sheet", () => {
  const { View } = jest.requireActual("react-native");
  return {
    BottomSheetModal: View,
    BottomSheetScrollView: View,
    BottomSheetBackdrop: View,
  };
});
jest.mock("@/components/Button", () => ({
  Button: jest.requireActual("react-native").Text,
}));
jest.mock("@/components/common/Text", () => ({
  Text: jest.requireActual("react-native").Text,
}));
jest.mock("@/hooks/useAppRouter", () => () => ({ push: jest.fn() }));
jest.mock("@/utils/atoms/settings", () => ({
  useSettings: () => ({
    settings: { sentryEnabled: false },
    updateSettings: jest.fn(),
  }),
}));
jest.mock("@/utils/mmkv", () => ({ storage: { set: jest.fn() } }));

async function renderIntro(language: string) {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    fallbackLng: "en",
    resources: {
      en: { translation: en },
      de: { translation: de },
      "zh-CN": { translation: zh },
    },
  });
  await render(
    <I18nextProvider i18n={i18n}>
      <IntroSheet />
    </I18nextProvider>,
  );
}

test.each(["en", "zh-CN", "de", "unknown"])(
  "%s welcome uses the installed app name throughout",
  async (language) => {
    await renderIntro(language);
    expect(screen.queryAllByText(/Streamyfin/i)).toHaveLength(0);
    expect(screen.getAllByText(/Asterfin/).length).toBeGreaterThanOrEqual(3);
  },
);

test("English welcome explains default-off, opt-in crash reporting", async () => {
  await renderIntro("en");
  expect(screen.getByText(/Crash reporting is off by default/)).toBeTruthy();
  expect(screen.getByText(/only if you enable this option/)).toBeTruthy();
  expect(screen.getByText(/reporting service is configured/)).toBeTruthy();
});

test("Chinese welcome explains default-off crash reporting", async () => {
  await renderIntro("zh-CN");
  expect(screen.getByText(/崩溃报告默认关闭/)).toBeTruthy();
  expect(screen.getByText(/仅在你开启此选项且已配置报告服务时/)).toBeTruthy();
});

test("other locales fall back to accurate English telemetry copy", async () => {
  await renderIntro("de");
  expect(screen.getByText(/Crash reporting is off by default/)).toBeTruthy();
});

test.each([
  { OS: "ios" as const, isTV: false },
  { OS: "android" as const, isTV: false },
  { OS: "ios" as const, isTV: true },
  { OS: "android" as const, isTV: true },
])(
  "$OS TV=$isTV keeps welcome branding and platform features",
  async (platform) => {
    stubReactNative(platform);
    await renderIntro("zh-CN");
    expect(screen.queryAllByText(/Streamyfin/i)).toHaveLength(0);
    expect(screen.getByText(/崩溃报告默认关闭/)).toBeTruthy();
    expect(screen.queryByText("Chromecast") !== null).toBe(!platform.isTV);
  },
);
