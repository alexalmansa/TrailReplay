import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/store/useAppStore';
import { useGPX } from '@/hooks/useGPX';
import { formatDistance, formatDuration, formatSpeed } from '@/utils/units';
import { 
  Upload, 
  GripVertical, 
  Eye, 
  EyeOff,
  Palette,
  Play,
  Trash2,
  Clock,
  TrendingUp,
  Navigation
} from 'lucide-react';

const TRACK_COLORS = [
  '#C1652F', // trail-orange
  '#3B82F6', // blue
  '#10B981', // green
  '#8B5CF6', // purple
  '#EF4444', // red
  '#F59E0B', // amber
  '#06B6D4', // cyan
  '#EC4899', // pink
];

interface TrackItemProps {
  track: import('@/types').GPXTrack;
  index: number;
  isActive: boolean;
  onActivate: () => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
  onColorChange: (color: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  settings: import('@/types').AppSettings;
}

function TrackItem({ track, index, isActive, onActivate, onRemove, onToggleVisibility, onColorChange, onReorder, settings }: TrackItemProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('trackIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('trackIndex'));
    if (fromIndex !== index) {
      onReorder(fromIndex, index);
    }
  };
  
  // Calculate pace (min/km or min/mile)
  const pace = track.avgMovingSpeed > 0 
    ? settings.unitSystem === 'metric' 
      ? 60 / track.avgMovingSpeed // min/km
      : 60 / (track.avgMovingSpeed * 0.621371) // min/mile
    : 0;
  
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        tr-journey-segment p-3 cursor-move transition-all
        ${isActive ? 'active ring-2 ring-[var(--trail-orange)]' : ''}
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-[var(--evergreen-40)] mt-1" />
        
        <div className="flex-1 min-w-0">
          {/* Track Name Row */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={onToggleVisibility}
              className="text-[var(--evergreen-60)] hover:text-[var(--evergreen)]"
            >
              {track.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            
            <span 
              className="font-medium text-sm truncate flex-1"
              style={{ color: track.color }}
            >
              {track.name}
            </span>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1 hover:bg-[var(--evergreen)]/10 rounded"
              >
                <Palette className="w-4 h-4 text-[var(--evergreen-60)]" />
              </button>
              
              <button
                onClick={onActivate}
                className={`
                  p-1 rounded
                  ${isActive 
                    ? 'bg-[var(--trail-orange)] text-[var(--canvas)]' 
                    : 'hover:bg-[var(--evergreen)]/10'
                  }
                `}
              >
                <Play className="w-4 h-4" />
              </button>
              
              <button
                onClick={onRemove}
                className="p-1 hover:bg-red-100 text-red-500 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-[var(--evergreen)]/5 rounded p-2">
              <div className="flex items-center gap-1 text-[var(--evergreen-60)] mb-1">
                <Navigation className="w-3 h-3" />
                <span>Distance</span>
              </div>
              <span className="font-semibold text-[var(--evergreen)]">
                {formatDistance(track.totalDistance, settings.unitSystem)}
              </span>
            </div>
            
            <div className="bg-[var(--evergreen)]/5 rounded p-2">
              <div className="flex items-center gap-1 text-[var(--evergreen-60)] mb-1">
                <Clock className="w-3 h-3" />
                <span>Time</span>
              </div>
              <span className="font-semibold text-[var(--evergreen)]">
                {formatDuration(track.movingTime || track.totalTime)}
              </span>
            </div>
            
            <div className="bg-[var(--evergreen)]/5 rounded p-2">
              <div className="flex items-center gap-1 text-[var(--evergreen-60)] mb-1">
                <TrendingUp className="w-3 h-3" />
                <span>Speed</span>
              </div>
              <span className="font-semibold text-[var(--evergreen)]">
                {formatSpeed(track.avgMovingSpeed || track.avgSpeed, settings.unitSystem)}
              </span>
              {pace > 0 && (
                <span className="text-[10px] text-[var(--evergreen-60)] ml-1">
                  ({Math.floor(pace)}:{String(Math.round((pace % 1) * 60)).padStart(2, '0')}/km)
                </span>
              )}
            </div>
          </div>
          
          {/* Additional Stats */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[var(--evergreen-60)]">
            <span>↑ {formatDistance(track.elevationGain, settings.unitSystem)} gain</span>
            <span>↓ {formatDistance(track.elevationLoss, settings.unitSystem)} loss</span>
            <span>⚡ {formatSpeed(track.maxSpeed, settings.unitSystem)} max</span>
            <span>{track.points.length.toLocaleString()} points</span>
          </div>
        </div>
      </div>
      
      {/* Color Picker */}
      {showColorPicker && (
        <div className="mt-2 flex flex-wrap gap-1">
          {TRACK_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                onColorChange(color);
                setShowColorPicker(false);
              }}
              className={`
                w-6 h-6 rounded-full border-2
                ${track.color === color ? 'border-[var(--evergreen)]' : 'border-transparent'}
              `}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TracksPanel() {
  const { parseFiles, isParsing } = useGPX();
  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const removeTrack = useAppStore((state) => state.removeTrack);
  const setActiveTrack = useAppStore((state) => state.setActiveTrack);
  const updateTrackColor = useAppStore((state) => state.updateTrackColor);
  const toggleTrackVisibility = useAppStore((state) => state.toggleTrackVisibility);
  const reorderTracks = useAppStore((state) => state.reorderTracks);
  const settings = useAppStore((state) => state.settings);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const gpxFiles = acceptedFiles.filter(
      (file) => file.name.endsWith('.gpx') || file.type === 'application/gpx+xml'
    );
    if (gpxFiles.length > 0) {
      await parseFiles(gpxFiles as unknown as FileList);
    }
  }, [parseFiles]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/gpx+xml': ['.gpx'],
    },
    multiple: true,
  });

  const handleReorder = (fromIndex: number, toIndex: number) => {
    reorderTracks(fromIndex, toIndex);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          tr-dropzone p-6
          ${isDragActive ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 mx-auto mb-3 text-[var(--evergreen-60)]" />
        <p className="text-sm font-medium text-[var(--evergreen)]">
          {isDragActive ? 'Drop GPX files here' : 'Drag & drop GPX files'}
        </p>
        <p className="text-xs text-[var(--evergreen-60)] mt-1">
          or click to browse
        </p>
      </div>
      
      {/* Loading */}
      {isParsing && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-5 h-5 border-2 border-[var(--trail-orange)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--evergreen)]">Parsing GPX files...</span>
        </div>
      )}
      
      {/* Track List */}
      {tracks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
              Loaded Tracks ({tracks.length})
            </h3>
            <span className="text-xs text-[var(--evergreen-60)]">
              Drag to reorder
            </span>
          </div>
          <div className="space-y-2">
            {tracks.map((track, index) => (
              <TrackItem
                key={track.id}
                track={track}
                index={index}
                isActive={activeTrackId === track.id}
                onActivate={() => setActiveTrack(track.id)}
                onRemove={() => removeTrack(track.id)}
                onToggleVisibility={() => toggleTrackVisibility(track.id)}
                onColorChange={(color) => updateTrackColor(track.id, color)}
                onReorder={handleReorder}
                settings={settings}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {tracks.length === 0 && !isParsing && (
        <div className="text-center py-8 text-[var(--evergreen-60)]">
          <p className="text-sm">No tracks loaded yet</p>
          <p className="text-xs mt-1">Upload GPX files to get started</p>
        </div>
      )}
    </div>
  );
}
