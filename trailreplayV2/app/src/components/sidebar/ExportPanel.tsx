import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { VideoExporter, estimateFileSize } from '@/utils/videoExport';
import { 
  Download, 
  Settings, 
  Check, 
  X,
  Film,
  Monitor
} from 'lucide-react';

const QUALITY_OPTIONS = [
  { value: 'low', label: '720p', resolution: { width: 1280, height: 720 } },
  { value: 'medium', label: '1080p', resolution: { width: 1920, height: 1080 } },
  { value: 'high', label: '1440p', resolution: { width: 2560, height: 1440 } },
  { value: 'ultra', label: '4K', resolution: { width: 3840, height: 2160 } },
];

const FPS_OPTIONS = [24, 30, 60];

export function ExportPanel() {
  const videoExportSettings = useAppStore((state) => state.videoExportSettings);
  const setVideoExportSettings = useAppStore((state) => state.setVideoExportSettings);
  const playback = useAppStore((state) => state.playback);
  const isExporting = useAppStore((state) => state.isExporting);
  const exportProgress = useAppStore((state) => state.exportProgress);
  const exportStage = useAppStore((state) => state.exportStage);
  const setIsExporting = useAppStore((state) => state.setIsExporting);
  const setExportProgress = useAppStore((state) => state.setExportProgress);
  const setExportStage = useAppStore((state) => state.setExportStage);
  
  const [showSettings, setShowSettings] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const exporterRef = useRef<VideoExporter | null>(null);
  
  const estimatedSize = estimateFileSize(playback.totalDuration, videoExportSettings);
  
  const handleStartExport = useCallback(async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('No map canvas found. Please load a track first.');
      return;
    }
    
    setIsExporting(true);
    setExportProgress(0);
    setExportStage('Preparing...');
    setExportedBlob(null);
    
    try {
      exporterRef.current = new VideoExporter(
        canvas as HTMLCanvasElement,
        videoExportSettings,
        (progress) => {
          setExportProgress(progress.progress);
          setExportStage(`Recording frame ${progress.frame}/${progress.totalFrames}`);
        }
      );
      
      await exporterRef.current.startRecording();
      
      // Simulate recording for demo (in real app, this would sync with animation)
      const duration = Math.min(playback.totalDuration / 1000, 30); // Max 30 seconds for demo
      
      setTimeout(() => {
        const blob = exporterRef.current?.stopRecording();
        if (blob) {
          setExportedBlob(blob);
          setExportStage('Complete!');
          
          // Auto download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `trail-replay-${Date.now()}.${videoExportSettings.format}`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setIsExporting(false);
      }, duration * 1000);
      
    } catch (error) {
      console.error('Export failed:', error);
      setExportStage('Export failed');
      setIsExporting(false);
    }
  }, [videoExportSettings, playback.totalDuration, setIsExporting, setExportProgress, setExportStage]);
  
  const handleCancelExport = useCallback(() => {
    exporterRef.current?.cancel();
    setIsExporting(false);
    setExportProgress(0);
    setExportStage('');
  }, [setIsExporting, setExportProgress, setExportStage]);
  
  const handleDownload = useCallback(() => {
    if (!exportedBlob) return;
    
    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trail-replay-${Date.now()}.${videoExportSettings.format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportedBlob, videoExportSettings.format]);

  return (
    <div className="space-y-4">
      {/* Export Settings Summary */}
      <div className="bg-[var(--evergreen)] text-[var(--canvas)] p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm uppercase tracking-wide">Export Settings</h3>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 hover:bg-white/10 rounded"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="opacity-70">Format:</span>
            <span className="ml-2 font-bold uppercase">{videoExportSettings.format}</span>
          </div>
          <div>
            <span className="opacity-70">Quality:</span>
            <span className="ml-2 font-bold">{QUALITY_OPTIONS.find(q => q.value === videoExportSettings.quality)?.label}</span>
          </div>
          <div>
            <span className="opacity-70">FPS:</span>
            <span className="ml-2 font-bold">{videoExportSettings.fps}</span>
          </div>
          <div>
            <span className="opacity-70">Est. Size:</span>
            <span className="ml-2 font-bold">{estimatedSize}</span>
          </div>
        </div>
      </div>
      
      {/* Export Options */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-[var(--evergreen)]">
          <input
            type="checkbox"
            checked={videoExportSettings.includeStats}
            onChange={(e) => setVideoExportSettings({ includeStats: e.target.checked })}
            className="w-4 h-4 accent-[var(--trail-orange)]"
          />
          Include Statistics Overlay
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--evergreen)]">
          <input
            type="checkbox"
            checked={videoExportSettings.includeElevation}
            onChange={(e) => setVideoExportSettings({ includeElevation: e.target.checked })}
            className="w-4 h-4 accent-[var(--trail-orange)]"
          />
          Include Elevation Profile
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--evergreen)]">
          <input
            type="checkbox"
            checked={videoExportSettings.includeStats}
            onChange={(e) => setVideoExportSettings({ includeStats: e.target.checked })}
            className="w-4 h-4 accent-[var(--trail-orange)]"
          />
          Include Stats Overlay
        </label>
      </div>
      
      {/* Export Button */}
      {!isExporting && !exportedBlob && (
        <button
          onClick={handleStartExport}
          className="w-full tr-btn tr-btn-primary flex items-center justify-center gap-2 py-3"
        >
          <Film className="w-5 h-5" />
          Start Recording
        </button>
      )}
      
      {/* Export Progress */}
      {isExporting && (
        <div className="tr-export-progress">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--evergreen)]">
              {exportStage}
            </span>
            <span className="text-sm font-bold text-[var(--trail-orange)]">
              {Math.round(exportProgress)}%
            </span>
          </div>
          
          <div className="tr-progress-bar mb-4">
            <div 
              className="tr-progress-fill"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          
          <button
            onClick={handleCancelExport}
            className="w-full tr-btn tr-btn-secondary flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      )}
      
      {/* Export Complete */}
      {exportedBlob && !isExporting && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <Check className="w-5 h-5" />
            <span className="font-medium">Export complete!</span>
          </div>
          
          <button
            onClick={handleDownload}
            className="w-full tr-btn tr-btn-primary flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Again
          </button>
          
          <button
            onClick={() => {
              setExportedBlob(null);
            }}
            className="w-full tr-btn tr-btn-secondary"
          >
            New Export
          </button>
        </div>
      )}
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--canvas)] border-2 border-[var(--evergreen)] rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[var(--evergreen)] mb-4">
              Export Settings
            </h3>
            
            {/* Format */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
                Format
              </label>
              <div className="flex gap-2">
                {(['webm', 'mp4'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setVideoExportSettings({ format })}
                    className={`
                      flex-1 py-2 px-3 rounded-lg text-sm font-medium uppercase transition-colors
                      ${videoExportSettings.format === format
                        ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
                        : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
                      }
                    `}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Quality */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
                Quality
              </label>
              <div className="grid grid-cols-2 gap-2">
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setVideoExportSettings({ 
                      quality: opt.value as any,
                      resolution: opt.resolution 
                    })}
                    className={`
                      py-2 px-3 rounded-lg text-sm font-medium transition-colors
                      ${videoExportSettings.quality === opt.value
                        ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
                        : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* FPS */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
                Frame Rate
              </label>
              <div className="flex gap-2">
                {FPS_OPTIONS.map((fps) => (
                  <button
                    key={fps}
                    onClick={() => setVideoExportSettings({ fps })}
                    className={`
                      flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                      ${videoExportSettings.fps === fps
                        ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
                        : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
                      }
                    `}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>
            
            {/* Estimated Size */}
            <div className="bg-[var(--evergreen)]/10 rounded-lg p-3 flex items-center gap-2 mb-4">
              <Monitor className="w-4 h-4 text-[var(--evergreen-60)]" />
              <span className="text-sm text-[var(--evergreen)]">
                Estimated file size: <strong>{estimatedSize}</strong>
              </span>
            </div>
            
            <button
              onClick={() => setShowSettings(false)}
              className="w-full tr-btn tr-btn-primary"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
