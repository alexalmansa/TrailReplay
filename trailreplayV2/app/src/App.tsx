import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useGPX } from '@/hooks/useGPX';
import { TrailMap } from '@/components/map/TrailMap';
import { PlaybackControls } from '@/components/playback/PlaybackControls';
import { PlaybackProvider } from '@/components/playback/PlaybackProvider';
import { StatsOverlay } from '@/components/stats/StatsOverlay';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { PicturePopup } from '@/components/annotations/PicturePopup';
import { SupportButton } from '@/components/header/SupportButton';
import { InfoPanel } from '@/components/info/InfoPanel';
import { FeedbackSolicitation } from '@/components/feedback/FeedbackSolicitation';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Menu, X, Maximize2, Minimize2, Upload, ArrowLeftRight, Info } from 'lucide-react';
import { gsap } from 'gsap';

import type { AspectRatio } from '@/types';

/** Dark letterbox bars showing what will be cropped for the selected aspect ratio */
function CropPreviewBars({
  ratio,
  containerRef,
}: {
  ratio: AspectRatio;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [bars, setBars] = useState<{ left: number; right: number; top: number; bottom: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      const containerAspect = W / H;
      let targetAspect = ratio === '16:9' ? 16 / 9 : ratio === '1:1' ? 1 : 9 / 16;
      if (containerAspect > targetAspect) {
        // Crop left/right
        const cropW = H * targetAspect;
        const bar = (W - cropW) / 2;
        setBars({ left: bar, right: bar, top: 0, bottom: 0 });
      } else {
        // Crop top/bottom
        const cropH = W / targetAspect;
        const bar = (H - cropH) / 2;
        setBars({ left: 0, right: 0, top: bar, bottom: bar });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio, containerRef]);

  if (!bars) return null;
  return (
    <>
      {bars.left > 0 && <>
        <div className="absolute inset-y-0 left-0 bg-black/55 z-30 pointer-events-none" style={{ width: bars.left }} />
        <div className="absolute inset-y-0 right-0 bg-black/55 z-30 pointer-events-none" style={{ width: bars.right }} />
      </>}
      {bars.top > 0 && <>
        <div className="absolute inset-x-0 top-0 bg-black/55 z-30 pointer-events-none" style={{ height: bars.top }} />
        <div className="absolute inset-x-0 bottom-0 bg-black/55 z-30 pointer-events-none" style={{ height: bars.bottom }} />
      </>}
      {/* Label */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-black/70 text-white text-xs px-2 py-0.5 rounded">
        Export crop: {ratio}
      </div>
    </>
  );
}

function App() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  const { parseFiles } = useGPX();
  const tracks = useAppStore((state) => state.tracks);
  const pictures = useAppStore((state) => state.pictures);
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);
  const error = useAppStore((state) => state.error);
  const setError = useAppStore((state) => state.setError);
  const selectedPictureId = useAppStore((state) => state.selectedPictureId);
  const setSelectedPictureId = useAppStore((state) => state.setSelectedPictureId);
  const activePanel = useAppStore((state) => state.activePanel);
  const exportAspectRatio = useAppStore((state) => state.videoExportSettings.aspectRatio);
  
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
    [parseFiles]
  );

  // Trigger file picker
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };
  
  // Get active picture for current progress
  const selectedPicture = selectedPictureId
    ? pictures.find((p) => p.id === selectedPictureId)
    : undefined;
  const playbackPicture = pictures.find(
    (p) => Math.abs(p.progress - playback.progress) < 0.005 && playback.isPlaying
  );
  const activePicture = selectedPicture || playbackPicture;
  
  const hasTracks = tracks.length > 0;
  
  return (
    <PlaybackProvider>
      <div className="app-container min-h-screen bg-[var(--canvas)] flex flex-col">
        {/* Header */}
        <header className="h-14 bg-[var(--evergreen)] text-[var(--canvas)] flex items-center justify-between px-4 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {showSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-white rounded-md p-1">
                <img
                  src="/media/images/simplelogo.png"
                  alt="TrailReplay"
                  className="h-6 w-6 object-contain"
                />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-wide">Trail Replay</h1>
                <p className="text-[10px] opacity-70">GPX VISUALIZATION</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <SupportButton />
            <div className="flex items-center rounded-full border border-white/30 bg-white/10 p-0.5">
              <a
                href="/app"
                className="px-3 py-1 text-xs font-semibold rounded-full bg-white/90 text-[var(--evergreen)]"
                aria-current="page"
              >
                v2
              </a>
              <a
                href="/app-v1.html"
                className="px-3 py-1 text-xs font-semibold rounded-full text-white/90 hover:text-white"
              >
                v1
              </a>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowInfoPanel(!showInfoPanel)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="About & Info"
            >
              {showInfoPanel ? <X className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            </button>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          {showSidebar && (
            <div className="w-80 flex-shrink-0 border-r-2 border-[var(--evergreen)] overflow-hidden">
              <Sidebar />
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
              <TrailMap mapContainerRef={mapContainerRef} />

              {/* Aspect ratio crop preview when in Export panel */}
              {activePanel === 'export' && exportAspectRatio !== '16:9' && (
                <CropPreviewBars ratio={exportAspectRatio} containerRef={mapContainerRef} />
              )}

              {/* Stats Overlay */}
              {hasTracks && (
                <div className="absolute top-4 left-4 z-10">
                  <StatsOverlay />
                </div>
              )}
              
              {/* Picture Popup */}
              {activePicture && settings.showPictures && (
                <PicturePopup 
                  picture={activePicture} 
                  onClose={() => {
                    if (selectedPictureId === activePicture.id) {
                      setSelectedPictureId(null);
                    }
                  }} 
                />
              )}
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".gpx,application/gpx+xml"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {/* No tracks message */}
              {!hasTracks && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="bg-[var(--canvas)] border-2 border-[var(--evergreen)] rounded-xl p-8 text-center max-w-md">
                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                      <img
                        src="/app/media/images/logo.svg"
                        alt="TrailReplay"
                        className="h-16 w-16"
                      />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--evergreen)] mb-2">
                      Welcome to Trail Replay v2
                    </h2>
                    <p className="text-[var(--evergreen-60)] mb-4">
                      Upload GPX files to visualize your trails, create journeys, and export stunning videos.
                    </p>

                    {/* v1/v2 notice */}
                    <div className="bg-[var(--evergreen)]/5 border border-[var(--evergreen)]/20 rounded-lg p-3 mb-6">
                      <div className="flex items-center justify-center gap-2 text-xs text-[var(--evergreen-60)]">
                        <ArrowLeftRight className="w-4 h-4" />
                        <span>
                          New v2 experience! Switch between versions using the toggle in the header.
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={openFilePicker}
                        className="tr-btn tr-btn-primary flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload GPX Files
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback Solicitation */}
              {hasTracks && <FeedbackSolicitation />}
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
            <div className="w-80 flex-shrink-0 overflow-hidden">
              <InfoPanel onClose={() => setShowInfoPanel(false)} />
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
