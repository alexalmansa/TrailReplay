import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { MapStyle, CameraMode, UnitSystem, MapOverlays } from '@/types';
import { S2MAPS_YEARS } from '@/components/map/TrailMap';
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
  { id: 'esri-clarity', name: 'Esri Clarity', icon: '📡' },
  { id: 's2maps', name: 'Sentinel-2', icon: '🌍' },
  { id: 'wayback', name: 'Wayback', icon: '🕰️' },
];

const MAP_OVERLAYS: { id: string; name: string; icon: string; description: string }[] = [
  { id: 'placeLabels', name: 'Place Names', icon: '🗺️', description: 'Carto place labels overlay' },
  { id: 'skiPistes', name: 'Ski Pistes', icon: '⛷️', description: 'OpenSnowMap ski runs overlay' },
  { id: 'slopeOverlay', name: 'Slope', icon: '📐', description: 'Color-coded terrain steepness' },
  { id: 'aspectOverlay', name: 'Aspect', icon: '🧭', description: 'Terrain orientation (N/E/S/W) colors' },
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

type WaybackItem = {
  releaseNum: number;
  releaseDateLabel?: string;
  releaseDate?: string;
  releaseDatetime?: number;
  itemURL: string;
};

const WAYBACK_CONFIG_URL = 'https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json';

const getWaybackItems = async (): Promise<WaybackItem[]> => {
  const response = await fetch(WAYBACK_CONFIG_URL);
  if (!response.ok) throw new Error('Wayback config fetch failed');
  const data = await response.json();
  const configData = data?.waybackConfigData ?? data ?? {};
  const items = Object.values(configData) as WaybackItem[];
  const getReleaseTime = (item: WaybackItem) => {
    if (typeof item.releaseDatetime === 'number') return item.releaseDatetime;
    const label = item.releaseDateLabel || item.releaseDate || '';
    const parsed = Date.parse(label);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  return items
    .filter((item) => item?.releaseNum && item?.itemURL)
    .sort((a, b) => getReleaseTime(b) - getReleaseTime(a));
};

export function SettingsPanel() {
  const settings = useAppStore((state) => state.settings);
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const setSettings = useAppStore((state) => state.setSettings);
  const setCameraSettings = useAppStore((state) => state.setCameraSettings);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const setMapStyle = useAppStore((state) => state.setMapStyle);
  const setUnitSystem = useAppStore((state) => state.setUnitSystem);
  const [waybackItems, setWaybackItems] = useState<WaybackItem[]>([]);
  const [waybackLoading, setWaybackLoading] = useState(false);
  const [waybackError, setWaybackError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.mapStyle !== 'wayback') return;

    let cancelled = false;

    const loadWayback = async () => {
      setWaybackLoading(true);
      setWaybackError(null);
      try {
        const items = await getWaybackItems();
        if (cancelled) return;
        setWaybackItems(items);
        if (!settings.waybackRelease && items.length > 0) {
          setSettings({
            waybackRelease: items[0].releaseNum,
            waybackItemURL: items[0].itemURL,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setWaybackError('Unable to load Wayback dates.');
        }
      } finally {
        if (!cancelled) {
          setWaybackLoading(false);
        }
      }
    };

    loadWayback();
    return () => {
      cancelled = true;
    };
  }, [settings.mapStyle, setSettings]);

  const toggleOverlay = (key: keyof MapOverlays) => {
    setSettings({ mapOverlays: { ...settings.mapOverlays, [key]: !settings.mapOverlays?.[key] } });
  };

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

        {/* S2Maps options — year selector */}
        {settings.mapStyle === 's2maps' && (
          <div className="mt-3 p-3 bg-[var(--evergreen)]/5 border border-[var(--evergreen)]/20 rounded-lg space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--evergreen)] mb-1">
                Satellite year
              </label>
              <select
                value={settings.s2mapsYear ?? 2024}
                onChange={(e) => setSettings({ s2mapsYear: Number(e.target.value) })}
                className="w-full text-sm rounded-lg border border-[var(--evergreen)]/30 bg-[var(--canvas)] text-[var(--evergreen)] px-2 py-1.5 focus:outline-none focus:border-[var(--trail-orange)]"
              >
                {S2MAPS_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-[var(--evergreen-60)]">
              Sentinel-2 cloudless imagery by{' '}
              <a href="https://s2maps.eu" target="_blank" rel="noopener noreferrer"
                className="underline hover:text-[var(--trail-orange)]">EOX IT Services
              </a>
              {' '}· CC-BY-NC-SA 4.0
            </p>
          </div>
        )}

        {/* Wayback options — date selector */}
        {settings.mapStyle === 'wayback' && (
          <div className="mt-3 p-3 bg-[var(--evergreen)]/5 border border-[var(--evergreen)]/20 rounded-lg space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--evergreen)] mb-1">
                Wayback date
              </label>
              {waybackLoading ? (
                <p className="text-xs text-[var(--evergreen-60)]">Loading dates...</p>
              ) : (
                <select
                  value={settings.waybackRelease ?? ''}
                  onChange={(e) => {
                    const selected = waybackItems.find((item) => item.releaseNum === Number(e.target.value));
                    if (selected) {
                      setSettings({
                        waybackRelease: selected.releaseNum,
                        waybackItemURL: selected.itemURL,
                      });
                    }
                  }}
                  className="w-full text-sm rounded-lg border border-[var(--evergreen)]/30 bg-[var(--canvas)] text-[var(--evergreen)] px-2 py-1.5 focus:outline-none focus:border-[var(--trail-orange)]"
                >
                  <option value="" disabled>Select a date</option>
                  {waybackItems.map((item) => (
                    <option key={item.releaseNum} value={item.releaseNum}>
                      {item.releaseDateLabel || item.releaseDate}
                    </option>
                  ))}
                </select>
              )}
              {waybackError && (
                <p className="text-xs text-[var(--evergreen-60)] mt-1">{waybackError}</p>
              )}
            </div>
            <p className="text-xs text-[var(--evergreen-60)]">
              Esri Wayback imagery releases (publish dates, not exact capture dates).
            </p>
          </div>
        )}

      </div>

      {/* Map Overlays */}
      <div>
        <h3 className="text-sm font-bold text-[var(--evergreen)] mb-3 uppercase tracking-wide flex items-center gap-2">
          <MapIcon className="w-4 h-4" />
          Overlays
        </h3>
        <div className="space-y-2">
          {MAP_OVERLAYS.map((overlay) => {
            const isActive = !!settings.mapOverlays?.[overlay.id as keyof MapOverlays];
            return (
              <button
                key={overlay.id}
                onClick={() => toggleOverlay(overlay.id as keyof MapOverlays)}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left
                  ${isActive
                    ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                    : 'border-[var(--evergreen)]/20 hover:border-[var(--trail-orange)]/50'
                  }
                `}
              >
                <span className="text-xl">{overlay.icon}</span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-[var(--evergreen)] block">{overlay.name}</span>
                  <span className="text-xs text-[var(--evergreen-60)]">{overlay.description}</span>
                </div>
                {isActive && <div className="w-3 h-3 rounded-full bg-[var(--trail-orange)] flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Ski pistes attribution */}
        {settings.mapOverlays?.skiPistes && (
          <div className="mt-2 p-3 bg-[var(--evergreen)]/5 border border-[var(--evergreen)]/20 rounded-lg">
            <p className="text-xs text-[var(--evergreen-60)]">
              Data ©{' '}
              <a href="https://www.opensnowmap.org" target="_blank" rel="noopener noreferrer"
                className="underline hover:text-[var(--trail-orange)]">OpenSnowMap.org
              </a>
              {' '}· OSM contributors ODbL · CC-BY-SA
            </p>
          </div>
        )}

        {/* Slope overlay legend */}
        {settings.mapOverlays?.slopeOverlay && (
          <div className="mt-2 p-3 bg-[var(--evergreen)]/5 border border-[var(--evergreen)]/20 rounded-lg">
            <p className="text-xs font-medium text-[var(--evergreen)] mb-2">Slope Steepness</p>
            <div className="space-y-1 text-xs text-[var(--evergreen-60)]">
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(255,255,0)'}}></span>&lt;25° — Mild</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(255,200,0)'}}></span>25–30° — Moderate</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(255,120,0)'}}></span>30–35° — Steep</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(255,50,0)'}}></span>35–40° — Very Steep</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(220,0,0)'}}></span>40–45° — Extreme</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(160,0,80)'}}></span>&gt;45° — Cliff</p>
            </div>
            <p className="text-xs text-[var(--evergreen-60)] mt-2">
              Computed from AWS Terrain Tiles elevation data
            </p>
          </div>
        )}

        {/* Aspect overlay legend */}
        {settings.mapOverlays?.aspectOverlay && (
          <div className="mt-2 p-3 bg-[var(--evergreen)]/5 border border-[var(--evergreen)]/20 rounded-lg">
            <p className="text-xs font-medium text-[var(--evergreen)] mb-2">Aspect (Terrain Orientation)</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-[var(--evergreen-60)]">
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(0,122,255)'}}></span>North</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(0,200,255)'}}></span>Northeast</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(0,200,90)'}}></span>East</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(180,220,0)'}}></span>Southeast</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(255,165,0)'}}></span>South</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(255,80,0)'}}></span>Southwest</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(200,0,200)'}}></span>West</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(120,0,255)'}}></span>Northwest</p>
            </div>
            <p className="text-xs text-[var(--evergreen-60)] mt-2">
              Transparent on very flat terrain
            </p>
          </div>
        )}
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
    </div>
  );
}
