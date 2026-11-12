/** Shared phone/TV preferences. These limits also exist in the native engines. */
export const DANMAKU_DEFAULTS = {
  enabled: true,
  fontScale: 1,
  opacity: 0.85,
  maxLines: 5,
  durationSeconds: 8,
  offsetSeconds: 0,
} as const;

export const DANMAKU_LIMITS = {
  fontScale: { min: 0.7, max: 1.5, step: 0.1 },
  opacity: { min: 0.3, max: 1, step: 0.05 },
  maxLines: { min: 1, max: 8, step: 1 },
  durationSeconds: { min: 4, max: 12, step: 1 },
  offsetSeconds: { min: -30, max: 30, step: 0.5 },
} as const;
