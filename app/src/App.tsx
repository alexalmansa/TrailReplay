import { lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
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

const Sidebar = lazy(() => import('@/components/sidebar/Sidebar').then((module) => ({ default: module.Sidebar })));
const InfoPanel = lazy(() => import('@/components/info/InfoPanel').then((module) => ({ default: module.InfoPanel })));
const FeedbackSolicitation = lazy(() => import('@/components/feedback/FeedbackSolicitation').then((module) => ({ default: module.FeedbackSolicitation })));
const TrailMap = lazy(() => import('@/components/map/TrailMap').then((module) => ({ default: module.TrailMap })));

function SidebarFallback() {
  return <div className="h-full bg-[var(--canvas)]" />;
}

function App() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);
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
  const isExporting = useAppStore((state) => state.isExporting);

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
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle file input change
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await parseFiles(files);
        setShowSidebar(true);
      }
      // Reset input to allow re-uploading same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [parseFiles, setShowSidebar]
  );

  // Trigger file picker
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    const shouldPreviewExportFrame = activePanel === 'export' || isExporting;
    const el = mapContainerRef.current;
    if (!shouldPreviewExportFrame || !el) return;

    const update = () => {
      setExportCropMetrics(getCropPreviewMetrics(el.clientWidth, el.clientHeight, exportAspectRatio));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activePanel, exportAspectRatio, isExporting]);

  const activeExportCropMetrics = activePanel === 'export' || isExporting
    ? exportCropMetrics
    : null;

  useEffect(() => {
    shownPlaybackPictureIdsRef.current.clear();
    queuedPlaybackPictureIdsRef.current = [];
    resumePlaybackAfterPictureQueueRef.current = false;
    clearPendingQueuedPictureOpen();
    lastPlaybackProgressRef.current = useAppStore.getState().playback.progress;
  }, [clearPendingQueuedPictureOpen, pictures, tracks]);

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
      return;
    }

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
                <TrailMap mapContainerRef={mapContainerRef} onReadyChange={setIsMapReady} />
              </Suspense>

              {!isMapReady && <AppLoadingOverlay />}

              {/* Aspect ratio crop preview when in Export panel */}
              {activePanel === 'export' && (
                <CropPreviewBars ratio={exportAspectRatio} containerRef={mapContainerRef} />
              )}

              {/* Stats Overlay */}
              {hasTracks && (
                <div className="absolute top-4 left-4 z-10">
                  <StatsOverlay />
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
