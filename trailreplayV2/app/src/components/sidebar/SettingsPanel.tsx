import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { MapStyle, CameraMode, UnitSystem, MapOverlays } from '@/types';
import { useI18n } from '@/i18n/useI18n';
import { languageLabels } from '@/i18n/translations';
import {
  Map as MapIcon,
  Video,
  Mountain,
  Heart,
  Ruler,
  Globe
} from 'lucide-react';

const MAP_STYLES: { id: MapStyle; nameKey: string; icon: string }[] = [
  { id: 'satellite', nameKey: 'settings.mapStyles.satellite', icon: '🛰️' },
  { id: 'topo', nameKey: 'settings.mapStyles.topo', icon: '🗺️' },
  { id: 'street', nameKey: 'settings.mapStyles.street', icon: '🏙️' },
  { id: 'outdoor', nameKey: 'settings.mapStyles.outdoor', icon: '🌲' },
  { id: 'esri-clarity', nameKey: 'settings.mapStyles.esri', icon: '📡' },
  { id: 'wayback', nameKey: 'settings.mapStyles.wayback', icon: '🕰️' },
];

const MAP_OVERLAYS: { id: string; nameKey: string; icon: string; descriptionKey: string }[] = [
  { id: 'placeLabels', nameKey: 'settings.overlays.placeLabels', icon: '🗺️', descriptionKey: 'settings.overlays.placeLabelsDesc' },
  { id: 'skiPistes', nameKey: 'settings.overlays.skiPistes', icon: '⛷️', descriptionKey: 'settings.overlays.skiPistesDesc' },
  { id: 'slopeOverlay', nameKey: 'settings.overlays.slope', icon: '📐', descriptionKey: 'settings.overlays.slopeDesc' },
  { id: 'aspectOverlay', nameKey: 'settings.overlays.aspect', icon: '🧭', descriptionKey: 'settings.overlays.aspectDesc' },
];

const CAMERA_MODES: { id: CameraMode; nameKey: string; descriptionKey: string }[] = [
  { id: 'overview', nameKey: 'settings.cameraModes.overview', descriptionKey: 'settings.cameraModes.overviewDesc' },
  { id: 'follow', nameKey: 'settings.cameraModes.follow', descriptionKey: 'settings.cameraModes.followDesc' },
  { id: 'follow-behind', nameKey: 'settings.cameraModes.followBehind', descriptionKey: 'settings.cameraModes.followBehindDesc' },
];

const FOLLOW_PRESETS = [
  { id: 'very-close', nameKey: 'settings.followPresets.veryClose', zoom: 17, pitch: 65 },
  { id: 'close', nameKey: 'settings.followPresets.close', zoom: 16, pitch: 60 },
  { id: 'medium', nameKey: 'settings.followPresets.medium', zoom: 15, pitch: 55 },
  { id: 'far', nameKey: 'settings.followPresets.far', zoom: 14, pitch: 45 },
];

type WaybackItem = {
  releaseNum: number;
  releaseDateLabel?: string;
  releaseDate?: string;
  releaseDatetime?: number;
  itemURL: string;
  itemTitle?: string;
};

const WAYBACK_CONFIG_URL = 'https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json';

