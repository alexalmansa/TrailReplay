import type { AspectRatio } from '@/types';

export type CropPreviewMetrics = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  frameLeft: number;
  frameTop: number;
  frameWidth: number;
  frameHeight: number;
};

export type CropRegion = {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
};

export function getAspectRatioValue(ratio: AspectRatio) {
  if (ratio === '16:9') return 16 / 9;
  if (ratio === '1:1') return 1;
  return 9 / 16;
}

export function getCropPreviewMetrics(
  width: number,
  height: number,
  ratio: AspectRatio
): CropPreviewMetrics {
  const containerAspect = width / height;
  const targetAspect = getAspectRatioValue(ratio);

  if (containerAspect > targetAspect) {
    const cropW = height * targetAspect;
    const bar = (width - cropW) / 2;
    return {
      left: bar,
      right: bar,
      top: 0,
      bottom: 0,
      frameLeft: bar,
      frameTop: 0,
      frameWidth: cropW,
      frameHeight: height,
    };
  }

  const cropH = width / targetAspect;
  const bar = (height - cropH) / 2;
  return {
    left: 0,
    right: 0,
    top: bar,
    bottom: bar,
    frameLeft: 0,
    frameTop: bar,
    frameWidth: width,
    frameHeight: cropH,
  };
}

export function getCropRegion(
  containerRect: { width: number; height: number },
  recordW: number,
  recordH: number
): CropRegion {
  const targetAspect = recordW / recordH;
  const containerAspect = containerRect.width / containerRect.height;
  let cropX = 0;
  let cropY = 0;
  let cropW = containerRect.width;
  let cropH = containerRect.height;

  if (targetAspect < containerAspect - 0.01) {
    cropW = containerRect.height * targetAspect;
    cropX = (containerRect.width - cropW) / 2;
  } else if (targetAspect > containerAspect + 0.01) {
    cropH = containerRect.width / targetAspect;
    cropY = (containerRect.height - cropH) / 2;
  }

  return { cropX, cropY, cropW, cropH };
}
