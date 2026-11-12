import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { NETWORK_SPEED_POLL_INTERVAL } from "@/constants/Playback";
import type { TechnicalInfo } from "@/modules/mpv-player";
import { formatNetworkSpeed } from "@/utils/networkSpeed";

/** Serial reads; late results from another stream or an unmounted screen are ignored. */
export function useNetworkSpeed(
  getInfo: (() => Promise<TechnicalInfo>) | undefined,
  enabled: boolean,
  streamKey: string,
) {
  const [sample, setSample] = useState<{
    key: string;
    text: string | null;
  } | null>(null);
  useEffect(() => {
    setSample(null);
    if (!enabled || !getInfo) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      let text: string | null = null;
      if (AppState.currentState === "active") {
        try {
          text = formatNetworkSpeed((await getInfo()).networkBytesPerSecond);
        } catch {
          /* unavailable, never reuse a stale speed */
        }
      }
      if (cancelled) return;
      setSample({ key: streamKey, text });
      timer = setTimeout(poll, NETWORK_SPEED_POLL_INTERVAL);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, getInfo, streamKey]);
  return enabled && sample?.key === streamKey ? sample.text : null;
}
