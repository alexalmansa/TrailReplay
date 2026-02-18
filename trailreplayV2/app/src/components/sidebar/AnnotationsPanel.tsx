import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

const COLOR_PRESETS = [
  { color: '#C1652F', label: 'Trail Orange' },
  { color: '#28a745', label: 'Green' },
  { color: '#7FB8AD', label: 'Teal' },
  { color: '#3B82F6', label: 'Blue' },
  { color: '#dc3545', label: 'Red' },
  { color: '#8B5CF6', label: 'Purple' },
];

const ACTIVITY_ICONS = [
  { icon: '🏃', label: 'Running' },
  { icon: '🏃‍♂️', label: 'Runner' },
  { icon: '🚴', label: 'Cycling' },
  { icon: '🚴‍♂️', label: 'Cyclist' },
  { icon: '🥾', label: 'Hiking' },
  { icon: '🚶', label: 'Walking' },
  { icon: '🚶‍♂️', label: 'Walker' },
  { icon: '⛷️', label: 'Skiing' },
  { icon: '🏊', label: 'Swimming' },
  { icon: '🧗', label: 'Climbing' },
  { icon: '🏇', label: 'Horse' },
  { icon: '🛶', label: 'Kayak' },
  { icon: '🛹', label: 'Skate' },
  { icon: '🎿', label: 'Ski' },
  { icon: '🏂', label: 'Snowboard' },
  { icon: '🚗', label: 'Car' },
  { icon: '✈️', label: 'Plane' },
  { icon: '🚂', label: 'Train' },
];

// ─── Inline name editor ────────────────────────────────────────────────────
function InlineName({
  name,
  color,
  onSave,
}: {
  name: string;
  color: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    if (draft.trim()) onSave(draft.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(name); setEditing(false); }
        }}
        autoFocus
        className="flex-1 min-w-0 px-2 py-0.5 text-sm font-semibold border border-[var(--trail-orange)] rounded bg-[var(--canvas)] outline-none"
        style={{ color }}
      />
    );
  }

  return (
    <span
      className="flex-1 min-w-0 text-sm font-semibold truncate cursor-text hover:underline decoration-dotted"
      style={{ color }}
      title="Click to rename"
      onClick={() => { setDraft(name); setEditing(true); }}
    >
      {name}
    </span>
  );
}

