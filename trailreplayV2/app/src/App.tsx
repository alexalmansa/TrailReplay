import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TrailMap } from '@/components/map/TrailMap';
import { PlaybackControls } from '@/components/playback/PlaybackControls';
import { PlaybackProvider } from '@/components/playback/PlaybackProvider';
import { StatsOverlay } from '@/components/stats/StatsOverlay';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { PicturePopup } from '@/components/annotations/PicturePopup';
import { CameraControls } from '@/components/camera/CameraControls';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Menu, X, Maximize2, Minimize2 } from 'lucide-react';
import { gsap } from 'gsap';

function App() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  
  const tracks = useAppStore((state) => state.tracks);
  const pictures = useAppStore((state) => state.pictures);
  const playback = useAppStore((state) => state.playback);
  const settings = useAppStore((state) => state.settings);
  const error = useAppStore((state) => state.error);
  const setError = useAppStore((state) => state.setError);
  const selectedPictureId = useAppStore((state) => state.selectedPictureId);
  const setSelectedPictureId = useAppStore((state) => state.setSelectedPictureId);
  
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
              <img
                src="/media/images/logohorizontal.svg"
                alt="TrailReplay"
                className="h-7 w-auto"
              />
              <div>
                <h1 className="font-bold text-sm tracking-wide">Trail Replay</h1>
                <p className="text-[10px] opacity-70">GPX VISUALIZATION</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CameraControls />
            <a
              href="/app.html"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/30 text-white/90 hover:text-white hover:border-white/60 transition-colors"
              title="Switch to TrailReplay v1"
            >
              Switch to v1
            </a>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
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
              ref={mapContainerRef}
              className="flex-1 relative"
            >
              <TrailMap mapContainerRef={mapContainerRef} />
              
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
              
              {/* No tracks message */}
              {!hasTracks && (
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
                      Welcome to Trail Replay
                    </h2>
                    <p className="text-[var(--evergreen-60)] mb-6">
                      Upload GPX files to visualize your trails, create journeys, and export stunning videos.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <button 
                        onClick={() => setShowSidebar(true)}
                        className="tr-btn tr-btn-primary"
                      >
                        Get Started
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Playback Controls */}
            {hasTracks && (
              <div className="h-20 bg-[var(--canvas)] border-t-2 border-[var(--evergreen)]">
                <PlaybackControls />
              </div>
            )}
          </div>
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
