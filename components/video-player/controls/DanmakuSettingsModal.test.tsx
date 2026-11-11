import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { DANMAKU_DEFAULTS } from "@/constants/Danmaku";
import { stubReactNative } from "@/test-utils/reactNative";
import { DanmakuSettingsModal } from "./DanmakuSettingsModal";

const mockUpdateSettings = jest.fn();
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/utils/atoms/settings", () => ({
  useSettings: () => ({
    settings: {
      danmaku: {
        ...jest.requireActual("@/constants/Danmaku").DANMAKU_DEFAULTS,
      },
    },
    updateSettings: mockUpdateSettings,
  }),
}));

afterEach(() => {
  mockUpdateSettings.mockReset();
});

it("updates the stored settings immediately without leaving playback", async () => {
  const onClose = jest.fn();
  await render(<DanmakuSettingsModal visible onClose={onClose} />);
  expect(screen.getByText("danmaku.settings")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("danmaku.font_scale −"));
  expect(mockUpdateSettings).toHaveBeenLastCalledWith({
    danmaku: { ...DANMAKU_DEFAULTS, fontScale: 0.9 },
  });
  expect(onClose).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("danmaku.offset +"));
  expect(mockUpdateSettings).toHaveBeenLastCalledWith({
    danmaku: { ...DANMAKU_DEFAULTS, offsetSeconds: 0.5 },
  });
  await fireEvent.press(screen.getByText("common.close"));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("shows no settings content after dismissal and can reopen", async () => {
  const onClose = jest.fn();
  const view = await render(
    <DanmakuSettingsModal visible={false} onClose={onClose} />,
  );
  expect(screen.queryByText("danmaku.settings")).toBeNull();
  await view.rerender(<DanmakuSettingsModal visible onClose={onClose} />);
  expect(screen.getByText("danmaku.settings")).toBeTruthy();
  await view.rerender(
    <DanmakuSettingsModal visible={false} onClose={onClose} />,
  );
  expect(screen.queryByText("danmaku.settings")).toBeNull();
});

it("does not show unsupported TV settings", async () => {
  const previous = Platform.isTV;
  stubReactNative({ isTV: true });
  try {
    await render(<DanmakuSettingsModal visible onClose={jest.fn()} />);
    expect(screen.queryByText("danmaku.settings")).toBeNull();
  } finally {
    stubReactNative({ isTV: previous });
  }
});
