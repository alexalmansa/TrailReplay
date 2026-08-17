import { useCallback, useEffect, useRef, useState } from 'react';
import type { PictureAnnotation } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import {
  getPicturePopupLayout,
  type PicturePopupExportFrame,
} from '@/utils/picturePopup';
import { X, MapPin, Calendar, ImageOff, Link2 } from 'lucide-react';

interface PicturePopupProps {
  picture: PictureAnnotation;
  onClose?: () => void;
  exportFrame?: PicturePopupExportFrame | null;
  playbackCurrentTime?: number;
}

export function PicturePopup({ picture, onClose, exportFrame, playbackCurrentTime }: PicturePopupProps) {
  const { t } = useI18n();
  const relinkPictureFile = useAppStore((state) => state.relinkPictureFile);
  const [animationState, setAnimationState] = useState<'entering' | 'visible' | 'exiting'>('entering');
  const [displayProgress, setDisplayProgress] = useState(0);
  const [imageSrc, setImageSrc] = useState(picture.url);
  const progressIntervalRef = useRef<number | null>(null);
  const exitTimeoutRef = useRef<number | null>(null);
  const fallbackImageUrlRef = useRef<string | null>(null);
  const playbackPopupStartTimeRef = useRef<number | null>(null);
  const relinkInputRef = useRef<HTMLInputElement>(null);
  
  const displayDuration = picture.displayDuration || 5000;
  const { imageWidth, imageHeight, isExportSafe, popupStyle } = getPicturePopupLayout(exportFrame);
  
  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current !== null) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startExit = useCallback((immediately = false) => {
    if (exitTimeoutRef.current !== null) return;

    clearProgressInterval();
    if (immediately) {
      onClose?.();
      return;
    }

    setAnimationState('exiting');
    exitTimeoutRef.current = window.setTimeout(() => {
      exitTimeoutRef.current = null;
      onClose?.();
    }, 300);
  }, [clearProgressInterval, onClose]);

  useEffect(() => {
    // Deterministic exports advance the replay clock frame-by-frame rather than
    // in wall-clock time. Show the popup immediately and let the effect below
    // control its lifetime from that same clock.
    if (playbackCurrentTime !== undefined) {
      return;
    }

    // After entering animation, show the picture
    const enterTimer = window.setTimeout(() => {
      setAnimationState('visible');
      
      // Start progress bar
      const startTime = Date.now();
      progressIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / displayDuration) * 100, 100);
        setDisplayProgress(progress);
        
        if (progress >= 100) {
          startExit();
        }
      }, 50);
    }, 300); // Enter animation duration
    
    return () => {
      window.clearTimeout(enterTimer);
      clearProgressInterval();
      if (exitTimeoutRef.current !== null) {
        window.clearTimeout(exitTimeoutRef.current);
      }
      if (fallbackImageUrlRef.current !== null) {
        URL.revokeObjectURL(fallbackImageUrlRef.current);
      }
    };
  }, [clearProgressInterval, displayDuration, playbackCurrentTime, startExit]);

  useEffect(() => {
    if (playbackCurrentTime === undefined) return;

    if (playbackPopupStartTimeRef.current === null) {
      playbackPopupStartTimeRef.current = playbackCurrentTime;
    }

    const elapsed = Math.max(0, playbackCurrentTime - playbackPopupStartTimeRef.current);
    const progress = Math.min((elapsed / displayDuration) * 100, 100);
    setDisplayProgress(progress);

    if (progress >= 100) {
      startExit(true);
    }
  }, [displayDuration, playbackCurrentTime, startExit]);
  
  const handleClose = () => {
    startExit();
  };
  
  // Animation classes based on state
  const getAnimationClasses = () => {
    switch (playbackCurrentTime === undefined ? animationState : 'visible') {
      case 'entering':
        return 'opacity-0 scale-90 translate-y-4';
      case 'visible':
        return 'opacity-100 scale-100 translate-y-0';
      case 'exiting':
        return 'opacity-0 scale-95 translate-y-2';
      default:
        return '';
    }
  };

  return (
    <div className="absolute z-20" style={popupStyle}>
      <div 
        className={`
          tr-picture-popup
          transition-all duration-300 ease-out
          ${getAnimationClasses()}
        `}
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-10">
          <div 
            className="h-full bg-[var(--trail-orange)] transition-all duration-50"
            style={{ width: `${displayProgress}%` }}
          />
        </div>
        
        {/* Image */}
        <div className="relative">
          {picture.isPlaceholder ? (
            <div
              className="flex flex-col items-center justify-center gap-2 bg-[var(--evergreen)]/10 text-[var(--evergreen-60)] text-sm"
              style={{ width: imageWidth, height: imageHeight }}
            >
              <ImageOff className="w-6 h-6" />
              <span className="px-3 text-center text-xs">{t('media.placeholderFile')}</span>
              <button
                type="button"
                onClick={() => relinkInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full bg-[var(--trail-orange)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--trail-orange)]/80"
              >
                <Link2 className="w-3.5 h-3.5" />
                {t('media.relinkFile')}
              </button>
              <input
                ref={relinkInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) relinkPictureFile(picture.id, file);
                }}
              />
            </div>
          ) : imageSrc ? (
            <img
              src={imageSrc}
              alt={picture.title || t('media.trailPictureAlt')}
              className="object-contain bg-[var(--evergreen)]/10"
              style={{ width: imageWidth, height: imageHeight }}
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
            <div
              className="flex items-center justify-center bg-[var(--evergreen)]/10 text-[var(--evergreen-60)] text-sm"
              style={{ width: imageWidth, height: imageHeight }}
            >
              {t('media.imageUnavailable')}
            </div>
          )}
          
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* Duration Indicator */}
          <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 text-white text-xs rounded-full">
            {(displayDuration / 1000).toFixed(0)}s
          </div>
        </div>
        
        {/* Caption */}
        {(picture.title || picture.description) && (
          <div className={`caption ${isExportSafe ? 'px-3 py-2' : ''}`}>
            {picture.title && (
              <p className={`font-medium ${isExportSafe ? 'text-xs' : 'text-sm'}`}>{picture.title}</p>
            )}
            {picture.description && (
              <p className={`${isExportSafe ? 'text-[11px]' : 'text-xs'} opacity-80 mt-0.5`}>{picture.description}</p>
            )}
          </div>
        )}
        
        {/* Metadata */}
        <div className={`bg-[var(--canvas)] border-t border-[var(--evergreen)]/20 flex items-center gap-3 text-[var(--evergreen-60)] ${isExportSafe ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-2 text-xs'}`}>
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
      </div>
    </div>
  );
}
