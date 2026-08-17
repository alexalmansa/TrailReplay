import { lazy, Suspense, useEffect, useRef, useState, useCallback, useMemo, type CSSProperties } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useGPX } from '@/hooks/useGPX';
import { AppHeader } from '@/components/app/AppHeader';
import { AppLoadingOverlay } from '@/components/app/AppLoadingOverlay';
import { CropPreviewBars } from '@/components/app/CropPreviewBars';
import { PendingPicturePlacementBanner } from '@/components/app/PendingPicturePlacementBanner';
import { WelcomeOverlay } from '@/components/app/WelcomeOverlay';
import { PlaybackControls } from '@/components/playback/PlaybackControls';
import { PlaybackProvider } from '@/components/playback/PlaybackProvider';
import { StatsOverlay } from '@/components/stats/StatsOverlay';
import { PicturePopup } from '@/components/annotations/PicturePopup';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { getCropPreviewMetrics, type CropPreviewMetrics } from '@/utils/crop';
import {
  getTriggeredPlaybackPictures,
  hasPlaybackProgressRewound,
} from '@/utils/playbackPictures';
import { getActivePlaybackAnnotationId } from '@/utils/playbackAnnotations';
import { trackEvent } from '@/utils/analytics';
import { useI18n } from '@/i18n/useI18n';

const Sidebar = lazy(() => import('@/components/sidebar/Sidebar').then((module) => ({ default: module.Sidebar })));
const InfoPanel = lazy(() => import('@/components/info/InfoPanel').then((module) => ({ default: module.InfoPanel })));
const FeedbackSolicitation = lazy(() => import('@/components/feedback/FeedbackSolicitation').then((module) => ({ default: module.FeedbackSolicitation })));
const TrailMap = lazy(() => import('@/components/map/TrailMap').then((module) => ({ default: module.TrailMap })));

function SidebarFallback() {
  return <div className="h-full bg-[var(--canvas)]" />;
}

function isNarrowFrame(width: number, height: number) {
  return width <= height || width < 560;
}

