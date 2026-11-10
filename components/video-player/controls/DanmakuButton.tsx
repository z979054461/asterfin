import { useTranslation } from "react-i18next";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import type { DanmakuStatus } from "@/modules/mpv-player/src/Danmaku.types";

interface Props {
  available: boolean;
  enabled: boolean;
  status: DanmakuStatus;
  onToggle: () => void;
  onRetry: () => void;
}

export function DanmakuButton({
  available,
  enabled,
  status,
  onToggle,
  onRetry,
}: Props) {
  const { t } = useTranslation();
  const statusLabel = !available
    ? t("danmaku.scope")
    : !enabled
      ? t("danmaku.disabled")
      : t(`danmaku.${status}`);
  const showDetails = () =>
    Alert.alert(t("danmaku.title"), statusLabel, [
      { text: t("common.close"), style: "cancel" },
      ...(available && enabled
        ? [{ text: t("danmaku.retry"), onPress: onRetry }]
        : []),
    ]);
  const failed =
    available && enabled && ["error", "auth", "unavailable"].includes(status);
  return (
    <Pressable
      accessibilityRole='switch'
      accessibilityState={{ checked: enabled && available }}
      accessibilityLabel={t("danmaku.title")}
      accessibilityHint={statusLabel}
      onPress={available ? onToggle : showDetails}
      onLongPress={showDetails}
      hitSlop={8}
      style={[
        styles.button,
        enabled && available && styles.active,
        failed && styles.failed,
      ]}
    >
      <Text style={styles.text}>{t("danmaku.title")}</Text>
      {failed ? <Text style={styles.warning}>!</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffffff40",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginLeft: 8,
  },
  active: { backgroundColor: "#ffffff24", borderColor: "#ffffffb0" },
  failed: { borderColor: "#fbbf24" },
  text: { fontSize: 12, fontWeight: "600", color: "white" },
  warning: { color: "#fbbf24", marginLeft: 4 },
});
