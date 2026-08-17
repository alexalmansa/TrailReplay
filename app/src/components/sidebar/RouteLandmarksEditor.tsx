import { useMemo } from 'react';
import { Flag } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { LandmarkType } from '@/types/landmarks';

function labelForType(type: LandmarkType) {
  return type.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function RouteLandmarksEditor() {
  const showAutomaticLandmarks = useAppStore((state) => state.showAutomaticLandmarks);
  const nearbyPlacesEnabled = useAppStore((state) => state.nearbyPlacesEnabled);
  const nearbyPlacesLoading = useAppStore((state) => state.nearbyPlacesLoading);
  const nearbyPlacesError = useAppStore((state) => state.nearbyPlacesError);
  const nearbyPlacesCoverage = useAppStore((state) => state.nearbyPlacesCoverage);
  const enrichedLandmarks = useAppStore((state) => state.enrichedLandmarks);
  const nearbyPlaceTypes = useAppStore((state) => state.nearbyPlaceTypes);
  const setShowAutomaticLandmarks = useAppStore((state) => state.setShowAutomaticLandmarks);
  const setNearbyPlacesEnabled = useAppStore((state) => state.setNearbyPlacesEnabled);
  const setNearbyPlaceTypes = useAppStore((state) => state.setNearbyPlaceTypes);

  const placeTypes = useMemo(() => {
    const counts = new Map<LandmarkType, number>();
    enrichedLandmarks.forEach((landmark) => counts.set(landmark.type, (counts.get(landmark.type) ?? 0) + 1));
    return [...counts.entries()].sort(([a], [b]) => labelForType(a).localeCompare(labelForType(b)));
  }, [enrichedLandmarks]);

  const togglePlaceType = (type: LandmarkType) => {
    const currentlyVisible = nearbyPlaceTypes === null || nearbyPlaceTypes.includes(type);
    const current = nearbyPlaceTypes ?? placeTypes.map(([entry]) => entry);
    setNearbyPlaceTypes(currentlyVisible ? current.filter((entry) => entry !== type) : [...current, type]);
  };

  return <div className="space-y-3 rounded-lg border border-[var(--evergreen)]/15 bg-[var(--evergreen)]/3 p-3">
    <div className="flex items-center gap-2"><Flag className="h-4 w-4 text-[var(--trail-orange)]" /><p className="text-sm font-medium text-[var(--evergreen)]">Route landmarks</p></div>
    <p className="text-xs text-[var(--evergreen-60)]">Choose the landscape details you want on the replay. Your route marker remains the visual priority.</p>
    <label className="flex items-start justify-between gap-3 rounded-lg bg-[var(--canvas)]/60 px-2.5 py-2"><span><span className="block text-xs font-medium text-[var(--evergreen)]">Route moments</span><span className="block pt-0.5 text-[11px] text-[var(--evergreen-60)]">Highest point, major climb/descent, halfway and finish. Off by default.</span></span><input type="checkbox" checked={showAutomaticLandmarks} onChange={(event) => setShowAutomaticLandmarks(event.target.checked)} /></label>
    <label className="flex items-start justify-between gap-3 rounded-lg bg-[var(--canvas)]/60 px-2.5 py-2"><span><span className="block text-xs font-medium text-[var(--evergreen)]">Nearby named places</span><span className="block pt-0.5 text-[11px] text-[var(--evergreen-60)]">Finds named peaks, passes, lakes, huts and towns near this route using OpenStreetMap.</span></span><input type="checkbox" checked={nearbyPlacesEnabled} onChange={(event) => setNearbyPlacesEnabled(event.target.checked)} /></label>
    {nearbyPlacesLoading && <p className="text-xs text-[var(--evergreen-60)]">Finding named places near this route…</p>}
    {nearbyPlacesError && <p className="text-xs text-red-600">{nearbyPlacesError}</p>}
    {nearbyPlacesEnabled && !nearbyPlacesLoading && !nearbyPlacesError && placeTypes.length > 0 && <div className="space-y-2 rounded-lg bg-[var(--canvas)]/60 p-2.5"><p className="text-xs font-medium text-[var(--evergreen)]">Show place types</p>{placeTypes.map(([type, count]) => <label key={type} className="flex items-center justify-between gap-3 text-xs text-[var(--evergreen)]"><span className="flex items-center gap-2"><input type="checkbox" checked={nearbyPlaceTypes === null || nearbyPlaceTypes.includes(type)} onChange={() => togglePlaceType(type)} />{labelForType(type)}</span><span className="text-[var(--evergreen-60)]">{count}</span></label>)}</div>}
    {nearbyPlacesEnabled && !nearbyPlacesLoading && !nearbyPlacesError && <p className="text-xs text-[var(--evergreen-60)]">{enrichedLandmarks.length > 0 ? `${enrichedLandmarks.length} named places loaded.` : 'Nearby places load when you open a route.'}</p>}
    {nearbyPlacesCoverage?.complete && <p className="text-[11px] text-[var(--evergreen-60)]">Complete coverage around this route · {nearbyPlacesCoverage.source === 'landmark-database' ? 'TrailReplay landmark database' : nearbyPlacesCoverage.cacheHits === nearbyPlacesCoverage.tiles ? 'shared cache' : `${nearbyPlacesCoverage.fetchedTiles} area${nearbyPlacesCoverage.fetchedTiles === 1 ? '' : 's'} added to shared cache`}</p>}
    {nearbyPlacesEnabled && <p className="text-[11px] text-[var(--evergreen-60)]">Nearby-place data © <a className="underline hover:text-[var(--trail-orange)]" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, available under ODbL.</p>}
  </div>;
}
