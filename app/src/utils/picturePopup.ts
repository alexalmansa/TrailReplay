export interface PicturePopupExportFrame {
  left: number;
  right: number;
  top: number;
  bottom: number;
  frameWidth: number;
  frameHeight: number;
}

export interface PicturePopupLayout {
  imageBoxWidth: number | string;
  imageBoxHeight: number | string;
  isExportSafe: boolean;
  popupStyle: {
    left: string | number;
    top: string | number;
    transform: string;
  };
}

/**
 * Sizes and centers the picture popup as a near-fullscreen, full-bleed
 * overlay (the image box is filled edge-to-edge via object-fit: cover, no
 * letterboxing). When an `exportFrame` is known (export preview /
 * deterministic export), the box is measured against the visible crop area
 * in CSS px so it stays inside the export aspect ratio. Otherwise it's
 * centered in the map container using percentages, since the popup's parent
 * already fills that container.
 */
export function getPicturePopupLayout(
  exportFrame?: PicturePopupExportFrame | null
): PicturePopupLayout {
  if (exportFrame) {
    const frameCenterX = exportFrame.left + exportFrame.frameWidth / 2;
    const frameCenterY = exportFrame.top + exportFrame.frameHeight / 2;

    return {
      imageBoxWidth: exportFrame.frameWidth * 0.97,
      imageBoxHeight: exportFrame.frameHeight * 0.95,
      isExportSafe: true,
      popupStyle: {
        left: frameCenterX,
        top: frameCenterY,
        transform: 'translate(-50%, -50%)',
      },
    };
  }

  return {
    imageBoxWidth: '97%',
    imageBoxHeight: '95%',
    isExportSafe: false,
    popupStyle: {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    },
  };
}
