import { useCallback, useEffect, useRef, useState } from 'react';
import type { PictureAnnotation } from '@/types';
import { useI18n } from '@/i18n/useI18n';
import {
  getPicturePopupLayout,
  type PicturePopupExportFrame,
} from '@/utils/picturePopup';
import { MapPin, Calendar } from 'lucide-react';

interface PicturePopupProps {
  picture: PictureAnnotation;
  onClose?: () => void;
  exportFrame?: PicturePopupExportFrame | null;
  playbackCurrentTime?: number;
}

type AnimationPhase = 'entering' | 'visible' | 'exiting';

// How long the "fake zoom" grows in / shrinks out. Kept shorter than
// `displayDuration` so there's always a visible "visible" hold in between.
const ZOOM_ENTER_MS = 450;
const ZOOM_EXIT_MS = 350;

function getAnimationPhase(elapsed: number, displayDuration: number): AnimationPhase {
  if (elapsed < ZOOM_ENTER_MS) return 'entering';
  if (elapsed > displayDuration - ZOOM_EXIT_MS) return 'exiting';
  return 'visible';
}

export function PicturePopup({ picture, onClose, exportFrame, playbackCurrentTime }: PicturePopupProps) {
  const { t } = useI18n();
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('entering');
  const [displayProgress, setDisplayProgress] = useState(0);
  const [imageSrc, setImageSrc] = useState(picture.url);
  const progressIntervalRef = useRef<number | null>(null);
  const fallbackImageUrlRef = useRef<string | null>(null);
  const playbackPopupStartTimeRef = useRef<number | null>(null);
  const hasClosedRef = useRef(false);

  const displayDuration = picture.displayDuration || 5000;
  const { imageBoxWidth, imageBoxHeight, isExportSafe, popupStyle } = getPicturePopupLayout(exportFrame);

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current !== null) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const requestClose = useCallback(() => {
    if (hasClosedRef.current) return;
    hasClosedRef.current = true;
    clearProgressInterval();
    onClose?.();
  }, [clearProgressInterval, onClose]);

  // Wall-clock path: drives the live preview when playback isn't a
  // deterministic export. Ticks on an interval instead of currentTime.
  useEffect(() => {
    if (playbackCurrentTime !== undefined) return;

    const startTime = Date.now();
    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / displayDuration) * 100, 100);
      setDisplayProgress(progress);
      setAnimationPhase(getAnimationPhase(elapsed, displayDuration));

      if (elapsed >= displayDuration) {
        requestClose();
      }
    }, 50);

    return () => {
      clearProgressInterval();
      if (fallbackImageUrlRef.current !== null) {
        URL.revokeObjectURL(fallbackImageUrlRef.current);
      }
    };
  }, [clearProgressInterval, displayDuration, playbackCurrentTime, requestClose]);

  // Deterministic-export path: driven off the replay clock so the zoom
  // animation bakes into exported frames instead of jumping straight to
  // "visible" the way the previous implementation did.
  useEffect(() => {
    if (playbackCurrentTime === undefined) return;

    if (playbackPopupStartTimeRef.current === null) {
      playbackPopupStartTimeRef.current = playbackCurrentTime;
    }

    const elapsed = Math.max(0, playbackCurrentTime - playbackPopupStartTimeRef.current);
    const progress = Math.min((elapsed / displayDuration) * 100, 100);
    setDisplayProgress(progress);
    setAnimationPhase(getAnimationPhase(elapsed, displayDuration));

    if (elapsed >= displayDuration) {
      requestClose();
    }
  }, [displayDuration, playbackCurrentTime, requestClose]);

  const getAnimationClasses = () => {
    switch (animationPhase) {
      case 'entering':
        return 'opacity-0 scale-[0.15]';
      case 'visible':
        return 'opacity-100 scale-100';
      case 'exiting':
        return 'opacity-0 scale-[0.85]';
      default:
        return '';
    }
  };

  return (
    <div className="absolute z-[200]" style={{ ...popupStyle, width: imageBoxWidth, height: imageBoxHeight }}>
      {/* Near-fullscreen box: fills the sized wrapper above, rounded,
          overflow-hidden. object-contain keeps the whole photo visible
          (never cropped) regardless of its aspect ratio vs. the box's — any
          letterbox gap is transparent, showing the map behind it, rather
          than a solid fill. This box also carries the "fake zoom"
          scale/opacity transition.
          Note: the size lives on the *outer* wrapper (whose percentage
          values resolve against the map container, a definite-size
          ancestor) rather than here — an absolutely-positioned box with no
          explicit size shrink-wraps its content, and shrink-to-fit sizing
          treats percentage-width children as 0, which collapsed the photo
          to nothing. */}
      <div
        className={`
          tr-picture-popup
          relative w-full h-full overflow-hidden rounded-xl shadow-2xl
          origin-bottom
          transition-all duration-500 ease-out
          ${getAnimationClasses()}
        `}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={picture.title || t('media.trailPictureAlt')}
            className="absolute inset-0 w-full h-full object-contain"
            onError={() => {
              if (picture.displayFile && imageSrc === picture.url) {
                fallbackImageUrlRef.current = URL.createObjectURL(picture.displayFile);
                setImageSrc(fallbackImageUrlRef.current);
                return;
              }
              setImageSrc('');
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--evergreen)]/10 text-[var(--evergreen-60)] text-sm">
            {t('media.imageUnavailable')}
          </div>
        )}

        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-10">
          <div
            className="h-full bg-[var(--trail-orange)] transition-all duration-50"
            style={{ width: `${displayProgress}%` }}
          />
        </div>

        {/* Caption + metadata overlay */}
        {(picture.title || picture.description || (picture.lat !== undefined && picture.lon !== undefined) || picture.timestamp) && (
          <div className="absolute bottom-0 left-0 right-0 px-4 pt-10 pb-3 bg-gradient-to-t from-black/75 to-transparent">
            {picture.title && (
              <p className={`font-medium text-white ${isExportSafe ? 'text-xs' : 'text-base'}`}>{picture.title}</p>
            )}
            {picture.description && (
              <p className={`text-white/85 mt-0.5 ${isExportSafe ? 'text-[11px]' : 'text-sm'}`}>{picture.description}</p>
            )}
            {(picture.lat !== undefined && picture.lon !== undefined || picture.timestamp) && (
              <div className={`flex items-center gap-3 text-white/70 mt-1.5 ${isExportSafe ? 'text-[10px]' : 'text-xs'}`}>
                {picture.lat !== undefined && picture.lon !== undefined && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {picture.lat.toFixed(4)}, {picture.lon.toFixed(4)}
                  </span>
                )}
                {picture.timestamp && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {picture.timestamp.toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