function App() {
  const { t } = useI18n();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statsDragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const [isDraggingStats, setIsDraggingStats] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [autoPlaybackPictureId, setAutoPlaybackPictureId] = useState<string | null>(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );
  const [exportCropMetrics, setExportCropMetrics] = useState<CropPreviewMetrics | null>(null);
  const shownPlaybackPictureIdsRef = useRef<Set<string>>(new Set());
  const queuedPlaybackPictureIdsRef = useRef<string[]>([]);
  const lastPlaybackProgressRef = useRef(0);
  const resumePlaybackAfterPictureQueueRef = useRef(false);
  const pendingQueuedPictureOpenRef = useRef<number | null>(null);

  const { parseFiles } = useGPX();
  const tracks = useAppStore((state) => state.tracks);
  const showSidebar = useAppStore((state) => state.isSidebarOpen);
  const setShowSidebar = useAppStore((state) => state.setSidebarOpen);
  const exploreMode = useAppStore((state) => state.exploreMode);
  const setExploreMode = useAppStore((state) => state.setExploreMode);
  const pictures = useAppStore((state) => state.pictures);
  const pendingPicturePlacements = useAppStore((state) => state.pendingPicturePlacements);
  const textAnnotations = useAppStore((state) => state.textAnnotations);
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const error = useAppStore((state) => state.error);
  const setError = useAppStore((state) => state.setError);
  const selectedPictureId = useAppStore((state) => state.selectedPictureId);
  const setSelectedPictureId = useAppStore((state) => state.setSelectedPictureId);
  const addPicture = useAppStore((state) => state.addPicture);
  const removePendingPicturePlacement = useAppStore((state) => state.removePendingPicturePlacement);
  const clearPendingPicturePlacements = useAppStore((state) => state.clearPendingPicturePlacements);
  const play = useAppStore((state) => state.play);
  const pause = useAppStore((state) => state.pause);
  const activePanel = useAppStore((state) => state.activePanel);
  const exportAspectRatio = useAppStore((state) => state.videoExportSettings.aspectRatio);
  const socialShareAspectRatio = useAppStore((state) => state.socialShareSettings.aspectRatio);
  const exportSubMode = useAppStore((state) => state.exportSubMode);
  const isExporting = useAppStore((state) => state.isExporting);

  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  const openNextQueuedPlaybackPicture = useCallback(() => {
    const nextPictureId = queuedPlaybackPictureIdsRef.current.shift();
    if (!nextPictureId) {
      setAutoPlaybackPictureId(null);
      return false;
    }

    setAutoPlaybackPictureId(nextPictureId);
    return true;
  }, []);

  const clearPendingQueuedPictureOpen = useCallback(() => {
    if (pendingQueuedPictureOpenRef.current !== null) {
      window.clearTimeout(pendingQueuedPictureOpenRef.current);
      pendingQueuedPictureOpenRef.current = null;
    }
  }, []);

  const scheduleNextQueuedPlaybackPicture = useCallback(() => {
    clearPendingQueuedPictureOpen();
    pendingQueuedPictureOpenRef.current = window.setTimeout(() => {
      pendingQueuedPictureOpenRef.current = null;
      openNextQueuedPlaybackPicture();
    }, 0);
  }, [clearPendingQueuedPictureOpen, openNextQueuedPlaybackPicture]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
      setError(null);
    }
  }, [error, setError]);
  
  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(document.fullscreenElement !== null);

    syncFullscreenState();
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  // Toggle fullscreen. The fullscreenchange event above remains the source of truth,
  // because browsers can reject requests or exit fullscreen outside this component.
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      void document.exitFullscreen().catch(() => undefined);
    }
  };

  // Handle file input change
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      try {
        if (files && files.length > 0) {
          const importedTracks = await parseFiles(files, 'file_picker');
          setShowSidebar(true);
          if (importedTracks?.length) {
            toast.success(t('workflow.routeImported'));
          }
        }
      } catch {
        // `parseFiles` already reports a localized error through the app store.
        // Handling it here keeps the DOM event free of unhandled rejections.
      } finally {
        // Always reset so the user can retry the same file after a failed import.
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [parseFiles, setShowSidebar, t]
  );

  // Trigger file picker
  const openFilePicker = () => {
    trackEvent('file_picker_opened', { picker_location: 'welcome_overlay' });
    fileInputRef.current?.click();
  };

  const activeCropRatio = exportSubMode === 'image' ? socialShareAspectRatio : exportAspectRatio;

  useEffect(() => {
    const shouldPreviewExportFrame = activePanel === 'export' || isExporting;
    const el = mapContainerRef.current;
    if (!shouldPreviewExportFrame || !el) return;

    const update = () => {
      setExportCropMetrics(getCropPreviewMetrics(el.clientWidth, el.clientHeight, activeCropRatio));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activePanel, activeCropRatio, isExporting]);

  // Stats overlay positioning only applies to video export, not image export
  const activeExportCropMetrics = (activePanel === 'export' || isExporting) && exportSubMode !== 'image'
    ? exportCropMetrics
    : null;
  const statsShouldUseNarrowLayout = activeExportCropMetrics
    ? isNarrowFrame(activeExportCropMetrics.frameWidth, activeExportCropMetrics.frameHeight)
    : isNarrowScreen;

  const statsOverlayStyle = (() => {
    if (settings.statsPosition) {
      const { x, y } = settings.statsPosition;
      return {
        top: `${y * 100}%`,
        left: `${x * 100}%`,
        width: 'auto',
        maxWidth: isNarrowScreen ? 'min(calc(100% - 24px), 312px)' : 'min(calc(100% - 32px), 408px)',
      } satisfies CSSProperties;
    }

    if (activeExportCropMetrics) {
      const { frameLeft, frameTop, frameWidth, frameHeight } = activeExportCropMetrics;
      const narrowFrame = isNarrowFrame(frameWidth, frameHeight);

      if (narrowFrame) {
        return {
          top: frameTop + 14,
          left: frameLeft + (frameWidth / 2),
          // Match the auto-sized wrapper used after a drag. Giving the wrapper
          // the whole frame width makes the overlay background appear too wide
          // until the first drag updates statsPosition.
          width: 'fit-content',
          maxWidth: Math.min(Math.max(frameWidth - 24, 0), 268),
          transform: 'translateX(-50%)',
        } satisfies CSSProperties;
      }

      return {
        top: frameTop + 16,
        left: frameLeft + 16,
        width: 'fit-content',
        maxWidth: Math.min(Math.max(frameWidth - 32, 0), 320),
      } satisfies CSSProperties;
    }

    if (isNarrowScreen) {
      return {
        top: 12,
        left: '50%',
        width: 'min(calc(100% - 24px), 312px)',
        transform: 'translateX(-50%)',
      } satisfies CSSProperties;
    }

    return {
      top: 16,
      left: 16,
      width: 'min(calc(100% - 32px), 408px)',
    } satisfies CSSProperties;
  })();

  useEffect(() => {
    shownPlaybackPictureIdsRef.current.clear();
    queuedPlaybackPictureIdsRef.current = [];
    resumePlaybackAfterPictureQueueRef.current = false;
    clearPendingQueuedPictureOpen();
    lastPlaybackProgressRef.current = useAppStore.getState().playback.progress;
  }, [clearPendingQueuedPictureOpen, pictures, textAnnotations, tracks]);

  const handleStatsDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pos = settings.statsPosition ?? { x: 0.02, y: 0.04 };
    statsDragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, startX: pos.x, startY: pos.y };
    setIsDraggingStats(true);
  }, [settings.statsPosition]);

  useEffect(() => {
    if (!isDraggingStats) return;
    const onMove = (e: MouseEvent) => {
      const container = mapContainerRef.current;
      if (!container || !statsDragStartRef.current) return;
      const rect = container.getBoundingClientRect();
      const dx = (e.clientX - statsDragStartRef.current.mouseX) / rect.width;
      const dy = (e.clientY - statsDragStartRef.current.mouseY) / rect.height;
      setSettings({
        statsPosition: {
          x: Math.max(0, Math.min(0.92, statsDragStartRef.current.startX + dx)),
          y: Math.max(0, Math.min(0.92, statsDragStartRef.current.startY + dy)),
        },
      });
    };
    const onUp = () => setIsDraggingStats(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDraggingStats, setSettings]);

  useEffect(() => {
    return () => {
      clearPendingQueuedPictureOpen();
    };
  }, [clearPendingQueuedPictureOpen]);

  useEffect(() => {
    const currentProgress = playback.progress;
    const previousProgress = lastPlaybackProgressRef.current;

    if (hasPlaybackProgressRewound(previousProgress, currentProgress)) {
      shownPlaybackPictureIdsRef.current.clear();
      queuedPlaybackPictureIdsRef.current = [];
      resumePlaybackAfterPictureQueueRef.current = false;
      clearPendingQueuedPictureOpen();
    }

    if (!playback.isPlaying || selectedPictureId || autoPlaybackPictureId || pictures.length === 0) {
      lastPlaybackProgressRef.current = currentProgress;
    } else {
      const triggeredPictures = getTriggeredPlaybackPictures({
        pictures,
        previousProgress,
        currentProgress,
        shownPictureIds: shownPlaybackPictureIdsRef.current,
        queuedPictureIds: queuedPlaybackPictureIdsRef.current,
      });

      if (triggeredPictures.length > 0) {
        triggeredPictures.forEach((picture) => {
          shownPlaybackPictureIdsRef.current.add(picture.id);
        });
        queuedPlaybackPictureIdsRef.current.push(...triggeredPictures.map((picture) => picture.id));
        resumePlaybackAfterPictureQueueRef.current = true;
        pause();
        scheduleNextQueuedPlaybackPicture();
      }
    }

    lastPlaybackProgressRef.current = currentProgress;
  }, [
    autoPlaybackPictureId,
    clearPendingQueuedPictureOpen,
    pause,
    pictures,
    playback.isPlaying,
    playback.progress,
    scheduleNextQueuedPlaybackPicture,
    selectedPictureId,
  ]);

  const closeActivePicture = useCallback(() => {
    clearPendingQueuedPictureOpen();

    if (selectedPictureId) {
      setSelectedPictureId(null);
      return;
    }

    if (autoPlaybackPictureId) {
      setAutoPlaybackPictureId(null);
    }

    if (queuedPlaybackPictureIdsRef.current.length > 0) {
      scheduleNextQueuedPlaybackPicture();
      return;
    }

    if (resumePlaybackAfterPictureQueueRef.current) {
      resumePlaybackAfterPictureQueueRef.current = false;
      play();
    }
  }, [autoPlaybackPictureId, clearPendingQueuedPictureOpen, play, scheduleNextQueuedPlaybackPicture, selectedPictureId, setSelectedPictureId]);
  
  // Get active picture for current progress
  const selectedPicture = selectedPictureId
    ? pictures.find((p) => p.id === selectedPictureId)
    : undefined;
  const autoPlaybackPicture = autoPlaybackPictureId
    ? pictures.find((p) => p.id === autoPlaybackPictureId)
    : undefined;
  const activePicture = selectedPicture || autoPlaybackPicture;
  const activeTextAnnotationId = useMemo(() => getActivePlaybackAnnotationId({
    annotations: textAnnotations,
    currentTime: playback.currentTime,
    totalDuration: playback.totalDuration,
  }), [playback.currentTime, playback.totalDuration, textAnnotations]);
  const activePendingPicturePlacement = pendingPicturePlacements[0];
  
  const hasTracks = tracks.length > 0;

  useEffect(() => {
    const updateViewport = () => {
      setIsNarrowScreen(window.innerWidth < 900);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);
  
  return (
    <PlaybackProvider>
      <div className="app-container h-screen bg-[var(--canvas)] flex flex-col overflow-hidden">
        <AppHeader
          isFullscreen={isFullscreen}
          showInfoPanel={showInfoPanel}
          showSidebar={showSidebar}
          onToggleFullscreen={toggleFullscreen}
          onToggleInfoPanel={() => setShowInfoPanel(!showInfoPanel)}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
        />
        
        {/* Main Content */}
        <main className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          {showSidebar && (
            <div className="w-80 h-full flex-shrink-0 border-r-2 border-[var(--evergreen)] overflow-hidden">
              <Suspense fallback={<SidebarFallback />}>
                <Sidebar />
              </Suspense>
            </div>
          )}
          
          {/* Map Area */}
          <div className="flex-1 flex flex-col relative">
            {/* Map Container */}
            <div
              id="map-capture-container"
              ref={mapContainerRef}
              className="flex-1 relative"
            >
              <Suspense fallback={<AppLoadingOverlay />}>
                <TrailMap
                  activeTextAnnotationId={activeTextAnnotationId}
                  mapContainerRef={mapContainerRef}
                  onReadyChange={setIsMapReady}
                  exportFrame={activeExportCropMetrics}
                />
              </Suspense>

              {!isMapReady && <AppLoadingOverlay />}

              {/* Aspect ratio crop preview when in Export panel */}
              {activePanel === 'export' && (
                <CropPreviewBars ratio={activeCropRatio} containerRef={mapContainerRef} />
              )}

              {/* Stats Overlay */}
              {hasTracks && (
                <div
                  className="absolute z-10"
                  style={{
                    ...statsOverlayStyle,
                    cursor: isDraggingStats ? 'grabbing' : 'grab',
                    userSelect: 'none',
                  }}
                  onMouseDown={handleStatsDragStart}
                >
                  <StatsOverlay
                    layout={statsShouldUseNarrowLayout ? 'narrow' : 'default'}
                    variant={activeExportCropMetrics ? 'export' : 'default'}
                  />
                </div>
              )}

              {activePendingPicturePlacement && (
                <PendingPicturePlacementBanner
                  pendingPlacement={activePendingPicturePlacement}
                  totalPendingPlacements={pendingPicturePlacements.length}
                  onCancelAll={clearPendingPicturePlacements}
                  onSkip={() => removePendingPicturePlacement(activePendingPicturePlacement.id)}
                  onUseTimestamp={activePendingPicturePlacement.timestampAlternative
                    ? () => {
                        const timestampPlacement = activePendingPicturePlacement.timestampAlternative;
                        if (!timestampPlacement) {
                          return;
                        }

                        addPicture({
                          id: activePendingPicturePlacement.id,
                          file: activePendingPicturePlacement.file,
                          displayFile: activePendingPicturePlacement.displayFile,
                          url: activePendingPicturePlacement.url,
                          lat: timestampPlacement.lat,
                          lon: timestampPlacement.lon,
                          timestamp: activePendingPicturePlacement.timestamp,
                          progress: timestampPlacement.progress,
                          position: timestampPlacement.progress,
                          placementSource: 'timestamp',
                          title: activePendingPicturePlacement.title,
                          description: activePendingPicturePlacement.description,
                          displayDuration: activePendingPicturePlacement.displayDuration,
                        });
                        removePendingPicturePlacement(activePendingPicturePlacement.id);
                      }
                    : undefined}
                />
              )}
              
              {/* Picture Popup */}
              {activePicture && settings.showPictures && (
                <PicturePopup 
                  key={activePicture.id}
                  picture={activePicture} 
                  onClose={closeActivePicture}
                  exportFrame={activeExportCropMetrics}
                />
              )}
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".gpx,.kml,application/gpx+xml,application/vnd.google-earth.kml+xml"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {/* No tracks message */}
              {isMapReady && !hasTracks && !exploreMode && !isNarrowScreen && (
                <WelcomeOverlay
                  onOpenFilePicker={openFilePicker}
                  onExplore={() => {
                    setExploreMode(true);
                    setShowSidebar(false);
                  }}
                />
              )}

              {/* Feedback Solicitation */}
              {hasTracks && (
                <Suspense fallback={null}>
                  <FeedbackSolicitation />
                </Suspense>
              )}
            </div>
            
            {/* Playback Controls */}
            {hasTracks && (
              <div className="h-20 bg-[var(--canvas)] border-t-2 border-[var(--evergreen)]">
                <PlaybackControls />
              </div>
            )}
          </div>

          {/* Info Panel (Right Side) */}
          {showInfoPanel && (
            <div className="w-80 h-full flex-shrink-0 overflow-hidden">
              <Suspense fallback={<SidebarFallback />}>
                <InfoPanel onClose={() => setShowInfoPanel(false)} />
              </Suspense>
            </div>
          )}
        </main>
        
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--canvas)',
              border: '2px solid var(--evergreen)',
              fontFamily: 'var(--font-family-primary)',
            },
          }}
        />
      </div>
    </PlaybackProvider>
  );
}

export default App;
