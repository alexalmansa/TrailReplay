import { lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useGPX } from '@/hooks/useGPX';
import { TrailMap } from '@/components/map/TrailMap';
import { PlaybackControls } from '@/components/playback/PlaybackControls';
import { PlaybackProvider } from '@/components/playback/PlaybackProvider';
import { StatsOverlay } from '@/components/stats/StatsOverlay';
import { PicturePopup } from '@/components/annotations/PicturePopup';
import { SupportButton } from '@/components/header/SupportButton';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Menu, X, Maximize2, Minimize2, Upload, Info, MapPin, BookOpen } from 'lucide-react';
import { gsap } from 'gsap';
import { useI18n } from '@/i18n/useI18n';
import { getCropPreviewMetrics, type CropPreviewMetrics } from '@/utils/crop';

import type { AspectRatio } from '@/types';

const Sidebar = lazy(() => import('@/components/sidebar/Sidebar').then((module) => ({ default: module.Sidebar })));
const InfoPanel = lazy(() => import('@/components/info/InfoPanel').then((module) => ({ default: module.InfoPanel })));
const FeedbackSolicitation = lazy(() => import('@/components/feedback/FeedbackSolicitation').then((module) => ({ default: module.FeedbackSolicitation })));

/** Dark letterbox bars showing what will be cropped for the selected aspect ratio */
function CropPreviewBars({
  ratio,
  containerRef,
}: {
  ratio: AspectRatio;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [cropPreview, setCropPreview] = useState<{
    left: number;
    right: number;
    top: number;
    bottom: number;
    frameLeft: number;
    frameTop: number;
    frameWidth: number;
    frameHeight: number;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setCropPreview(getCropPreviewMetrics(el.clientWidth, el.clientHeight, ratio));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio, containerRef]);

  if (!cropPreview) return null;
  return (
    <>
      {cropPreview.left > 0 && <>
        <div className="absolute inset-y-0 left-0 bg-black/55 z-30 pointer-events-none" style={{ width: cropPreview.left }} />
        <div className="absolute inset-y-0 right-0 bg-black/55 z-30 pointer-events-none" style={{ width: cropPreview.right }} />
      </>}
      {cropPreview.top > 0 && <>
        <div className="absolute inset-x-0 top-0 bg-black/55 z-30 pointer-events-none" style={{ height: cropPreview.top }} />
        <div className="absolute inset-x-0 bottom-0 bg-black/55 z-30 pointer-events-none" style={{ height: cropPreview.bottom }} />
      </>}
      <div
        className="absolute z-30 pointer-events-none rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.08)]"
        style={{
          left: cropPreview.frameLeft,
          top: cropPreview.frameTop,
          width: cropPreview.frameWidth,
          height: cropPreview.frameHeight,
        }}
      />
      {/* Label */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-black/70 text-white text-xs px-2 py-0.5 rounded">
        Export crop: {ratio}
      </div>
    </>
  );
}

function SidebarFallback() {
  return <div className="h-full bg-[var(--canvas)]" />;
}

function AppLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--canvas)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-2xl border border-[var(--evergreen)]/10 bg-white p-4 shadow-lg">
          <img
            src="/media/images/simplelogo.png"
            alt="TrailReplay"
            className="h-12 w-12 object-contain"
          />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-[0.08em] text-[var(--evergreen)]">
            TrailReplay
          </p>
          <div className="mx-auto h-6 w-6 rounded-full border-2 border-[var(--trail-orange)] border-t-transparent animate-spin" />
        </div>
      </div>
    </div>
  );
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
  const { t } = useI18n();
  const pictures = useAppStore((state) => state.pictures);
  const pendingPicturePlacements = useAppStore((state) => state.pendingPicturePlacements);
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);
  const error = useAppStore((state) => state.error);
  const setError = useAppStore((state) => state.setError);
  const selectedPictureId = useAppStore((state) => state.selectedPictureId);
  const setSelectedPictureId = useAppStore((state) => state.setSelectedPictureId);
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
  
  // Welcome animation
  useEffect(() => {
    gsap.from('.app-container', {
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
    });
  }, []);
  
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

    if (currentProgress + 0.001 < previousProgress) {
      shownPlaybackPictureIdsRef.current.clear();
      queuedPlaybackPictureIdsRef.current = [];
      resumePlaybackAfterPictureQueueRef.current = false;
      clearPendingQueuedPictureOpen();
    }

    if (!playback.isPlaying || selectedPictureId || autoPlaybackPictureId || pictures.length === 0) {
      lastPlaybackProgressRef.current = currentProgress;
      return;
    }

    const progressEpsilon = 0.005;
    const lowerBound = Math.max(0, previousProgress - progressEpsilon);
    const upperBound = Math.min(1, currentProgress + progressEpsilon);
    const queuedIds = new Set(queuedPlaybackPictureIdsRef.current);
    const triggeredPictures = pictures
      .filter((picture) => (
        !shownPlaybackPictureIdsRef.current.has(picture.id)
        && !queuedIds.has(picture.id)
        && picture.progress >= lowerBound
        && picture.progress <= upperBound
      ))
      .sort((a, b) => a.progress - b.progress);

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
    openNextQueuedPlaybackPicture,
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
        {/* Header */}
        <header className="h-14 bg-[var(--evergreen)] text-[var(--canvas)] flex items-center justify-between px-2 sm:px-4 z-50">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {showSidebar ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="bg-white rounded-md p-0.5 sm:p-1">
                <img
                  src="/media/images/simplelogo.png"
                  alt="TrailReplay"
                  className="h-5 w-5 sm:h-6 sm:w-6 object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-[11px] sm:text-sm tracking-[0.02em] leading-none truncate">
                  {t('app.title')}
                </h1>
                <p className="hidden sm:block text-[10px] opacity-70 leading-tight truncate">
                  {t('app.subtitle')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 ml-2 shrink-0">
            <SupportButton />
            <a
              href="/tutorial.html"
              className="hidden items-center gap-1.5 rounded-lg border border-white/20 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--evergreen)] shadow-sm transition-colors hover:bg-[var(--canvas)] lg:inline-flex"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {t('app.tutorial')}
            </a>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={t('app.fullscreen')}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button
              onClick={() => setShowInfoPanel(!showInfoPanel)}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={t('app.aboutTitle')}
            >
              {showInfoPanel ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Info className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </header>
        
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
              <TrailMap mapContainerRef={mapContainerRef} onReadyChange={setIsMapReady} />

              {!isMapReady && <AppLoadingOverlay />}

              {/* Aspect ratio crop preview when in Export panel */}
              {activePanel === 'export' && (
                <CropPreviewBars ratio={exportAspectRatio} containerRef={mapContainerRef} />
              )}

              {/* Stats Overlay */}
              {hasTracks && (
                <div className="absolute top-4 left-4 z-10">
                  <StatsOverlay compact={activePanel === 'export' || isExporting} />
                </div>
              )}

              {activePendingPicturePlacement && (
                <div className="absolute top-4 right-4 z-40 w-[min(24rem,calc(100%-2rem))] rounded-2xl border border-[var(--evergreen)]/15 bg-[var(--canvas)]/95 p-3 shadow-xl backdrop-blur">
                  <div className="flex items-start gap-3">
                    <img
                      src={activePendingPicturePlacement.url}
                      alt={activePendingPicturePlacement.file.name}
                      className="h-16 w-16 rounded-xl object-cover border border-[var(--evergreen)]/10 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[var(--trail-orange)] mb-1">
                        <MapPin className="w-4 h-4" />
                        <p className="text-sm font-semibold text-[var(--evergreen)]">
                          {t('media.manualPlacementTitle')}
                        </p>
                      </div>
                      <p className="text-xs text-[var(--evergreen-60)] leading-relaxed">
                        {t('media.manualPlacementHint')}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--evergreen-60)] truncate">
                        {activePendingPicturePlacement.file.name}
                      </p>
                      {activePendingPicturePlacement.mismatchDistanceMeters !== undefined && (
                        <p className="mt-1 text-[11px] font-medium text-[var(--trail-orange)]">
                          {t('media.manualPlacementDistance', {
                            distance: Math.round(activePendingPicturePlacement.mismatchDistanceMeters),
                          })}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] uppercase tracking-[0.08em] text-[var(--evergreen-60)]">
                        {t('media.manualPlacementCount', {
                          current: 1,
                          total: pendingPicturePlacements.length,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => removePendingPicturePlacement(activePendingPicturePlacement.id)}
                      className="rounded-lg border border-[var(--evergreen)]/15 px-3 py-1.5 text-xs font-medium text-[var(--evergreen)] hover:bg-[var(--evergreen)]/5"
                    >
                      {t('media.manualPlacementSkip')}
                    </button>
                    <button
                      onClick={clearPendingPicturePlacements}
                      className="rounded-lg bg-[var(--evergreen)] px-3 py-1.5 text-xs font-medium text-[var(--canvas)] hover:bg-[var(--evergreen)]/90"
                    >
                      {t('media.manualPlacementCancelAll')}
                    </button>
                  </div>
                </div>
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
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="bg-[var(--canvas)] border-2 border-[var(--evergreen)] rounded-xl p-8 text-center max-w-md">
                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                      <img
                        src="/media/images/logo.svg"
                        alt="TrailReplay"
                        className="h-16 w-16"
                      />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--evergreen)] mb-2">
                      {t('app.welcomeTitle')}
                    </h2>
                    <p className="text-[var(--evergreen-60)] mb-4">
                      {t('app.welcomeBody')}
                    </p>

                    {/* Help links */}
                    <div className="bg-[var(--evergreen)]/5 border border-[var(--evergreen)]/20 rounded-lg p-3 mb-6">
                      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--evergreen-60)]">
                        <span className="inline-flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          {t('app.welcomeNotice')}
                        </span>
                        <a
                          href="/tutorial.html"
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--evergreen)]/15 bg-white px-3 py-1 font-semibold text-[var(--evergreen)] transition-colors hover:border-[var(--trail-orange)]/40 hover:text-[var(--trail-orange)]"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          {t('app.tutorial')}
                        </a>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={openFilePicker}
                        className="tr-btn tr-btn-primary flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {t('app.uploadButton')}
                      </button>
                      <button
                        onClick={() => {
                          setExploreMode(true);
                          setShowSidebar(false);
                        }}
                        className="tr-btn tr-btn-secondary"
                      >
                        {t('app.exploreButton')}
                      </button>
                    </div>
                  </div>
                </div>
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
