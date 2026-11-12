import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Provider } from "jotai";
import TVDanmakuModal from "@/app/(auth)/tv-danmaku-modal";
import { emitAppState, stubReactNative } from "@/test-utils/reactNative";
import { tvDanmakuModalAtom } from "@/utils/atoms/tvDanmakuModal";
import { store } from "@/utils/store";

const mockBack = jest.fn();
const mockRouter = { back: mockBack };
let mockBackHandler: () => boolean;
jest.mock("@/hooks/useAppRouter", () => ({
  __esModule: true,
  default: () => mockRouter,
}));
jest.mock("@/hooks/useTVBackPress", () => ({
  useTVBackPress: (handler: typeof mockBackHandler) => {
    mockBackHandler = handler;
  },
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("@/constants/TVTypography", () => ({
  useScaledTVTypography: () => ({ callout: 20, heading: 24 }),
}));
jest.mock("expo-blur", () => ({
  BlurView: jest.requireActual("react-native").View,
}));
jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  Object.defineProperty(actual, "TVFocusGuideView", {
    value: actual.View,
    configurable: true,
  });
  return actual;
});
jest.mock("@/utils/atoms/settings", () => ({
  useSettings: () => ({
    settings: {
      danmaku: jest.requireActual("@/constants/Danmaku").DANMAKU_DEFAULTS,
    },
    updateSettings: jest.fn(),
  }),
}));

beforeEach(() => {
  stubReactNative({ isTV: true });
  mockBack.mockClear();
  store.set(tvDanmakuModalAtom, {
    sessionId: "test",
    available: true,
    status: "error",
    onRetry: jest.fn(),
  });
});

it("shows live status, retries without dismissing, and handles repeated Back/Close once", async () => {
  await render(
    <Provider store={store}>
      <TVDanmakuModal />
    </Provider>,
  );
  expect(screen.getByText("danmaku.error")).toBeTruthy();
  const retry = store.get(tvDanmakuModalAtom)?.onRetry;
  await fireEvent.press(screen.getByLabelText("danmaku.retry"));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(mockBack).not.toHaveBeenCalled();
  await act(() =>
    store.set(
      tvDanmakuModalAtom,
      (current) => current && { ...current, status: "ready" },
    ),
  );
  expect(screen.getByText("danmaku.ready")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("common.close"));
  await act(() => {
    expect(mockBackHandler()).toBe(true);
  });
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(store.get(tvDanmakuModalAtom)).toBeNull();
});

it("closes safely when media changes or the app backgrounds", async () => {
  const view = await render(
    <Provider store={store}>
      <TVDanmakuModal />
    </Provider>,
  );
  await act(() => emitAppState("background"));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(store.get(tvDanmakuModalAtom)).toBeNull();
  await view.unmount();
  store.set(tvDanmakuModalAtom, {
    sessionId: "next",
    available: false,
    status: "loading",
    onRetry: jest.fn(),
  });
  await render(
    <Provider store={store}>
      <TVDanmakuModal />
    </Provider>,
  );
  expect(screen.getByText("danmaku.scope")).toBeTruthy();
  expect(screen.queryByLabelText("danmaku.retry")).toBeNull();
  await act(() => store.set(tvDanmakuModalAtom, null));
  expect(mockBack).toHaveBeenCalledTimes(2);
});