// ─── Per-track settings block ──────────────────────────────────────────────
function TrackStyleSection({
  label,
  color,
  name,
  onColorChange,
  onNameChange,
}: {
  label: string;
  color: string;
  name: string;
  onColorChange: (c: string) => void;
  onNameChange: (n: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-[var(--evergreen)]/15 p-3 bg-[var(--evergreen)]/3">
      {/* Section header: dot + label */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-bold text-[var(--evergreen-60)] uppercase tracking-wide">{label}</span>
      </div>

      {/* Name row */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-[var(--evergreen-60)] w-10 flex-shrink-0">Name</Label>
        <InlineName name={name} color={color} onSave={onNameChange} />
      </div>

      {/* Color row */}
      <div className="flex items-center gap-3">
        <Label className="text-xs text-[var(--evergreen-60)] w-10 flex-shrink-0">Color</Label>
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-2 border-[var(--evergreen)]/20 flex-shrink-0"
        />
        <div className="flex gap-1.5 flex-wrap">
          {COLOR_PRESETS.map(({ color: preset, label: pl }) => (
            <button
              key={preset}
              onClick={() => onColorChange(preset)}
              title={pl}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                color === preset
                  ? 'border-[var(--evergreen)] scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: preset }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────
export function AnnotationsPanel() {
  const trailStyle = useAppStore((state) => state.settings.trailStyle);
  const setTrailStyle = useAppStore((state) => state.setTrailStyle);

  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const updateTrackColor = useAppStore((state) => state.updateTrackColor);
  const updateTrackName = useAppStore((state) => state.updateTrackName);

  const comparisonTracks = useAppStore((state) => state.comparisonTracks);
  const updateComparisonColor = useAppStore((state) => state.updateComparisonColor);
  const updateComparisonTrackName = useAppStore((state) => state.updateComparisonTrackName);

  const [showIconPicker, setShowIconPicker] = useState(false);

  const hasMultiple = tracks.length > 1 || comparisonTracks.length > 0;

  // When the active track color changes, also sync trailStyle
  const handleMainColorChange = (trackId: string, color: string) => {
    updateTrackColor(trackId, color);
    if (trackId === activeTrackId) {
      setTrailStyle({ trailColor: color });
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Track colour & name sections ─────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
          {hasMultiple ? 'Tracks' : 'Trail'}
        </h3>

        {tracks.length === 0 && comparisonTracks.length === 0 && (
          <p className="text-xs text-[var(--evergreen-60)]">Load a GPX track to set its colour and name.</p>
        )}

        {/* Main tracks */}
        {tracks.map((track, i) => (
          <TrackStyleSection
            key={track.id}
            label={hasMultiple ? `Track ${i + 1}` : 'Main Track'}
            color={track.color}
            name={track.name}
            onColorChange={(c) => handleMainColorChange(track.id, c)}
            onNameChange={(n) => updateTrackName(track.id, n)}
          />
        ))}

        {/* Comparison tracks */}
        {comparisonTracks.map((ct, i) => (
          <TrackStyleSection
            key={ct.id}
            label={`Comparison ${comparisonTracks.length > 1 ? i + 1 : ''}`}
            color={ct.color}
            name={ct.name}
            onColorChange={(c) => updateComparisonColor(ct.id, c)}
            onNameChange={(n) => updateComparisonTrackName(ct.id, n)}
          />
        ))}
      </div>

      {/* ── Label visibility ─────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
          Labels
        </h3>
        <div className="flex items-center justify-between">
          <Label className="text-sm text-[var(--evergreen)]">Show on map</Label>
          <Switch
            checked={trailStyle.showTrackLabels}
            onCheckedChange={(checked) => setTrailStyle({ showTrackLabels: checked })}
          />
        </div>
        {trailStyle.showTrackLabels && (
          <p className="text-xs text-[var(--evergreen-60)]">
            Each track's name floats next to its marker on the map.
          </p>
        )}
      </div>

      {/* ── Marker settings ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
          Marker
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-[var(--evergreen)]">Show Marker</Label>
            <Switch
              checked={trailStyle.showMarker}
              onCheckedChange={(checked) => setTrailStyle({ showMarker: checked })}
            />
          </div>

          {trailStyle.showMarker && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-[var(--evergreen)]">Size</Label>
                  <span className="text-xs text-[var(--evergreen-60)]">
                    {trailStyle.markerSize.toFixed(1)}x
                  </span>
                </div>
                <Slider
                  value={[trailStyle.markerSize]}
                  onValueChange={([value]) => setTrailStyle({ markerSize: value })}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-[var(--evergreen)]">Activity Icon</Label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[var(--trail-orange-15)] border-2 border-[var(--evergreen)]/20 flex items-center justify-center text-2xl">
                    {trailStyle.currentIcon}
                  </div>
                  <button
                    onClick={() => setShowIconPicker(true)}
                    className="tr-btn tr-btn-secondary text-sm"
                  >
                    Change Icon
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm text-[var(--evergreen)]">Glow Circle</Label>
                <Switch
                  checked={trailStyle.showCircle}
                  onCheckedChange={(checked) => setTrailStyle({ showCircle: checked })}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--canvas)] border-2 border-[var(--evergreen)] rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-[var(--evergreen)] mb-4">
              Select Activity Icon
            </h3>
            <div className="grid grid-cols-6 gap-2 mb-6">
              {ACTIVITY_ICONS.map(({ icon, label }) => (
                <button
                  key={icon}
                  onClick={() => { setTrailStyle({ currentIcon: icon }); setShowIconPicker(false); }}
                  title={label}
                  className={`
                    flex items-center justify-center p-2 rounded-lg border-2 transition-colors
                    ${trailStyle.currentIcon === icon
                      ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                      : 'border-[var(--evergreen)]/20 hover:border-[var(--trail-orange)]/50'
                    }
                  `}
                >
                  <span className="text-2xl">{icon}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowIconPicker(false)}
              className="w-full tr-btn tr-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
