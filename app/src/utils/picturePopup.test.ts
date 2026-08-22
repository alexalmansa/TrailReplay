import { describe, expect, it } from 'vitest';
import { getPicturePopupLayout } from './picturePopup';

describe('getPicturePopupLayout', () => {
  it('centers a near-fullscreen box in the map container when no export frame is active', () => {
    const layout = getPicturePopupLayout();

    expect(layout.isExportSafe).toBe(false);
    expect(layout.imageBoxWidth).toBe('97%');
    expect(layout.imageBoxHeight).toBe('95%');
    expect(layout.popupStyle).toEqual({
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    });
  });

  it('centers a near-fullscreen box inside the exported crop frame, in CSS px', () => {
    const layout = getPicturePopupLayout({
      left: 0,
      right: 120,
      top: 0,
      bottom: 80,
      frameWidth: 720,
      frameHeight: 405,
    });

    expect(layout.isExportSafe).toBe(true);
    expect(layout.imageBoxWidth).toBe(720 * 0.97);
    expect(layout.imageBoxHeight).toBe(405 * 0.95);
    expect(layout.popupStyle).toEqual({
      left: 360,
      top: 202.5,
      transform: 'translate(-50%, -50%)',
    });
  });

  it('accounts for asymmetric crop bars when centering', () => {
    const layout = getPicturePopupLayout({
      left: 40,
      right: 0,
      top: 100,
      bottom: 100,
      frameWidth: 230,
      frameHeight: 409,
    });

    expect(layout.popupStyle.left).toBe(40 + 230 / 2);
    expect(layout.popupStyle.top).toBe(100 + 409 / 2);
  });
});
