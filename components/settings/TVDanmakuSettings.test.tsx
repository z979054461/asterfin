import { fireEvent, render, screen } from "@testing-library/react-native";
import { DANMAKU_DEFAULTS } from "@/constants/Danmaku";
import { TVDanmakuSettings } from "./TVDanmakuSettings";

const mockUpdateSettings = jest.fn();
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/constants/TVTypography", () => ({
  useScaledTVTypography: () => ({ callout: 20, heading: 24 }),
}));
jest.mock("@/utils/atoms/settings", () => ({
  useSettings: () => ({
    settings: {
      danmaku: jest.requireActual("@/constants/Danmaku").DANMAKU_DEFAULTS,
    },
    updateSettings: mockUpdateSettings,
  }),
}));

it("offers all six shared settings as remote-clickable buttons", async () => {
  await render(<TVDanmakuSettings compact />);
  await fireEvent.press(screen.getByLabelText("danmaku.enabled ✓"));
  expect(mockUpdateSettings).toHaveBeenLastCalledWith({
    danmaku: { ...DANMAKU_DEFAULTS, enabled: false },
  });
  for (const [label, field, value] of [
    ["font_scale", "fontScale", 1.1],
    ["opacity", "opacity", 0.9],
    ["max_lines", "maxLines", 6],
    ["duration", "durationSeconds", 9],
    ["offset", "offsetSeconds", 0.5],
  ]) {
    await fireEvent.press(screen.getByLabelText(`danmaku.${label} +`));
    expect(mockUpdateSettings).toHaveBeenLastCalledWith({
      danmaku: { ...DANMAKU_DEFAULTS, [field]: value },
    });
  }
});
