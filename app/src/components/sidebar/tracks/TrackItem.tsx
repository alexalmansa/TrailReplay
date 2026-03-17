import { useState } from 'react';
import {
  Clock,
  Eye,
  EyeOff,
  GripVertical,
  Navigation,
  Palette,
  Play,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type { AppSettings, GPXTrack } from '@/types';
import { useI18n } from '@/i18n/useI18n';
import { formatDistance, formatDuration, formatSpeed } from '@/utils/units';
import { TRACK_COLORS } from './constants';

interface TrackItemProps {
  track: GPXTrack;
  index: number;
  isActive: boolean;
  onActivate: () => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
  onColorChange: (color: string) => void;
  onNameChange: (name: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  settings: AppSettings;
}

export function TrackItem({
  track,
  index,
  isActive,
  onActivate,
  onRemove,
  onToggleVisibility,
  onColorChange,
  onNameChange,
  onReorder,
  settings,
}: TrackItemProps) {
  const { t } = useI18n();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(track.name);

  const handleDragStart = (event: React.DragEvent) => {
    setIsDragging(true);
    event.dataTransfer.setData('trackIndex', index.toString());
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const fromIndex = Number.parseInt(event.dataTransfer.getData('trackIndex'), 10);
    if (fromIndex !== index) {
      onReorder(fromIndex, index);
    }
  };

  const pace = track.avgMovingSpeed > 0
    ? settings.unitSystem === 'metric'
      ? 60 / track.avgMovingSpeed
      : 60 / (track.avgMovingSpeed * 0.621371)
    : 0;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={handleDrop}
      className={`
        tr-journey-segment p-3 cursor-move transition-all
        ${isActive ? 'active ring-2 ring-[var(--trail-orange)]' : ''}
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-1 h-4 w-4 text-[var(--evergreen-40)]" />

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={onToggleVisibility}
              className="text-[var(--evergreen-60)] hover:text-[var(--evergreen)]"
            >
              {track.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>

            {isEditingName ? (
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                onBlur={() => {
                  if (editName.trim()) onNameChange(editName.trim());
                  setIsEditingName(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    if (editName.trim()) onNameChange(editName.trim());
                    setIsEditingName(false);
                  } else if (event.key === 'Escape') {
                    setEditName(track.name);
                    setIsEditingName(false);
                  }
                }}
                autoFocus
                className="min-w-0 flex-1 rounded border border-[var(--trail-orange)] bg-[var(--canvas)] px-1 py-0 text-sm font-medium outline-none"
                style={{ color: track.color }}
              />
            ) : (
              <span
                className="flex-1 cursor-text truncate text-sm font-medium decoration-dotted hover:underline"
                style={{ color: track.color }}
                onClick={() => {
                  setEditName(track.name);
                  setIsEditingName(true);
                }}
                title={t('tracks.clickRename')}
              >
                {track.name}
              </span>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="rounded p-1 hover:bg-[var(--evergreen)]/10"
              >
                <Palette className="h-4 w-4 text-[var(--evergreen-60)]" />
              </button>

              <button
                onClick={onActivate}
                className={`
                  rounded p-1
                  ${isActive
                    ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
                    : 'hover:bg-[var(--evergreen)]/10'}
                `}
              >
                <Play className="h-4 w-4" />
              </button>

              <button
                onClick={onRemove}
                className="rounded p-1 text-red-500 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded bg-[var(--evergreen)]/5 p-2">
              <div className="mb-1 flex items-center gap-1 text-[var(--evergreen-60)]">
                <Navigation className="h-3 w-3" />
                <span>{t('tracks.distance')}</span>
              </div>
              <span className="font-semibold text-[var(--evergreen)]">
                {formatDistance(track.totalDistance, settings.unitSystem)}
              </span>
            </div>

            <div className="rounded bg-[var(--evergreen)]/5 p-2">
              <div className="mb-1 flex items-center gap-1 text-[var(--evergreen-60)]">
                <Clock className="h-3 w-3" />
                <span>{t('tracks.time')}</span>
              </div>
              <span className="font-semibold text-[var(--evergreen)]">
                {formatDuration(track.movingTime || track.totalTime)}
              </span>
            </div>

            <div className="rounded bg-[var(--evergreen)]/5 p-2">
              <div className="mb-1 flex items-center gap-1 text-[var(--evergreen-60)]">
                <TrendingUp className="h-3 w-3" />
                <span>{t('tracks.speed')}</span>
              </div>
              <span className="font-semibold text-[var(--evergreen)]">
                {formatSpeed(track.avgMovingSpeed || track.avgSpeed, settings.unitSystem)}
              </span>
              {pace > 0 && (
                <span className="ml-1 text-[10px] text-[var(--evergreen-60)]">
                  ({Math.floor(pace)}:{String(Math.round((pace % 1) * 60)).padStart(2, '0')}/km)
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--evergreen-60)]">
            <span>↑ {formatDistance(track.elevationGain, settings.unitSystem)} {t('tracks.gain')}</span>
            <span>↓ {formatDistance(track.elevationLoss, settings.unitSystem)} {t('tracks.loss')}</span>
            <span>⚡ {formatSpeed(track.maxSpeed, settings.unitSystem)} {t('tracks.max')}</span>
            <span>{track.points.length.toLocaleString()} {t('tracks.points')}</span>
          </div>
        </div>
      </div>

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
                h-6 w-6 rounded-full border-2
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
