import { Platform, StyleSheet, View } from "react-native";
import { Text } from "@/components/common/Text";
import { useScaledTVTypography } from "@/constants/TVTypography";
import { useControlsSafeAreaInsets } from "@/hooks/useControlsSafeAreaInsets";

/** Non-interactive: does not take touches or TV focus away from player controls. */
export function NetworkSpeedOverlay({
  text,
  buffering,
  showControls,
}: {
  text: string | null;
  buffering: boolean;
  showControls: boolean;
}) {
  const insets = useControlsSafeAreaInsets();
  const typography = useScaledTVTypography();
  if (!text) return null;
  const fontSize = Platform.isTV ? typography.callout : 14;
  return (
    <View
      pointerEvents='none'
      style={[StyleSheet.absoluteFill, { zIndex: 15 }]}
    >
      {showControls && (
        <Text
          accessibilityLabel={`Network speed ${text}`}
          style={{
            position: "absolute",
            top: insets.top + (Platform.isTV ? 32 : 62),
            right: insets.right + 24,
            color: "white",
            fontSize,
            fontVariant: ["tabular-nums"],
            backgroundColor: "rgba(0,0,0,0.55)",
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
          }}
        >
          {text}
        </Text>
      )}
      {buffering && (
        <View
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            marginTop: 36,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: Platform.isTV ? typography.body : 20,
              fontWeight: "600",
              fontVariant: ["tabular-nums"],
              backgroundColor: "rgba(0,0,0,0.55)",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 6,
            }}
          >
            {text}
          </Text>
        </View>
      )}
    </View>
  );
}
