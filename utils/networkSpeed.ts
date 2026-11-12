/** Decimal transfer units, not encoded media bitrate or playback rate. */
export function formatNetworkSpeed(
  bytesPerSecond: number | null | undefined,
): string | null {
  if (
    bytesPerSecond == null ||
    !Number.isFinite(bytesPerSecond) ||
    bytesPerSecond < 0
  )
    return null;
  if (bytesPerSecond >= 1_000_000)
    return `${(bytesPerSecond / 1_000_000).toFixed(1)} MB/s`;
  if (bytesPerSecond >= 1_000)
    return `${(bytesPerSecond / 1_000).toFixed(1)} KB/s`;
  return `${Math.round(bytesPerSecond)} B/s`;
}
