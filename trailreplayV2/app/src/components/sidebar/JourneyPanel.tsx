import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { TransportMode, JourneySegment, TransportSegment } from '@/types';
import { formatDistance, formatDuration } from '@/utils/units';
import { calculateDistance } from '@/utils/journeyUtils';
import { useI18n } from '@/i18n/useI18n';
import {
  Plus,
  Car,
  Bus,
  Train,
  Plane,
  Bike,
  Ship,
  GripVertical,
  Trash2,
  Footprints,
  Clock,
  Settings2,
  Route,
  Play,
  Edit3,
  GitCompareArrows,
} from 'lucide-react';

const TRANSPORT_MODES: { mode: TransportMode; icon: typeof Car; labelKey: string; color: string }[] = [
  { mode: 'car', icon: Car, labelKey: 'stats.transportLabels.car', color: '#3B82F6' },
  { mode: 'bus', icon: Bus, labelKey: 'stats.transportLabels.bus', color: '#8B5CF6' },
  { mode: 'train', icon: Train, labelKey: 'stats.transportLabels.train', color: '#10B981' },
  { mode: 'plane', icon: Plane, labelKey: 'stats.transportLabels.plane', color: '#06B6D4' },
  { mode: 'bike', icon: Bike, labelKey: 'stats.transportLabels.bike', color: '#F59E0B' },
  { mode: 'walk', icon: Footprints, labelKey: 'stats.transportLabels.walk', color: '#EC4899' },
  { mode: 'ferry', icon: Ship, labelKey: 'stats.transportLabels.ferry', color: '#6366F1' },
];

const TRANSPORT_ICONS: Record<TransportMode, string> = {
  car: '🚗',
  bus: '🚌',
  train: '🚆',
  plane: '✈️',
  bike: '🚲',
  walk: '🚶',
  ferry: '⛴️',
};

