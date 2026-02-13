import { useAppStore } from '@/store/useAppStore';
import type { MapStyle, CameraMode, UnitSystem } from '@/types';
import { 
  Map as MapIcon, 
  Video, 
  Mountain, 
  Heart, 
  Ruler,
  Globe
} from 'lucide-react';

const MAP_STYLES: { id: MapStyle; name: string; icon: string }[] = [
  { id: 'satellite', name: 'Satellite', icon: '🛰️' },
  { id: 'topo', name: 'Topographic', icon: '🗺️' },
  { id: 'street', name: 'Streets', icon: '🏙️' },
  { id: 'outdoor', name: 'Outdoor', icon: '🌲' },
  { id: 'dark', name: 'Dark', icon: '🌙' },
];

const CAMERA_MODES: { id: CameraMode; name: string; description: string }[] = [
  { id: 'overview', name: 'Overview', description: 'Fixed view of entire track' },
  { id: 'follow', name: 'Follow', description: 'Follow marker from above' },
  { id: 'follow-behind', name: 'Follow Behind', description: 'Cinematic view from behind' },
];

const FOLLOW_PRESETS = [
  { id: 'very-close', name: 'Very Close', zoom: 17, pitch: 65 },
  { id: 'close', name: 'Close', zoom: 16, pitch: 60 },
  { id: 'medium', name: 'Medium', zoom: 15, pitch: 55 },
  { id: 'far', name: 'Far', zoom: 14, pitch: 45 },
];

export function SettingsPanel() {
  const settings = useAppStore((state) => state.settings);
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const setSettings = useAppStore((state) => state.setSettings);
  const setCameraSettings = useAppStore((state) => state.setCameraSettings);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const setMapStyle = useAppStore((state) => state.setMapStyle);
  const setUnitSystem = useAppStore((state) => state.setUnitSystem);

  return (
    <div className="space-y-6">
      {/* Map Style */}
      <div>
        <h3 className="text-sm font-bold text-[var(--evergreen)] mb-3 uppercase tracking-wide flex items-center gap-2">
          <MapIcon className="w-4 h-4" />
          Map Style
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {MAP_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setMapStyle(style.id)}
              className={`
                flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-left
                ${settings.mapStyle === style.id
                  ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                  : 'border-[var(--evergreen)]/20 hover:border-[var(--trail-orange)]/50'
                }
              `}
            >
              <span className="text-xl">{style.icon}</span>
              <span className="text-sm font-medium text-[var(--evergreen)]">{style.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Camera Mode */}
      <div>
        <h3 className="text-sm font-bold text-[var(--evergreen)] mb-3 uppercase tracking-wide flex items-center gap-2">
          <Video className="w-4 h-4" />
          Camera Mode
        </h3>
        <div className="space-y-2">
          {CAMERA_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setCameraMode(mode.id)}
              className={`
                w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors
                ${cameraSettings.mode === mode.id
                  ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                  : 'border-[var(--evergreen)]/20 hover:border-[var(--trail-orange)]/50'
                }
              `}
            >
              <div className="text-left">
                <span className="text-sm font-medium text-[var(--evergreen)] block">
                  {mode.name}
                </span>
                <span className="text-xs text-[var(--evergreen-60)]">
                  {mode.description}
                </span>
              </div>
              {cameraSettings.mode === mode.id && (
                <div className="w-3 h-3 rounded-full bg-[var(--trail-orange)]" />
              )}
            </button>
          ))}
        </div>
        
        {/* Follow Behind Presets */}
        {cameraSettings.mode === 'follow-behind' && (
          <div className="mt-3 p-3 bg-[var(--evergreen)]/5 rounded-lg">
            <p className="text-xs text-[var(--evergreen-60)] mb-2">Distance Preset</p>
            <div className="flex gap-2">
              {FOLLOW_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setCameraSettings({ followBehindPreset: preset.id as any })}
                  className={`
                    flex-1 py-2 px-1 rounded text-xs font-medium transition-colors
                    ${cameraSettings.followBehindPreset === preset.id
                      ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
                      : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
                    }
                  `}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Display Options */}
      <div>
        <h3 className="text-sm font-bold text-[var(--evergreen)] mb-3 uppercase tracking-wide flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Display Options
        </h3>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-[var(--evergreen)]/5 rounded-lg cursor-pointer">
            <div className="flex items-center gap-2">
              <Mountain className="w-4 h-4 text-[var(--evergreen)]" />
              <span className="text-sm text-[var(--evergreen)]">3D Terrain</span>
            </div>
            <input
              type="checkbox"
              checked={settings.show3DTerrain}
              onChange={(e) => setSettings({ show3DTerrain: e.target.checked })}
              className="w-5 h-5 accent-[var(--trail-orange)]"
            />
          </label>
          
          <label className="flex items-center justify-between p-3 bg-[var(--evergreen)]/5 rounded-lg cursor-pointer">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[var(--evergreen)]" />
              <span className="text-sm text-[var(--evergreen)]">Heart Rate Colors</span>
            </div>
            <input
              type="checkbox"
              checked={settings.showHeartRate}
              onChange={(e) => setSettings({ showHeartRate: e.target.checked })}
              className="w-5 h-5 accent-[var(--trail-orange)]"
            />
          </label>
          
          <label className="flex items-center justify-between p-3 bg-[var(--evergreen)]/5 rounded-lg cursor-pointer">
            <div className="flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-[var(--evergreen)]" />
              <span className="text-sm text-[var(--evergreen)]">Show Pictures</span>
            </div>
            <input
              type="checkbox"
              checked={settings.showPictures}
              onChange={(e) => setSettings({ showPictures: e.target.checked })}
              className="w-5 h-5 accent-[var(--trail-orange)]"
            />
          </label>
        </div>
      </div>
      
      {/* Units */}
      <div>
        <h3 className="text-sm font-bold text-[var(--evergreen)] mb-3 uppercase tracking-wide flex items-center gap-2">
          <Ruler className="w-4 h-4" />
          Units
        </h3>
        <div className="flex gap-2">
          {(['metric', 'imperial'] as UnitSystem[]).map((unit) => (
            <button
              key={unit}
              onClick={() => setUnitSystem(unit)}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors
                ${settings.unitSystem === unit
                  ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
                  : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
                }
              `}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>
      
      {/* About */}
      <div className="pt-4 border-t-2 border-[var(--evergreen)]/20">
        <div className="text-center">
          <div className="w-12 h-12 bg-[var(--trail-orange)] rounded-xl flex items-center justify-center mx-auto mb-2">
            <span className="text-2xl">🏔️</span>
          </div>
          <h4 className="font-bold text-[var(--evergreen)]">Trail Replay</h4>
          <p className="text-xs text-[var(--evergreen-60)]">GPX Visualization v2.0</p>
          <a 
            href="https://github.com/alexalmansa/TrailReplay"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--trail-orange)] hover:underline mt-2 inline-block"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
