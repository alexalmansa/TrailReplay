import { useState } from 'react';
import { X } from 'lucide-react';
import type { AppSettings, ComparisonTrack } from '@/types';
import { useI18n } from '@/i18n/useI18n';
import { formatDistance } from '@/utils/units';

interface ComparisonTrackItemProps {
  track: ComparisonTrack;
  settings: AppSettings;
  onNameChange: (name: string) => void;
  onRemove: () => void;
}

export function ComparisonTrackItem({
  track,
  settings,
  onNameChange,
  onRemove,
}: ComparisonTrackItemProps) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(track.name);

  return (
    <div className="tr-journey-segment p-3">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: track.color }} />
        {isEditing ? (
          <input
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            onBlur={() => {
              if (editName.trim()) onNameChange(editName.trim());
              setIsEditing(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                if (editName.trim()) onNameChange(editName.trim());
                setIsEditing(false);
              } else if (event.key === 'Escape') {
                setEditName(track.name);
                setIsEditing(false);
              }
            }}
            autoFocus
            className="min-w-0 flex-1 rounded border border-[var(--trail-orange)] bg-[var(--canvas)] px-1 py-0 text-sm font-medium text-[var(--evergreen)] outline-none"
          />
        ) : (
          <span
            className="flex-1 cursor-text truncate text-sm font-medium text-[var(--evergreen)] decoration-dotted hover:underline"
            onClick={() => {
              setEditName(track.name);
              setIsEditing(true);
            }}
            title={t('tracks.clickRename')}
          >
            {track.name}
          </span>
        )}
        <span className="flex-shrink-0 text-xs text-[var(--evergreen-60)]">
          {formatDistance(track.track.totalDistance, settings.unitSystem)}
        </span>
        <button onClick={onRemove} className="flex-shrink-0 rounded p-1 text-red-500 hover:bg-red-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
