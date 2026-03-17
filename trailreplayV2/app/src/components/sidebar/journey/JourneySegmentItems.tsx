import { useI18n } from '@/i18n/useI18n';
import { useAppStore } from '@/store/useAppStore';
import type { JourneySegment } from '@/types';
import { formatDistance, formatDuration } from '@/utils/units';
import { TRANSPORT_ICONS } from '@/utils/journeyUtils';
import { Clock, Edit3, GripVertical, Play, Trash2 } from 'lucide-react';
import { TRANSPORT_MODES } from './journeyTransport';

interface SegmentItemProps {
  segment: JourneySegment;
  index: number;
  onRemove: () => void;
  onEditDuration: () => void;
  onSeek: () => void;
}

export function TrackSegmentItem({
  segment,
  index,
  onRemove,
  onEditDuration,
  onSeek,
}: SegmentItemProps) {
  const { t } = useI18n();
  const tracks = useAppStore((state) => state.tracks);
  const settings = useAppStore((state) => state.settings);

  if (segment.type !== 'track') return null;

  const track = tracks.find((trackItem) => trackItem.id === segment.trackId);
  if (!track) return null;

  const durationSeconds = (segment.duration || 0) / 1000;

  return (
    <div className="tr-journey-segment active flex items-center gap-2 group cursor-move p-2">
      <GripVertical className="w-4 h-4 text-[var(--evergreen-40)]" />

      <div className="w-6 h-6 rounded-full bg-[var(--trail-orange)] text-[var(--canvas)] flex items-center justify-center text-xs font-bold flex-shrink-0">
        {index + 1}
      </div>

      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: `${track.color}30` }}
      >
        🏃
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-[var(--evergreen)] truncate">{track.name}</p>

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
        <button onClick={onRemove} className="p-1.5 hover:bg-red-100 text-red-500 rounded">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function TransportSegmentItem({
  segment,
  index,
  onRemove,
  onEditDuration,
  onSeek,
}: SegmentItemProps) {
  const { t } = useI18n();
  if (segment.type !== 'transport') return null;

  const durationSeconds = (segment.duration || 0) / 1000;
  const modeInfo = TRANSPORT_MODES.find((transportMode) => transportMode.mode === segment.mode);
  const modeLabel = t(`stats.transportLabels.${segment.mode}`);

  return (
    <div className="bg-[var(--evergreen)]/10 border-2 border-dashed border-[var(--evergreen)]/30 rounded-lg flex items-center gap-2 group cursor-move p-2 ml-4">
      <GripVertical className="w-4 h-4 text-[var(--evergreen-40)]" />

      <div className="w-6 h-6 rounded-full bg-[var(--evergreen)]/30 text-[var(--evergreen)] flex items-center justify-center text-xs font-bold flex-shrink-0">
        {index + 1}
      </div>

      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: modeInfo ? `${modeInfo.color}30` : '#888' }}
      >
        {TRANSPORT_ICONS[segment.mode]}
      </div>

      <div className="flex-1">
        <p className="font-medium text-sm text-[var(--evergreen)]">
          {t('journey.transportSegment', { mode: modeLabel })}
        </p>

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
        <button onClick={onRemove} className="p-1.5 hover:bg-red-100 text-red-500 rounded">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
