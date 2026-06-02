import type { VideoExportSettings } from '@/types';

// Calculate estimated file size for the configured export settings.
export function estimateFileSize(
  duration: number,
  settings: VideoExportSettings
): string {
  const bitrate = {
    low: 2_000_000,
    medium: 5_000_000,
    high: 10_000_000,
    ultra: 20_000_000,
  }[settings.quality];

  const sizeInBytes = (duration / 1000) * bitrate / 8;
  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB >= 1024) {
    return `${(sizeInMB / 1024).toFixed(2)} GB`;
  } else {
    return `${sizeInMB.toFixed(1)} MB`;
  }
}
