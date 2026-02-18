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

export function AnnotationsPanel() {
  const trailStyle = useAppStore((state) => state.settings.trailStyle);
  const setTrailStyle = useAppStore((state) => state.setTrailStyle);
  const tracks = useAppStore((state) => state.tracks);
  const updateTrackColor = useAppStore((state) => state.updateTrackColor);
  const activeTrackId = useAppStore((state) => state.activeTrackId);

  const [showIconPicker, setShowIconPicker] = useState(false);

  const handleColorChange = (color: string) => {
    setTrailStyle({ trailColor: color });
    // Also update the active track color
    if (activeTrackId) {
      updateTrackColor(activeTrackId, color);
    }
  };

  const handleIconSelect = (icon: string) => {
    setTrailStyle({ currentIcon: icon });
    setShowIconPicker(false);
  };

  return (
    <div className="space-y-6">
      {/* Trail Color Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
          Trail Color
        </h3>

        <div className="space-y-3">
          {/* Color Picker */}
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={trailStyle.trailColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-2 border-[var(--evergreen)]/20"
            />
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map(({ color, label }) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  title={label}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    trailStyle.trailColor === color
                      ? 'border-[var(--evergreen)] scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Per-track colors */}
          {tracks.length > 1 && (
            <div className="mt-3 pt-3 border-t border-[var(--evergreen)]/10">
              <p className="text-xs text-[var(--evergreen-60)] mb-2">Track Colors</p>
              <div className="space-y-2">
                {tracks.map((track, index) => (
                  <div key={track.id} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={track.color}
                      onChange={(e) => updateTrackColor(track.id, e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border border-[var(--evergreen)]/20"
                    />
                    <span className="text-xs text-[var(--evergreen)]">
                      {track.name || `Track ${index + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Marker Settings Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
          Marker Settings
        </h3>

        <div className="space-y-4">
          {/* Show Marker */}
          <div className="flex items-center justify-between">
            <Label className="text-sm text-[var(--evergreen)]">Show Marker</Label>
            <Switch
              checked={trailStyle.showMarker}
              onCheckedChange={(checked) => setTrailStyle({ showMarker: checked })}
            />
          </div>

          {/* Marker Size */}
          {trailStyle.showMarker && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-[var(--evergreen)]">Marker Size</Label>
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

              {/* Current Icon */}
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

              {/* Show Circle */}
              <div className="flex items-center justify-between">
                <Label className="text-sm text-[var(--evergreen)]">Show Glow Circle</Label>
                <Switch
                  checked={trailStyle.showCircle}
                  onCheckedChange={(checked) => setTrailStyle({ showCircle: checked })}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Track Labels Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
          Track Labels
        </h3>

        <div className="space-y-4">
          {/* Show Track Labels */}
          <div className="flex items-center justify-between">
            <Label className="text-sm text-[var(--evergreen)]">Show Labels</Label>
            <Switch
              checked={trailStyle.showTrackLabels}
              onCheckedChange={(checked) => setTrailStyle({ showTrackLabels: checked })}
            />
          </div>

          {trailStyle.showTrackLabels && (
            <p className="text-xs text-[var(--evergreen-60)]">
              Each track uses its name as its label. Rename tracks in the Tracks panel.
            </p>
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
                  onClick={() => handleIconSelect(icon)}
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
