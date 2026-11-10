import { fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import { DanmakuButton } from "./DanmakuButton";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(() => jest.restoreAllMocks());

it("toggles enabled danmaku without navigating or restarting playback", async () => {
  const onToggle = jest.fn();
  await render(
    <DanmakuButton
      available
      enabled
      status='ready'
      onToggle={onToggle}
      onRetry={jest.fn()}
    />,
  );
  expect(screen.getByRole("switch").props.accessibilityState.checked).toBe(
    true,
  );
  await fireEvent.press(screen.getByLabelText("danmaku.title"));
  expect(onToggle).toHaveBeenCalledTimes(1);
});

it("explains unsupported playback instead of enabling a broken overlay", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const onToggle = jest.fn();
  await render(
    <DanmakuButton
      available={false}
      enabled={false}
      status='disabled'
      onToggle={onToggle}
      onRetry={jest.fn()}
    />,
  );
  await fireEvent.press(screen.getByRole("switch"));
  expect(onToggle).not.toHaveBeenCalled();
  expect(alert.mock.calls[0]?.[1]).toBe("danmaku.scope");
});

it("shows error and offers an explicit retry without changing the toggle", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const onToggle = jest.fn();
  const onRetry = jest.fn();
  await render(
    <DanmakuButton
      available
      enabled
      status='error'
      onToggle={onToggle}
      onRetry={onRetry}
    />,
  );
  expect(screen.getByText("!")).toBeTruthy();
  await fireEvent(screen.getByRole("switch"), "longPress");
  expect(alert.mock.calls[0]?.[1]).toBe("danmaku.error");
  alert.mock.calls[0]?.[2]
    ?.find((button) => button.text === "danmaku.retry")
    ?.onPress?.();
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(onToggle).not.toHaveBeenCalled();
});

it("does not offer retry while disabled", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(
    <DanmakuButton
      available
      enabled={false}
      status='error'
      onToggle={jest.fn()}
      onRetry={jest.fn()}
    />,
  );
  await fireEvent(screen.getByRole("switch"), "longPress");
  expect(alert.mock.calls[0]?.[1]).toBe("danmaku.disabled");
  expect(alert.mock.calls[0]?.[2]).toHaveLength(1);
});
