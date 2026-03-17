export interface PicturePopupExportFrame {
  left: number;
  right: number;
  top: number;
  bottom: number;
  frameWidth: number;
  frameHeight: number;
}

export interface PicturePopupLayout {
  imageWidth: number;
  imageHeight: number;
  isExportSafe: boolean;
  popupStyle: {
    right: number;
    bottom: number;
    maxWidth?: number;
  };
}

export function getPicturePopupLayout(
  exportFrame?: PicturePopupExportFrame | null
): PicturePopupLayout {
  const imageWidth = exportFrame
    ? Math.max(200, Math.min(288, exportFrame.frameWidth * 0.32))
    : 288;
  const imageHeight = Math.round(imageWidth * (52 / 72));
  const popupOffset = exportFrame
    ? Math.max(12, Math.min(20, exportFrame.frameWidth * 0.02))
    : 16;

  return {
    imageWidth,
    imageHeight,
    isExportSafe: Boolean(exportFrame),
    popupStyle: exportFrame
      ? {
          right: exportFrame.right + popupOffset,
          bottom: exportFrame.bottom + popupOffset,
          maxWidth: Math.max(220, Math.min(exportFrame.frameWidth - 24, imageWidth + 80)),
        }
      : {
          right: popupOffset,
          bottom: popupOffset,
        },
  };
}
