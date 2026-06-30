import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import type { SocialShareSettings, SocialShareRouteTransform } from '@/types';
import type { RouteBboxNorm } from './useSocialShareExport';
import { useI18n } from '@/i18n/useI18n';

interface Props {
  previewUrl: string;
  isRendering: boolean;
  onClose: () => void;
  onExport: () => void;
  settings: SocialShareSettings;
  setSocialShareSettings: (patch: Partial<SocialShareSettings>) => void;
  routeBboxNorm: RouteBboxNorm | null;
  dataPanelBboxNorm: RouteBboxNorm | null;
}

interface DragState {
  type: 'move' | 'resize' | 'panel-move';
  startX: number;
  startY: number;
  startTransform: SocialShareRouteTransform;
  startOffsetY: number;
  containerW: number;
  containerH: number;
}

export function SocialSharePreviewModal({
  previewUrl, isRendering, onClose, onExport,
  settings, setSocialShareSettings, routeBboxNorm, dataPanelBboxNorm,
}: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [dragVisual, setDragVisual] = useState({ dx: 0, dy: 0, sf: 1, active: false });

  const aspectStyle = settings.aspectRatio === '4:5' ? '4 / 5'
    : settings.aspectRatio === '9:16' ? '9 / 16' : '1 / 1';

  const showRouteOverlay = settings.template === 'photo-first' && !!routeBboxNorm;
  const showPanelOverlay = !!dataPanelBboxNorm;
  const hasAnyOverlay = showRouteOverlay || showPanelOverlay;

  const startDrag = (e: React.PointerEvent, type: DragState['type']) => {
    if (!containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    dragStateRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startTransform: { ...settings.routeTransform },
      startOffsetY: settings.dataPanelOffsetY,
      containerW: rect.width,
      containerH: rect.height,
    };
    setDragVisual({ dx: 0, dy: 0, sf: 1, active: true });
  };

  // Global pointer listeners during drag — avoids stale-closure issues with React synthetic events
  useEffect(() => {
    if (!dragVisual.active) return;

    const handleMove = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      if (ds.type === 'move') {
        setDragVisual({ dx, dy, sf: 1, active: true });
      } else if (ds.type === 'panel-move') {
        setDragVisual({ dx: 0, dy, sf: 1, active: true });
      } else {
        // resize: diagonal drag bottom-right outward → scale up
        const diag = (dx + dy) * 0.5;
        const sf = Math.max(0.2, 1 + diag / (ds.containerW * 0.3));
        setDragVisual({ dx: 0, dy: 0, sf, active: true });
      }
    };

    const handleUp = () => {
      const ds = dragStateRef.current;
      if (!ds) { setDragVisual({ dx: 0, dy: 0, sf: 1, active: false }); return; }

      // Use functional setState to read latest visual state without stale closure
      setDragVisual((prev) => {
        if (ds.type === 'move') {
          setSocialShareSettings({
            routeTransform: {
              ...ds.startTransform,
              offsetX: ds.startTransform.offsetX + prev.dx / ds.containerW,
              offsetY: ds.startTransform.offsetY + prev.dy / ds.containerH,
            },
          });
        } else if (ds.type === 'panel-move') {
          // Drag up (negative dy) increases offsetY (moves panel up)
          const newOffsetY = Math.max(0, Math.min(0.85, ds.startOffsetY - prev.dy / ds.containerH));
          setSocialShareSettings({ dataPanelOffsetY: newOffsetY });
        } else {
          setSocialShareSettings({
            routeTransform: {
              ...ds.startTransform,
              scale: Math.max(0.3, Math.min(4, ds.startTransform.scale * prev.sf)),
            },
          });
        }
        dragStateRef.current = null;
        return { dx: 0, dy: 0, sf: 1, active: false };
      });
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragVisual.active, setSocialShareSettings]);

  const isPanelDragging = dragVisual.active && dragStateRef.current?.type === 'panel-move';
  const isRouteDragging = dragVisual.active && dragStateRef.current?.type !== 'panel-move';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--canvas)] rounded-xl shadow-2xl max-h-[94vh] w-full max-w-md flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 shrink-0">
          <h2 className="font-bold text-sm uppercase tracking-wide text-[var(--evergreen)]">
            {t('imageExport.posterPreview')}
            {hasAnyOverlay && (
              <span className="ml-2 text-xs font-normal opacity-50 normal-case tracking-normal">
                {t('imageExport.dragHint')}
              </span>
            )}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 flex justify-center items-start">
          {/* Container locked to poster aspect ratio — img fills it exactly */}
          <div
            ref={containerRef}
            className="relative rounded-lg overflow-hidden shadow-lg w-full"
            style={{ aspectRatio: aspectStyle, maxHeight: '70vh' }}
          >
            <img
              src={previewUrl}
              alt="Social share poster preview"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />

            {/* Interactive route overlay (photo-first only) */}
            {showRouteOverlay && routeBboxNorm && (
              <div className="absolute inset-0" style={{ touchAction: 'none' }}>
                <div
                  className="absolute border-2 border-dashed border-[var(--trail-orange)] rounded select-none"
                  style={{
                    left: `${routeBboxNorm.x * 100}%`,
                    top: `${routeBboxNorm.y * 100}%`,
                    width: `${routeBboxNorm.w * 100}%`,
                    height: `${routeBboxNorm.h * 100}%`,
                    transform: `translate(${isRouteDragging ? dragVisual.dx : 0}px, ${isRouteDragging ? dragVisual.dy : 0}px) scale(${isRouteDragging ? dragVisual.sf : 1})`,
                    transformOrigin: '50% 50%',
                    cursor: isRouteDragging ? 'grabbing' : 'grab',
                  }}
                  onPointerDown={(e) => startDrag(e, 'move')}
                >
                  {/* Resize handle — bottom-right corner */}
                  <div
                    className="absolute bottom-0 right-0 w-5 h-5 bg-[var(--trail-orange)] rounded-tl-md flex items-center justify-center cursor-nwse-resize"
                    style={{ transform: 'translate(50%, 50%)' }}
                    onPointerDown={(e) => startDrag(e, 'resize')}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 7L7 1M4 7L7 4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive data panel overlay (stats + elevation) */}
            {showPanelOverlay && dataPanelBboxNorm && (
              <div className="absolute inset-0" style={{ touchAction: 'none' }}>
                <div
                  className="absolute border-2 border-dashed border-white/70 rounded select-none"
                  style={{
                    left: `${dataPanelBboxNorm.x * 100}%`,
                    top: `${dataPanelBboxNorm.y * 100}%`,
                    width: `${dataPanelBboxNorm.w * 100}%`,
                    height: `${dataPanelBboxNorm.h * 100}%`,
                    transform: `translateY(${isPanelDragging ? dragVisual.dy : 0}px)`,
                    cursor: isPanelDragging ? 'grabbing' : 'grab',
                  }}
                  onPointerDown={(e) => startDrag(e, 'panel-move')}
                />
              </div>
            )}

            {isRendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-black/10 flex gap-2 shrink-0">
          <button onClick={onClose} className="tr-btn tr-btn-secondary flex-1">
            {t('imageExport.back')}
          </button>
          <button
            onClick={onExport}
            disabled={isRendering}
            className="tr-btn tr-btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isRendering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t('imageExport.downloadPng')}
          </button>
        </div>
      </div>
    </div>
  );
}
