import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/common/Text";
import { DANMAKU_LIMITS } from "@/constants/Danmaku";
import { useScaledTVTypography } from "@/constants/TVTypography";
import { useSettings } from "@/utils/atoms/settings";
import {
  adjustDanmakuSetting,
  type DanmakuNumberKey,
} from "@/utils/danmaku/adjust";
import { normalizeDanmakuSettings } from "@/utils/danmaku/config";
import { scaleSize } from "@/utils/scaleSize";

export function TVDanmakuAction({
  label,
  text,
  onPress,
  preferred = false,
  disabled = false,
}: {
  label: string;
  text?: string;
  onPress: () => void;
  preferred?: boolean;
  disabled?: boolean;
}) {
  const typography = useScaledTVTypography();
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={label}
      disabled={disabled}
      focusable={!disabled}
      hasTVPreferredFocus={preferred && !disabled}
      onPress={onPress}
      style={({ focused }) => [
        styles.button,
        {
          backgroundColor: focused ? "white" : "rgba(255,255,255,0.12)",
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      {({ focused }) => (
        <Text
          style={{
            fontSize: typography.callout,
            color: focused ? "black" : "white",
          }}
        >
          {text ?? label}
        </Text>
      )}
    </Pressable>
  );
}

export function TVDanmakuSettings({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const typography = useScaledTVTypography();
  const { settings, updateSettings } = useSettings();
  const value = normalizeDanmakuSettings(settings.danmaku);
  const fields: { key: DanmakuNumberKey; label: string; suffix: string }[] = [
    { key: "fontScale", label: t("danmaku.font_scale"), suffix: "×" },
    { key: "opacity", label: t("danmaku.opacity"), suffix: "%" },
    { key: "maxLines", label: t("danmaku.max_lines"), suffix: "" },
    { key: "durationSeconds", label: t("danmaku.duration"), suffix: "s" },
    { key: "offsetSeconds", label: t("danmaku.offset"), suffix: "s" },
  ];
  return (
    <View style={styles.container}>
      {!compact && (
        <Text style={{ fontSize: typography.heading, color: "white" }}>
          {t("danmaku.title")}
        </Text>
      )}
      {!compact && (
        <Text style={{ fontSize: typography.callout, color: "#ccc" }}>
          {t("danmaku.description")}
        </Text>
      )}
      <TVDanmakuAction
        label={
          value.enabled ? `${t("danmaku.enabled")} ✓` : t("danmaku.disabled")
        }
        onPress={() =>
          updateSettings({ danmaku: { ...value, enabled: !value.enabled } })
        }
      />
      {fields.map(({ key, label, suffix }) => (
        <View key={key} style={styles.row}>
          <Text
            style={{ flex: 1, fontSize: typography.callout, color: "white" }}
          >
            {label}:{" "}
            {key === "opacity" ? Math.round(value[key] * 100) : value[key]}
            {suffix}
          </Text>
          <TVDanmakuAction
            text='−'
            label={`${label} −`}
            disabled={value[key] <= DANMAKU_LIMITS[key].min}
            onPress={() =>
              updateSettings({ danmaku: adjustDanmakuSetting(value, key, -1) })
            }
          />
          <TVDanmakuAction
            text='+'
            label={`${label} +`}
            disabled={value[key] >= DANMAKU_LIMITS[key].max}
            onPress={() =>
              updateSettings({ danmaku: adjustDanmakuSetting(value, key, 1) })
            }
          />
        </View>
      ))}
      <Text style={{ fontSize: typography.callout, color: "#ccc" }}>
        {t("danmaku.offset_hint")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: scaleSize(12),
    padding: scaleSize(12),
    overflow: "visible",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSize(12),
    overflow: "visible",
  },
  button: {
    borderRadius: scaleSize(10),
    minHeight: scaleSize(54),
    minWidth: scaleSize(100),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(10),
  },
});
