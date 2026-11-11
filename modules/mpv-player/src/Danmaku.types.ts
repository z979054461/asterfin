/** Credentials are ephemeral player input. Never persist or log this object. */
export interface DanmakuConfig {
  serverUrl: string;
  itemId: string;
  headers: Record<string, string>;
  enabled: boolean;
  /** Changing this value requests a fresh load, without touching the video. */
  retryKey?: number;
  fontScale: number;
  opacity: number;
  maxLines: number;
  durationSeconds: number;
  /** Positive values show a comment earlier; measured in media seconds. */
  offsetSeconds: number;
  labels: {
    loading: string;
    empty: string;
    unavailable: string;
    auth: string;
    error: string;
    ready: string;
    toggle: string;
    retry: string;
    settings?: string;
    enabled?: string;
    fontScale?: string;
    opacity?: string;
    maxLines?: string;
    durationSeconds?: string;
    offsetSeconds?: string;
    close?: string;
  };
}

export type DanmakuStatus =
  | "loading"
  | "empty"
  | "unavailable"
  | "auth"
  | "error"
  | "ready"
  | "disabled";
