import { describe, expect, it } from 'vitest';
import { getPicturePopupLayout } from './picturePopup';

describe('getPicturePopupLayout', () => {
  it('uses the standard preview placement when no export frame is active', () => {
    const layout = getPicturePopupLayout();

    expect(layout.isExportSafe).toBe(false);
    expect(layout.imageWidth).toBe(288);
    expect(layout.popupStyle).toEqual({
      right: 16,
      bottom: 16,
    });
  });

  it('pushes the popup inside the exported frame when crop bars are present', () => {
    const layout = getPicturePopupLayout({
      left: 0,
      right: 120,
      top: 0,
      bottom: 80,
      frameWidth: 720,
      frameHeight: 405,
    });

    expect(layout.isExportSafe).toBe(true);
    expect(layout.popupStyle.right).toBeGreaterThan(120);
    expect(layout.popupStyle.bottom).toBeGreaterThan(80);
    expect(layout.imageWidth).toBeLessThanOrEqual(288);
  });

  it('clamps popup width so narrow export frames still have a usable card', () => {
    const layout = getPicturePopupLayout({
      left: 0,
      right: 0,
      top: 100,
      bottom: 100,
      frameWidth: 230,
      frameHeight: 409,
    });

    expect(layout.imageWidth).toBe(200);
    expect(layout.popupStyle.maxWidth).toBe(220);
  });
});
