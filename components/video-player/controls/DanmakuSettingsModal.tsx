import { useTranslation } from "react-i18next";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DanmakuSettings } from "@/components/settings/DanmakuSettings";

export function DanmakuSettingsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (Platform.isTV) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={t("common.close")}
          accessibilityRole='button'
        />
        <View style={styles.panel} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title}>{t("danmaku.settings")}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole='button'
              style={styles.close}
            >
              <Text style={styles.closeText}>{t("common.close")}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <DanmakuSettings compact />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  panel: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "100%",
    borderRadius: 16,
    backgroundColor: "#171717",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 8,
  },
  title: { color: "white", fontSize: 18, fontWeight: "600" },
  close: { padding: 16, minHeight: 48 },
  closeText: { color: "#c4b5fd", fontSize: 16 },
  content: { padding: 12 },
});