const getWaybackItems = async (): Promise<WaybackItem[]> => {
  const response = await fetch(WAYBACK_CONFIG_URL);
  if (!response.ok) throw new Error('Wayback config fetch failed');
  const data = await response.json();
  const configData = data?.waybackConfigData ?? data ?? {};
  const entries = Object.entries(configData) as Array<[string, WaybackItem]>;
  const items = entries.map(([key, item]) => {
    const releaseNum = Number(item.releaseNum ?? key);
    const title = item.itemTitle ?? '';
    const dateMatch = typeof title === 'string' ? title.match(/(\d{4}-\d{2}-\d{2})/) : null;
    const releaseDateLabel = dateMatch?.[1] || item.releaseDateLabel || item.releaseDate || `Release ${releaseNum}`;
    return {
      ...item,
      releaseNum,
      releaseDateLabel,
      releaseDate: item.releaseDate ?? releaseDateLabel,
    };
  });
  const getReleaseTime = (item: WaybackItem) => {
    if (typeof item.releaseDatetime === 'number') return item.releaseDatetime;
    const label = item.releaseDateLabel || item.releaseDate || '';
    const parsed = Date.parse(label);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  return items
    .filter((item) => Number.isFinite(item.releaseNum) && !!item?.itemURL)
    .sort((a, b) => getReleaseTime(b) - getReleaseTime(a));
};

export function SettingsPanel() {
  const { t, language, setLanguage } = useI18n();
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
          setWaybackError(t('settings.waybackError'));
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
  }, [settings.mapStyle, setSettings, t]);

  const toggleOverlay = (key: keyof MapOverlays) => {
    setSettings({ mapOverlays: { ...settings.mapOverlays, [key]: !settings.mapOverlays?.[key] } });
  };

  return (
    <div className="space-y-6">
      {/* Map Style */}
      <div>
        <h3 className="text-sm font-bold text-[var(--evergreen)] mb-3 uppercase tracking-wide flex items-center gap-2">
          <MapIcon className="w-4 h-4" />
          {t('settings.title')}
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
              <span className="text-sm font-medium text-[var(--evergreen)]">{t(style.nameKey)}</span>
            </button>
          ))}
        </div>

        {/* Wayback options — date selector */}
        {settings.mapStyle === 'wayback' && (
          <div className="mt-3 p-3 bg-[var(--evergreen)]/5 border border-[var(--evergreen)]/20 rounded-lg space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--evergreen)] mb-1">
                {t('settings.waybackDate')}
              </label>
              {waybackLoading ? (
                <p className="text-xs text-[var(--evergreen-60)]">{t('settings.waybackLoading')}</p>
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
                  <option value="" disabled>{t('settings.waybackSelect')}</option>
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
              {t('settings.waybackNote')}
            </p>
          </div>
        )}

      </div>

      {/* Map Overlays */}
      <div>
        <h3 className="text-sm font-bold text-[var(--evergreen)] mb-3 uppercase tracking-wide flex items-center gap-2">
          <MapIcon className="w-4 h-4" />
          {t('settings.overlaysTitle')}
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
                  <span className="text-sm font-medium text-[var(--evergreen)] block">{t(overlay.nameKey)}</span>
                  <span className="text-xs text-[var(--evergreen-60)]">{t(overlay.descriptionKey)}</span>
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
            <p className="text-xs font-medium text-[var(--evergreen)] mb-2">{t('settings.slopeLegendTitle')}</p>
            <div className="space-y-1 text-xs text-[var(--evergreen-60)]">
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(255,255,0)'}}></span>{t('settings.slopeLegendMild')}</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(255,200,0)'}}></span>{t('settings.slopeLegendModerate')}</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(255,120,0)'}}></span>{t('settings.slopeLegendSteep')}</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(255,50,0)'}}></span>{t('settings.slopeLegendVerySteep')}</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(220,0,0)'}}></span>{t('settings.slopeLegendExtreme')}</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(160,0,80)'}}></span>{t('settings.slopeLegendCliff')}</p>
            </div>
            <p className="text-xs text-[var(--evergreen-60)] mt-2">
              {t('settings.slopeLegendFooter')}
            </p>
          </div>
        )}

        {/* Aspect overlay legend */}
        {settings.mapOverlays?.aspectOverlay && (
          <div className="mt-2 p-3 bg-[var(--evergreen)]/5 border border-[var(--evergreen)]/20 rounded-lg">
            <p className="text-xs font-medium text-[var(--evergreen)] mb-2">{t('settings.aspectLegendTitle')}</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-[var(--evergreen-60)]">
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(0,122,255)'}}></span>{t('settings.aspectLegendNorth')}</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(0,200,255)'}}></span>{t('settings.aspectLegendNortheast')}</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(0,200,90)'}}></span>{t('settings.aspectLegendEast')}</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(180,220,0)'}}></span>{t('settings.aspectLegendSoutheast')}</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(255,165,0)'}}></span>{t('settings.aspectLegendSouth')}</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(255,80,0)'}}></span>{t('settings.aspectLegendSouthwest')}</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(200,0,200)'}}></span>{t('settings.aspectLegendWest')}</p>
              <p><span className="inline-block w-3 h-3 rounded mr-1" style={{backgroundColor:'rgb(120,0,255)'}}></span>{t('settings.aspectLegendNorthwest')}</p>
            </div>
            <p className="text-xs text-[var(--evergreen-60)] mt-2">
              {t('settings.aspectLegendFooter')}
            </p>
          </div>
        )}
      </div>

      {/* Camera Mode */}
      <div>
        <h3 className="text-sm font-bold text-[var(--evergreen)] mb-3 uppercase tracking-wide flex items-center gap-2">
          <Video className="w-4 h-4" />
          {t('settings.cameraTitle')}
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
                  {t(mode.nameKey)}
                </span>
                <span className="text-xs text-[var(--evergreen-60)]">
                  {t(mode.descriptionKey)}
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
            <p className="text-xs text-[var(--evergreen-60)] mb-2">{t('settings.followPresets.title')}</p>
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
                  {t(preset.nameKey)}
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
          {t('settings.displayOptions')}
        </h3>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-[var(--evergreen)]/5 rounded-lg cursor-pointer">
            <div className="flex items-center gap-2">
              <Mountain className="w-4 h-4 text-[var(--evergreen)]" />
              <span className="text-sm text-[var(--evergreen)]">{t('settings.show3dTerrain')}</span>
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
              <span className="text-sm text-[var(--evergreen)]">{t('settings.showHeartRate')}</span>
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
              <span className="text-sm text-[var(--evergreen)]">{t('settings.showPictures')}</span>
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
          {t('settings.units')}
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
              {unit === 'metric' ? t('settings.unitMetric') : t('settings.unitImperial')}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <h3 className="text-sm font-bold text-[var(--evergreen)] mb-3 uppercase tracking-wide flex items-center gap-2">
          <Globe className="w-4 h-4" />
          {t('settings.language')}
        </h3>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as keyof typeof languageLabels)}
          className="w-full text-sm rounded-lg border border-[var(--evergreen)]/30 bg-[var(--canvas)] text-[var(--evergreen)] px-3 py-2 focus:outline-none focus:border-[var(--trail-orange)]"
        >
          {Object.entries(languageLabels).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
