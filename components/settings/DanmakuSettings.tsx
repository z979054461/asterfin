import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { SettingSwitch } from "@/components/common/SettingSwitch";
import { Text } from "@/components/common/Text";
import { Stepper } from "@/components/inputs/Stepper";
import { ListGroup } from "@/components/list/ListGroup";
import { ListItem } from "@/components/list/ListItem";
import { DANMAKU_LIMITS } from "@/constants/Danmaku";
import { useSettings } from "@/utils/atoms/settings";
import { normalizeDanmakuSettings } from "@/utils/danmaku/config";

export function DanmakuSettings() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const value = normalizeDanmakuSettings(settings.danmaku);
  if (Platform.isTV) return null;
  return (
    <ListGroup
      title={t("danmaku.title")}
      className='mb-4'
      description={
        <Text className='text-xs text-neutral-400'>
          {t("danmaku.description")} {t("danmaku.offset_hint")}
        </Text>
      }
    >
      <ListItem title={t("danmaku.enabled")}>
        <SettingSwitch
          accessibilityLabel={t("danmaku.enabled")}
          value={value.enabled}
          onValueChange={(enabled) =>
            updateSettings({ danmaku: { ...value, enabled } })
          }
        />
      </ListItem>
      <ListItem title={t("danmaku.font_scale")}>
        <Stepper
          value={value.fontScale}
          formatValue={(number) => number.toFixed(1)}
          {...DANMAKU_LIMITS.fontScale}
          onUpdate={(fontScale) =>
            updateSettings({
              danmaku: { ...value, fontScale: Number(fontScale.toFixed(1)) },
            })
          }
          appendValue='×'
        />
      </ListItem>
      <ListItem title={t("danmaku.opacity")}>
        <Stepper
          value={Math.round(value.opacity * 100)}
          min={30}
          max={100}
          step={5}
          onUpdate={(opacity) =>
            updateSettings({ danmaku: { ...value, opacity: opacity / 100 } })
          }
          appendValue='%'
        />
      </ListItem>
      <ListItem title={t("danmaku.max_lines")}>
        <Stepper
          value={value.maxLines}
          {...DANMAKU_LIMITS.maxLines}
          onUpdate={(maxLines) =>
            updateSettings({ danmaku: { ...value, maxLines } })
          }
        />
      </ListItem>
      <ListItem title={t("danmaku.duration")}>
        <Stepper
          value={value.durationSeconds}
          {...DANMAKU_LIMITS.durationSeconds}
          onUpdate={(durationSeconds) =>
            updateSettings({ danmaku: { ...value, durationSeconds } })
          }
          appendValue='s'
        />
      </ListItem>
      <ListItem title={t("danmaku.offset")}>
        <Stepper
          value={value.offsetSeconds}
          {...DANMAKU_LIMITS.offsetSeconds}
          onUpdate={(offsetSeconds) =>
            updateSettings({ danmaku: { ...value, offsetSeconds } })
          }
          appendValue='s'
        />
      </ListItem>
    </ListGroup>
  );
}
