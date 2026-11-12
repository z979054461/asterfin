import { renderHook } from "@testing-library/react-native";
import type { HWEvent } from "react-native";
import { useRemoteControl } from "./useRemoteControl";

jest.mock("react-native-reanimated", () => ({
  useSharedValue: (value: unknown) => ({ value }),
}));

let mockEvent: (event: HWEvent) => void;
let mockBack: () => boolean;
jest.mock("@/hooks/useTVEventHandler", () => ({
  useTVEventHandler: (callback: typeof mockEvent) => {
    mockEvent = callback;
  },
}));
jest.mock("@/hooks/useTVBackPress", () => ({
  useTVBackPress: (callback: typeof mockBack) => {
    mockBack = callback;
  },
}));
jest.mock("@/i18n", () => ({ t: (key: string) => key }));

it("does not seek, pause, hide controls or exit while the TV settings route owns the remote", async () => {
  const seek = jest.fn();
  const pause = jest.fn();
  const hide = jest.fn();
  const view = await renderHook(
    ({ blocked }) =>
      useRemoteControl({
        disableSeeking: blocked,
        showControls: true,
        toggleControls: jest.fn(),
        togglePlay: pause,
        onHideControls: hide,
        isProgressBarFocused: true,
        onSeekLeft: seek,
        onLongSeekLeftStart: seek,
      }),
    { initialProps: { blocked: true } },
  );
  mockEvent({ eventType: "left" });
  mockEvent({ eventType: "longLeft", eventKeyAction: 0 });
  mockEvent({ eventType: "playPause" });
  expect(mockBack()).toBe(false);
  expect(seek).not.toHaveBeenCalled();
  expect(pause).not.toHaveBeenCalled();
  expect(hide).not.toHaveBeenCalled();
  await view.rerender({ blocked: false });
  mockEvent({ eventType: "left" });
  mockEvent({ eventType: "playPause" });
  expect(mockBack()).toBe(true);
  expect(seek).toHaveBeenCalledTimes(1);
  expect(pause).toHaveBeenCalledTimes(1);
  expect(hide).toHaveBeenCalledTimes(1);
});