export function JourneyPanel() {
  const { t } = useI18n();
  const tracks = useAppStore((state) => state.tracks);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const comparisonTracks = useAppStore((state) => state.comparisonTracks);
  const addJourneySegment = useAppStore((state) => state.addJourneySegment);
  const removeJourneySegment = useAppStore((state) => state.removeJourneySegment);
  const reorderJourneySegments = useAppStore((state) => state.reorderJourneySegments);
  const updateJourneySegmentDuration = useAppStore((state) => state.updateJourneySegmentDuration);
  const clearJourney = useAppStore((state) => state.clearJourney);
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const seekToProgress = useAppStore((state) => state.seekToProgress);
  
  const [showTransportMenu, setShowTransportMenu] = useState(false);
  const [selectedTransportIndex, setSelectedTransportIndex] = useState<number | null>(null);
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const [customDuration, setCustomDuration] = useState<number>(30);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Calculate total journey stats
  const totalDistance = journeySegments.reduce((sum, seg) => {
    if (seg.type === 'track') {
      const track = tracks.find((t) => t.id === seg.trackId);
      return sum + (track?.totalDistance || 0);
    }
    return sum + (seg.distance || 0);
  }, 0);
  
  const totalDuration = journeySegments.reduce((sum, seg) => {
    return sum + (seg.duration || 0);
  }, 0);
  
  // Calculate progress for each segment
  const getSegmentProgress = (index: number): number => {
    let progress = 0;
    for (let i = 0; i < index; i++) {
      progress += (journeySegments[i].duration || 0) / totalDuration;
    }
    return progress;
  };
  
  const addTrackToJourney = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    
    const defaultDuration = (settings.defaultTotalTime || 30) * 1000;
    
    addJourneySegment({
      id: `track-seg-${Date.now()}`,
      type: 'track',
      trackId: track.id,
      duration: defaultDuration,
    });
  };

  const addAllTracksToJourney = () => {
    tracks.forEach((track) => {
      const isInJourney = journeySegments.some(
        (segment) => segment.type === 'track' && segment.trackId === track.id
      );
      if (!isInJourney) {
        addTrackToJourney(track.id);
      }
    });
  };
  
  const addTransport = (mode: TransportMode) => {
    if (selectedTransportIndex === null) return;

    const prevSegment = journeySegments[selectedTransportIndex];
    const nextSegment = journeySegments[selectedTransportIndex + 1];

    let from = { lat: 0, lon: 0 };
    let to = { lat: 0, lon: 0 };

    if (prevSegment?.type === 'track') {
      const prevTrack = tracks.find((t) => t.id === prevSegment.trackId);
      if (prevTrack) {
        const lastPoint = prevTrack.points[prevTrack.points.length - 1];
        from = { lat: lastPoint.lat, lon: lastPoint.lon };
      }
    }

    if (nextSegment?.type === 'track') {
      const nextTrack = tracks.find((t) => t.id === nextSegment.trackId);
      if (nextTrack) {
        const firstPoint = nextTrack.points[0];
        to = { lat: firstPoint.lat, lon: firstPoint.lon };
      }
    }

    // Calculate distance between the two points
    const distance = calculateDistance(from.lat, from.lon, to.lat, to.lon);

    // Calculate default duration based on mode and distance
    const speeds: Record<TransportMode, number> = {
      car: 50, bus: 30, train: 80, plane: 500, bike: 15, walk: 4, ferry: 25,
    };
    const speed = speeds[mode] || 30;
    const defaultDuration = Math.max(3000, (distance / speed) * 3600 * 1000); // min 3 seconds

    const newTransportSegment: TransportSegment = {
      id: `transport-${Date.now()}`,
      type: 'transport',
      mode,
      from,
      to,
      duration: Math.min(defaultDuration, 10000), // Cap at 10 seconds for animation
      distance,
    };

    // Insert the transport segment at the correct position
    const newSegments = [...journeySegments];
    newSegments.splice(selectedTransportIndex + 1, 0, newTransportSegment);
    reorderJourneySegments(newSegments);

    setShowTransportMenu(false);
    setSelectedTransportIndex(null);
  };
  
  const updateSegmentDuration = (segmentId: string, duration: number) => {
    updateJourneySegmentDuration(segmentId, duration * 1000);
    setEditingSegment(null);
  };
  
  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newSegments = [...journeySegments];
    const draggedItem = newSegments[draggedIndex];
    newSegments.splice(draggedIndex, 1);
    newSegments.splice(index, 0, draggedItem);
    
    reorderJourneySegments(newSegments);
    setDraggedIndex(index);
  };
  
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Journey Configuration */}
      <div className="bg-[var(--evergreen)]/5 border border-[var(--evergreen)]/20 rounded-lg p-3">
        <h3 className="text-xs font-bold text-[var(--evergreen)] uppercase tracking-wide mb-2 flex items-center gap-1">
          <Settings2 className="w-3 h-3" />
          {t('journey.defaultSettings')}
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-[var(--evergreen-60)]">{t('journey.defaultTrackTime')}</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={settings.defaultTotalTime || 30}
                onChange={(e) => setSettings({ defaultTotalTime: Math.max(1, parseInt(e.target.value) || 30) })}
                className="w-16 px-2 py-1 text-xs border border-[var(--evergreen)]/30 rounded bg-[var(--canvas)]"
                min="1"
              />
              <span className="text-xs text-[var(--evergreen-60)]">{t('common.secondsShort')}</span>
            </div>
          </div>
          <p className="text-[10px] text-[var(--evergreen-60)]">
            {t('journey.defaultTrackTimeHint')}
          </p>
        </div>
      </div>
      
      {/* Journey Stats */}
      {journeySegments.length > 0 && (
        <div className="bg-[var(--evergreen)] text-[var(--canvas)] p-3 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>{t('journey.totalDistance')}</span>
            <span className="font-bold">{formatDistance(totalDistance, settings.unitSystem)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span>{t('journey.totalDuration')}</span>
            <span className="font-bold">{formatDuration(totalDuration / 1000)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span>{t('journey.totalSegments')}</span>
            <span className="font-bold">{journeySegments.length}</span>
          </div>
        </div>
      )}

      {/* Quick Start */}
      {tracks.length > 0 && (
        <div className="bg-[var(--trail-orange-15)] border border-[var(--trail-orange)]/30 rounded-lg p-3">
          <h3 className="text-xs font-bold text-[var(--trail-orange)] uppercase tracking-wide mb-2">
            {t('journey.quickStart')}
          </h3>
          <p className="text-xs text-[var(--evergreen)]">
            {t('journey.quickStartHint')}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={addAllTracksToJourney}
              className="flex-1 tr-btn tr-btn-primary"
            >
              {t('journey.addAllTracks')}
            </button>
            {journeySegments.length > 0 && (
              <button
                onClick={() => clearJourney()}
                className="flex-1 tr-btn tr-btn-secondary"
              >
                {t('journey.clearJourney')}
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Add Tracks */}
      {tracks.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[var(--evergreen)] mb-2 uppercase tracking-wide">
            {t('journey.addTracksTitle')}
          </h3>
          <p className="text-xs text-[var(--evergreen-60)] mb-2">
            {t('journey.addTracksHint')}
          </p>
          <div className="space-y-1">
            {tracks.map((track) => {
              const isInJourney = journeySegments.some(s => s.type === 'track' && s.trackId === track.id);
              return (
                <button
                  key={track.id}
                  onClick={() => addTrackToJourney(track.id)}
                  disabled={isInJourney}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm
                    transition-colors
                    ${isInJourney 
                      ? 'bg-[var(--evergreen)]/10 text-[var(--evergreen-60)] cursor-not-allowed' 
                      : 'bg-[var(--evergreen)]/5 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/10'
                    }
                  `}
                >
                  <Plus className="w-4 h-4" />
                  <span className="flex-1 truncate">{track.name}</span>
                  {isInJourney && <span className="text-xs">({t('journey.added')})</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Journey Timeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide flex items-center gap-2">
            <Route className="w-4 h-4" />
            {t('journey.timelineTitle')}
          </h3>
          {journeySegments.length > 0 && (
            <span className="text-xs text-[var(--evergreen-60)]">
              {t('journey.dragToReorder')}
            </span>
          )}
        </div>
        
        {journeySegments.length === 0 ? (
          <div className="text-center py-8 text-[var(--evergreen-60)] border-2 border-dashed border-[var(--evergreen)]/20 rounded-lg">
            <p className="text-sm">{t('journey.emptyTitle')}</p>
            <p className="text-xs mt-1">{t('journey.emptySubtitle')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {journeySegments.map((segment, index) => (
              <div 
                key={segment.id} 
                className={`
                  ${draggedIndex === index ? 'opacity-50' : ''}
                `}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                {segment.type === 'track' ? (
                  <TrackSegmentItem 
                    segment={segment} 
                    index={index}
                    onRemove={() => removeJourneySegment(segment.id)}
                    onEditDuration={() => {
                      setEditingSegment(segment.id);
                      setCustomDuration((segment.duration || 30000) / 1000);
                    }}
                    onSeek={() => seekToProgress(getSegmentProgress(index))}
                  />
                ) : (
                  <TransportSegmentItem 
                    segment={segment} 
                    index={index}
                    onRemove={() => removeJourneySegment(segment.id)}
                    onEditDuration={() => {
                      setEditingSegment(segment.id);
                      setCustomDuration((segment.duration || 5000) / 1000);
                    }}
                    onSeek={() => seekToProgress(getSegmentProgress(index))}
                  />
                )}
                
                {/* Add Transport Button */}
                {index < journeySegments.length - 1 && 
                 journeySegments[index].type === 'track' && 
                 journeySegments[index + 1].type === 'track' && (
                  <button
                    onClick={() => {
                      setSelectedTransportIndex(index);
                      setShowTransportMenu(true);
                    }}
                    className="ml-8 mt-1 text-xs text-[var(--trail-orange)] hover:underline flex items-center gap-1 bg-[var(--trail-orange-15)] px-2 py-1 rounded"
                  >
                    <Plus className="w-3 h-3" />
                    {t('journey.addTransport')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Comparison Tracks running simultaneously */}
      {comparisonTracks.length > 0 && journeySegments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <GitCompareArrows className="w-4 h-4 text-[var(--evergreen-60)]" />
            <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
              {t('journey.runsSimultaneously')}
            </h3>
          </div>
          <div className="rounded-lg border-2 border-dashed border-[var(--evergreen)]/30 p-3 space-y-2 bg-[var(--evergreen)]/3">
            <p className="text-xs text-[var(--evergreen-60)] mb-2">
              {t('journey.runsSimultaneouslyHint')}
            </p>
            {comparisonTracks.map((ct) => (
              <div
                key={ct.id}
                className="flex items-center gap-3 bg-[var(--canvas)] rounded-lg p-2 border border-[var(--evergreen)]/10"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: ct.color + '25' }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ct.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--evergreen)] truncate">{ct.name}</p>
                  <div className="flex gap-3 text-[10px] text-[var(--evergreen-60)] mt-0.5">
                    <span>{formatDistance(ct.track.totalDistance, settings.unitSystem)}</span>
                    {ct.track.totalTime > 0 && <span>{formatDuration(ct.track.totalTime)}</span>}
                  </div>
                </div>
                {/* Visual indicator showing it runs across full journey */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: ct.color + '40' }}>
                      <div className="h-full w-full rounded-full" style={{ backgroundColor: ct.color, opacity: 0.7 }} />
                    </div>
                  </div>
                  <span className="text-[9px] text-[var(--evergreen-60)]">{t('journey.fullJourney')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transport Mode Selector */}
      {showTransportMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--canvas)] border-2 border-[var(--evergreen)] rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-[var(--evergreen)] mb-2">
              {t('journey.selectTransportTitle')}
            </h3>
            <p className="text-sm text-[var(--evergreen-60)] mb-4">
              {t('journey.selectTransportHint')}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {TRANSPORT_MODES.map(({ mode, icon: Icon, labelKey, color }) => (
                <button
                  key={mode}
                  onClick={() => addTransport(mode)}
                  className="flex flex-col items-center gap-2 p-3 border-2 border-[var(--evergreen)]/20 rounded-lg hover:border-[var(--trail-orange)] hover:bg-[var(--trail-orange-15)] transition-colors"
                >
                  <Icon className="w-6 h-6" style={{ color }} />
                  <span className="text-xs text-[var(--evergreen)]">{t(labelKey)}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowTransportMenu(false);
                setSelectedTransportIndex(null);
              }}
              className="mt-4 w-full tr-btn tr-btn-secondary"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
      
      {/* Duration Editor Modal */}
      {editingSegment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--canvas)] border-2 border-[var(--evergreen)] rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-[var(--evergreen)] mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('journey.editDurationTitle')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-[var(--evergreen-60)] mb-1 block">
                  {t('journey.durationSeconds')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-2 border-2 border-[var(--evergreen)]/30 rounded-lg bg-[var(--canvas)] text-[var(--evergreen)]"
                    min="1"
                    autoFocus
                  />
                  <span className="text-sm text-[var(--evergreen-60)]">{t('common.secondsShort')}</span>
                </div>
                <p className="text-xs text-[var(--evergreen-60)] mt-2">
                  {t('journey.durationHint')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingSegment(null)}
                  className="flex-1 tr-btn tr-btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => updateSegmentDuration(editingSegment, customDuration)}
                  className="flex-1 tr-btn tr-btn-primary"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SegmentItemProps {
  segment: JourneySegment;
  index: number;
  onRemove: () => void;
  onEditDuration: () => void;
  onSeek: () => void;
}

function TrackSegmentItem({ 
  segment, 
  index,
  onRemove,
  onEditDuration,
  onSeek
}: SegmentItemProps) {
  const { t } = useI18n();
  const tracks = useAppStore((state) => state.tracks);
  const settings = useAppStore((state) => state.settings);
  
  if (segment.type !== 'track') return null;
  
  const track = tracks.find((t) => t.id === segment.trackId);
  if (!track) return null;
  
  const durationSeconds = (segment.duration || 0) / 1000;
  
  return (
    <div className="tr-journey-segment active flex items-center gap-2 group cursor-move p-2">
      <GripVertical className="w-4 h-4 text-[var(--evergreen-40)]" />
      
      {/* Segment Number */}
      <div className="w-6 h-6 rounded-full bg-[var(--trail-orange)] text-[var(--canvas)] flex items-center justify-center text-xs font-bold flex-shrink-0">
        {index + 1}
      </div>
      
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: track.color + '30' }}
      >
        🏃
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-[var(--evergreen)] truncate">
          {track.name}
        </p>
        
        {/* Duration - prominently displayed and clickable */}
        <button
          onClick={onEditDuration}
          className="flex items-center gap-1 text-xs bg-[var(--trail-orange-15)] text-[var(--trail-orange)] px-2 py-0.5 rounded-full hover:bg-[var(--trail-orange)]/20 transition-colors mt-1"
        >
          <Clock className="w-3 h-3" />
          <span className="font-semibold">{formatDuration(durationSeconds)}</span>
          <Edit3 className="w-3 h-3 ml-1 opacity-50" />
        </button>
        
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--evergreen-60)] mt-1">
          <span>{formatDistance(track.totalDistance, settings.unitSystem)}</span>
          <span>↑{formatDistance(track.elevationGain, settings.unitSystem)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={onSeek}
          className="p-1.5 hover:bg-[var(--evergreen)]/10 rounded"
          title={t('journey.goToSegment')}
        >
          <Play className="w-4 h-4 text-[var(--evergreen-60)]" />
        </button>
        <button
          onClick={onRemove}
          className="p-1.5 hover:bg-red-100 text-red-500 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function TransportSegmentItem({ 
  segment, 
  index,
  onRemove,
  onEditDuration,
  onSeek
}: SegmentItemProps) {
  const { t } = useI18n();
  if (segment.type !== 'transport') return null;
  
  const durationSeconds = (segment.duration || 0) / 1000;
  const modeInfo = TRANSPORT_MODES.find(m => m.mode === segment.mode);
  const modeLabel = t(`stats.transportLabels.${segment.mode}`);
  
  return (
    <div className="bg-[var(--evergreen)]/10 border-2 border-dashed border-[var(--evergreen)]/30 rounded-lg flex items-center gap-2 group cursor-move p-2 ml-4">
      <GripVertical className="w-4 h-4 text-[var(--evergreen-40)]" />
      
      {/* Segment Number */}
      <div className="w-6 h-6 rounded-full bg-[var(--evergreen)]/30 text-[var(--evergreen)] flex items-center justify-center text-xs font-bold flex-shrink-0">
        {index + 1}
      </div>
      
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: modeInfo?.color + '30' || '#888' }}
      >
        {TRANSPORT_ICONS[segment.mode]}
      </div>
      
      <div className="flex-1">
        <p className="font-medium text-sm text-[var(--evergreen)]">
          {t('journey.transportSegment', { mode: modeLabel })}
        </p>
        
        {/* Duration - prominently displayed and clickable */}
        <button
          onClick={onEditDuration}
          className="flex items-center gap-1 text-xs bg-[var(--trail-orange-15)] text-[var(--trail-orange)] px-2 py-0.5 rounded-full hover:bg-[var(--trail-orange)]/20 transition-colors mt-1"
        >
          <Clock className="w-3 h-3" />
          <span className="font-semibold">{formatDuration(durationSeconds)}</span>
          <Edit3 className="w-3 h-3 ml-1 opacity-50" />
        </button>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={onSeek}
          className="p-1.5 hover:bg-[var(--evergreen)]/10 rounded"
          title={t('journey.goToSegment')}
        >
          <Play className="w-4 h-4 text-[var(--evergreen-60)]" />
        </button>
        <button
          onClick={onRemove}
          className="p-1.5 hover:bg-red-100 text-red-500 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
