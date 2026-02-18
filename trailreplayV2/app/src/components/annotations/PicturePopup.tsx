import { useEffect, useState, useRef } from 'react';
import type { PictureAnnotation } from '@/types';
import { X, MapPin, Calendar } from 'lucide-react';

interface PicturePopupProps {
  picture: PictureAnnotation;
  onClose?: () => void;
}

export function PicturePopup({ picture, onClose }: PicturePopupProps) {
  const [animationState, setAnimationState] = useState<'entering' | 'visible' | 'exiting'>('entering');
  const [displayProgress, setDisplayProgress] = useState(0);
  const [imageSrc, setImageSrc] = useState(picture.url);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const displayDuration = picture.displayDuration || 5000;
  
  useEffect(() => {
    // Start with entering animation
    setAnimationState('entering');
    setDisplayProgress(0);
    setImageSrc(picture.url);
    
    // After entering animation, show the picture
    const enterTimer = setTimeout(() => {
      setAnimationState('visible');
      
      // Start progress bar
      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / displayDuration) * 100, 100);
        setDisplayProgress(progress);
        
        if (progress >= 100) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          setAnimationState('exiting');
          setTimeout(() => {
            onClose?.();
          }, 300); // Wait for exit animation
        }
      }, 50);
    }, 300); // Enter animation duration
    
    return () => {
      clearTimeout(enterTimer);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [picture, displayDuration, onClose]);
  
  const handleClose = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setAnimationState('exiting');
    setTimeout(() => {
      onClose?.();
    }, 300);
  };
  
  // Animation classes based on state
  const getAnimationClasses = () => {
    switch (animationState) {
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
    <div className="absolute bottom-4 right-4 z-20">
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
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={picture.title || 'Trail picture'}
              className="w-72 h-52 object-cover"
              onError={() => {
                if (picture.file && imageSrc === picture.url) {
                  setImageSrc(URL.createObjectURL(picture.file));
                }
              }}
            />
          ) : (
            <div className="w-72 h-52 flex items-center justify-center bg-[var(--evergreen)]/10 text-[var(--evergreen-60)] text-sm">
              Image unavailable
            </div>
          )}
          
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
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
          <div className="caption">
            {picture.title && (
              <p className="font-medium text-sm">{picture.title}</p>
            )}
            {picture.description && (
              <p className="text-xs opacity-80 mt-0.5">{picture.description}</p>
            )}
          </div>
        )}
        
        {/* Metadata */}
        <div className="px-3 py-2 bg-[var(--canvas)] border-t border-[var(--evergreen)]/20 flex items-center gap-3 text-xs text-[var(--evergreen-60)]">
          {picture.lat && picture.lon && (
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
