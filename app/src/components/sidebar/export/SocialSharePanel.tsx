import { useState } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import { useSocialShareExport } from './useSocialShareExport';
import { SocialSharePreviewModal } from './SocialSharePreviewModal';
import { mapGlobalRef } from '@/utils/mapRef';
import type { SocialShareTemplate, SocialShareAspectRatio } from '@/types';

const TEMPLATES: { value: SocialShareTemplate; label: string }[] = [
  { value: 'map-first', label: 'Map First' },
  { value: 'photo-first', label: 'Photo First' },
];

const RATIOS: { value: SocialShareAspectRatio; label: string }[] = [
  { value: '4:5', label: '4:5' },
  { value: '1:1', label: '1:1' },
  { value: '9:16', label: '9:16' },
];

export function SocialSharePanel() {
  const {
    previewUrl, isRendering, exportPng, fitTrackToMap,
    settings, setSocialShareSettings, pictures, hasTracks,
    routeBboxNorm,
  } = useSocialShareExport();
  const [showPreview, setShowPreview] = useState(false);
  const [pitch, setPitch] = useState(() => Math.round(mapGlobalRef.current?.getPitch() ?? 0));
  const [bearing, setBearing] = useState(() => Math.round(mapGlobalRef.current?.getBearing() ?? 0));

  const setRouteTransform = (patch: Partial<typeof settings.routeTransform>) =>
    setSocialShareSettings({ routeTransform: { ...settings.routeTransform, ...patch } });

  const handlePitch = (v: number) => {
    setPitch(v);
    mapGlobalRef.current?.setPitch(v);
  };
  const handleBearing = (v: number) => {
    setBearing(v);
    mapGlobalRef.current?.setBearing(v);
  };

  return (
    <div className="space-y-4 text-[var(--evergreen)]">
      {/* Template */}
      <div>
        <div className="text-xs uppercase tracking-wide opacity-60 mb-2">Template</div>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSocialShareSettings({ template: value })}
              className={`py-2 rounded text-sm font-medium transition-colors ${
                settings.template === value
                  ? 'bg-[var(--trail-orange)] text-white'
                  : 'bg-black/5 hover:bg-black/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div>
        <div className="text-xs uppercase tracking-wide opacity-60 mb-2">Ratio</div>
        <div className="grid grid-cols-3 gap-2">
          {RATIOS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSocialShareSettings({ aspectRatio: value })}
              className={`py-2 rounded text-sm font-medium transition-colors ${
                settings.aspectRatio === value
                  ? 'bg-[var(--trail-orange)] text-white'
                  : 'bg-black/5 hover:bg-black/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Photo chooser */}
      <div>
        <div className="text-xs uppercase tracking-wide opacity-60 mb-2">Photo</div>
        {pictures.length === 0 ? (
          <p className="text-xs opacity-50">No photos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-5 gap-1.5 max-h-28 overflow-y-auto">
            <button
              onClick={() => setSocialShareSettings({ selectedPictureId: null })}
              className={`aspect-square rounded flex items-center justify-center text-lg border-2 transition-colors ${
                !settings.selectedPictureId
                  ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                  : 'border-transparent bg-black/5 hover:bg-black/10'
              }`}
            >
              ✕
            </button>
            {pictures.map((pic) => (
              <button
                key={pic.id}
                onClick={() => setSocialShareSettings({ selectedPictureId: pic.id })}
                className={`aspect-square rounded overflow-hidden border-2 transition-colors ${
                  settings.selectedPictureId === pic.id
                    ? 'border-[var(--trail-orange)]'
                    : 'border-transparent'
                }`}
              >
                <img src={pic.url} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <div className="text-xs uppercase tracking-wide opacity-60 mb-2">Title</div>
        <div className="grid grid-cols-3 gap-1 mb-2">
          {(['journey-name', 'track-name', 'custom'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSocialShareSettings({ titleMode: mode })}
              className={`py-1.5 rounded text-xs font-medium transition-colors ${
                settings.titleMode === mode
                  ? 'bg-[var(--trail-orange)] text-white'
                  : 'bg-black/5 hover:bg-black/10'
              }`}
            >
              {mode === 'journey-name' ? 'Journey' : mode === 'track-name' ? 'Track' : 'Custom'}
            </button>
          ))}
        </div>
        {settings.titleMode === 'custom' && (
          <input
            type="text"
            value={settings.customTitle}
            onChange={(e) => setSocialShareSettings({ customTitle: e.target.value })}
            placeholder="Enter title…"
            className="w-full bg-black/5 border border-black/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--trail-orange)]"
          />
        )}
      </div>

      {/* Location */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-wide opacity-60">Location</div>
          <button
            onClick={() => setSocialShareSettings({ showLocation: !settings.showLocation })}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              settings.showLocation ? 'bg-[var(--trail-orange)]' : 'bg-black/20'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                settings.showLocation ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        {settings.showLocation && (
          <input
            type="text"
            value={settings.locationLabel}
            onChange={(e) => setSocialShareSettings({ locationLabel: e.target.value })}
            placeholder="City, Country…"
            className="w-full bg-black/5 border border-black/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--trail-orange)]"
          />
        )}
      </div>

      {/* Overlays toggles */}
      <div className="flex gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={settings.showStats}
            onChange={(e) => setSocialShareSettings({ showStats: e.target.checked })}
            className="accent-[var(--trail-orange)]"
          />
          Stats
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={settings.showElevationMiniChart}
            onChange={(e) => setSocialShareSettings({ showElevationMiniChart: e.target.checked })}
            className="accent-[var(--trail-orange)]"
          />
          Elevation
        </label>
      </div>

      {/* Map camera controls (map-first only) */}
      {settings.template === 'map-first' && (
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60 mb-2">Map Camera</div>
          <div className="space-y-2 mb-2">
            <div className="flex items-center gap-3 text-xs">
              <span className="w-16 shrink-0 opacity-70">3D Tilt</span>
              <input
                type="range" min={0} max={60} step={1}
                value={pitch}
                onChange={(e) => handlePitch(Number(e.target.value))}
                className="flex-1 accent-[var(--trail-orange)]"
              />
              <span className="w-8 text-right opacity-50 tabular-nums">{pitch}°</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="w-16 shrink-0 opacity-70">Rotate</span>
              <input
                type="range" min={-180} max={180} step={1}
                value={bearing}
                onChange={(e) => handleBearing(Number(e.target.value))}
                className="flex-1 accent-[var(--trail-orange)]"
              />
              <span className="w-8 text-right opacity-50 tabular-nums">{bearing}°</span>
            </div>
          </div>
          <button
            onClick={fitTrackToMap}
            disabled={!hasTracks}
            className="w-full text-xs py-1.5 rounded bg-black/5 hover:bg-black/10 transition-colors disabled:opacity-40"
          >
            Fit track to view
          </button>
        </div>
      )}

      {/* Photo-first route controls */}
      {settings.template === 'photo-first' && (
        <div>
          <div className="text-xs uppercase tracking-wide opacity-60 mb-2">Route Overlay</div>
          <div className="space-y-2">
            {(
              [
                { key: 'scale', label: 'Scale', min: 0.3, max: 2.5, step: 0.05 },
                { key: 'offsetX', label: 'Horizontal', min: -0.4, max: 0.4, step: 0.01 },
                { key: 'offsetY', label: 'Vertical', min: -0.4, max: 0.4, step: 0.01 },
                { key: 'opacity', label: 'Opacity', min: 0.2, max: 1, step: 0.05 },
              ] as const
            ).map(({ key, label, min, max, step }) => (
              <div key={key} className="flex items-center gap-3 text-xs">
                <span className="w-20 shrink-0 opacity-70">{label}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={settings.routeTransform[key]}
                  onChange={(e) => setRouteTransform({ [key]: parseFloat(e.target.value) })}
                  className="flex-1 accent-[var(--trail-orange)]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasTracks && (
        <p className="text-xs opacity-50 text-center">Load a track to generate a poster.</p>
      )}

      {/* Preview button */}
      <button
        onClick={() => setShowPreview(true)}
        disabled={isRendering || !previewUrl || !hasTracks}
        className="w-full tr-btn tr-btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRendering ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ImageIcon className="w-4 h-4" />
        )}
        {isRendering ? 'Rendering…' : 'Preview & Download'}
      </button>

      {showPreview && previewUrl && (
        <SocialSharePreviewModal
          previewUrl={previewUrl}
          isRendering={isRendering}
          onClose={() => setShowPreview(false)}
          onExport={async () => { await exportPng(); setShowPreview(false); }}
          settings={settings}
          setSocialShareSettings={setSocialShareSettings}
          routeBboxNorm={routeBboxNorm}
        />
      )}
    </div>
  );
}
