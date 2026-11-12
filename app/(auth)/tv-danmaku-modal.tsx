import { BlurView } from "expo-blur";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  AppState,
  ScrollView,
  StyleSheet,
  TVFocusGuideView,
  View,
} from "react-native";
import { Text } from "@/components/common/Text";
import {
  TVDanmakuAction,
  TVDanmakuSettings,
} from "@/components/settings/TVDanmakuSettings";
import { useScaledTVTypography } from "@/constants/TVTypography";
import useRouter from "@/hooks/useAppRouter";
import { useTVBackPress } from "@/hooks/useTVBackPress";
import { useSettings } from "@/utils/atoms/settings";
import { tvDanmakuModalAtom } from "@/utils/atoms/tvDanmakuModal";
import { normalizeDanmakuSettings } from "@/utils/danmaku/config";
import { scaleSize } from "@/utils/scaleSize";
import { store } from "@/utils/store";

/** A navigation route, never RN Modal: Back/Menu closes this before the player. */
export default function TVDanmakuModal() {
  const modal = useAtomValue(tvDanmakuModalAtom);
  const owner = useRef(modal?.sessionId);
  const closing = useRef(false);
  const router = useRouter();
  const { t } = useTranslation();
  const typography = useScaledTVTypography();
  const { settings } = useSettings();
  const enabled = normalizeDanmakuSettings(settings.danmaku).enabled;
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (store.get(tvDanmakuModalAtom)?.sessionId === owner.current) {
      store.set(tvDanmakuModalAtom, null);
    }
    router.back();
  }, [router]);
  useTVBackPress(() => {
    close();
    return true;
  }, [close]);
  useEffect(() => {
    if (!modal) close();
  }, [modal, close]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") close();
    });
    return () => {
      subscription.remove();
      if (store.get(tvDanmakuModalAtom)?.sessionId === owner.current) {
        store.set(tvDanmakuModalAtom, null);
      }
    };
  }, [close]);
  if (!modal) return null;
  const statusLabel = !modal.available
    ? t("danmaku.scope")
    : !enabled
      ? t("danmaku.disabled")
      : t(`danmaku.${modal.status}`);
  return (
    <View style={styles.background}>
      <BlurView intensity={80} tint='dark' style={styles.panel}>
        <TVFocusGuideView
          autoFocus
          trapFocusUp
          trapFocusDown
          trapFocusLeft
          trapFocusRight
          style={styles.focus}
        >
          <View style={styles.header}>
            <Text
              style={{ flex: 1, color: "white", fontSize: typography.heading }}
            >
              {t("danmaku.settings")}
            </Text>
            <TVDanmakuAction
              preferred
              label={t("common.close")}
              onPress={close}
            />
          </View>
          <Text
            accessibilityLiveRegion='polite'
            style={{ color: "#ddd", fontSize: typography.callout }}
          >
            {statusLabel}
          </Text>
          <ScrollView
            removeClippedSubviews={false}
            contentContainerStyle={styles.scroll}
          >
            <TVDanmakuSettings compact />
            {modal.available && enabled && (
              <TVDanmakuAction
                label={t("danmaku.retry")}
                onPress={() => modal.onRetry()}
              />
            )}
          </ScrollView>
        </TVFocusGuideView>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: scaleSize(50),
  },
  panel: {
    width: "95%",
    maxHeight: "95%",
    borderRadius: scaleSize(20),
    overflow: "hidden",
  },
  focus: { padding: scaleSize(24), gap: scaleSize(12), flexShrink: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: scaleSize(20) },
  scroll: { padding: scaleSize(12), gap: scaleSize(12) },
});
