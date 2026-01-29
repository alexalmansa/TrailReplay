import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { VideoExportSettings } from '@/types';
import { VideoExporter, estimateFileSize, getResolutionForQuality } from '@/utils/videoExport';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Video,
  Download,
  Settings,
  Check,
  X,
  Film,
  Monitor,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface VideoExportProps {
  className?: string;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
}

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low (720p)', resolution: { width: 1280, height: 720 } },
  { value: 'medium', label: 'Medium (1080p)', resolution: { width: 1920, height: 1080 } },
  { value: 'high', label: 'High (1440p)', resolution: { width: 2560, height: 1440 } },
  { value: 'ultra', label: 'Ultra (4K)', resolution: { width: 3840, height: 2160 } },
];

const FPS_OPTIONS = [24, 30, 60];

export function VideoExport({ className = '', mapContainerRef }: VideoExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  
  const videoExportSettings = useAppStore((state) => state.videoExportSettings);
  const setVideoExportSettings = useAppStore((state) => state.setVideoExportSettings);
  const playback = useAppStore((state) => state.playback);
  
  const exporterRef = useRef<VideoExporter | null>(null);
  
  const estimatedSize = estimateFileSize(playback.totalDuration, videoExportSettings);
  
  const handleStartExport = useCallback(async () => {
    if (!mapContainerRef.current) return;
    
    const canvas = mapContainerRef.current.querySelector('canvas');
    if (!canvas) {
      alert('No map canvas found. Please load a track first.');
      return;
    }
    
    setIsExporting(true);
    setExportProgress(0);
    setExportComplete(false);
    
    try {
      // Create exporter
      exporterRef.current = new VideoExporter(
        canvas as HTMLCanvasElement,
        videoExportSettings,
        (progress) => {
          setExportProgress(progress.progress);
        }
      );
      
      // Start recording
      await exporterRef.current.startRecording();
      
      // Wait for recording to complete (simulate for now)
      setTimeout(() => {
        const blob = exporterRef.current?.stopRecording();
        if (blob) {
          setExportedBlob(blob);
          setExportComplete(true);
          
          // Auto download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `trail-replay-${Date.now()}.${videoExportSettings.format}`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setIsExporting(false);
      }, 5000); // 5 second demo recording
      
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
    }
  }, [mapContainerRef, videoExportSettings, playback.totalDuration]);
  
  const handleCancelExport = useCallback(() => {
    exporterRef.current?.cancel();
    setIsExporting(false);
    setExportProgress(0);
  }, []);
  
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
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Video className="w-5 h-5 text-orange-500" />
          Video Export
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(true)}
          className="text-gray-600"
        >
          <Settings className="w-4 h-4 mr-1" />
          Settings
        </Button>
      </div>
      
      {/* Export settings summary */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500">Format</p>
          <p className="font-medium uppercase">{videoExportSettings.format}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500">Quality</p>
          <p className="font-medium">{videoExportSettings.quality}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500">FPS</p>
          <p className="font-medium">{videoExportSettings.fps}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500">Est. Size</p>
          <p className="font-medium">{estimatedSize}</p>
        </div>
      </div>
      
      {/* Export button */}
      {!isExporting && !exportComplete && (
        <Button
          onClick={handleStartExport}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Film className="w-4 h-4 mr-2" />
          Start Recording
        </Button>
      )}
      
      {/* Export progress */}
      {isExporting && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Recording...</span>
            <span className="font-medium">{Math.round(exportProgress)}%</span>
          </div>
          <Progress value={exportProgress} className="h-2" />
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancelExport}
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}
      
      {/* Export complete */}
      {exportComplete && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <Check className="w-5 h-5" />
            <span className="font-medium">Export complete!</span>
          </div>
          <Button
            onClick={handleDownload}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Again
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setExportComplete(false);
              setExportedBlob(null);
            }}
            className="w-full"
          >
            New Export
          </Button>
        </div>
      )}
      
      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Settings</DialogTitle>
            <DialogDescription>
              Configure video export quality and options
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Format */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <Select
                value={videoExportSettings.format}
                onValueChange={(value: 'webm' | 'mp4') =>
                  setVideoExportSettings({ format: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webm">WebM (Recommended)</SelectItem>
                  <SelectItem value="mp4">MP4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Quality */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quality</label>
              <Select
                value={videoExportSettings.quality}
                onValueChange={(value: VideoExportSettings['quality']) => {
                  setVideoExportSettings({
                    quality: value,
                    resolution: getResolutionForQuality(value),
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* FPS */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Frame Rate</label>
              <div className="flex gap-2">
                {FPS_OPTIONS.map((fps) => (
                  <button
                    key={fps}
                    onClick={() => setVideoExportSettings({ fps })}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      videoExportSettings.fps === fps
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>
            
            {/* Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Options</label>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Include Statistics</span>
                <Switch
                  checked={videoExportSettings.includeStats}
                  onCheckedChange={(checked) =>
                    setVideoExportSettings({ includeStats: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Include Elevation</span>
                <Switch
                  checked={videoExportSettings.includeElevation}
                  onCheckedChange={(checked) =>
                    setVideoExportSettings({ includeElevation: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Include Audio</span>
                <Switch
                  checked={videoExportSettings.includeAudio}
                  onCheckedChange={(checked) =>
                    setVideoExportSettings({ includeAudio: checked })
                  }
                />
              </div>
            </div>
            
            {/* Estimated size */}
            <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Estimated file size: <strong>{estimatedSize}</strong>
              </span>
            </div>
          </div>
          
          <Button onClick={() => setShowSettings(false)} className="w-full">
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
