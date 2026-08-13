import { useState } from 'react';
import { Flag, MapPin, Play, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import type { LandmarkType } from '@/types/landmarks';

const TYPES: LandmarkType[] = ['custom', 'summit', 'viewpoint', 'hut', 'waterfall', 'camp', 'challenge', 'note'];
const COLORS = ['#f3b133', '#ff7a59', '#53c16d', '#3b82f6', '#8b5cf6'];

export function RouteLandmarksEditor() {
  const playback = useAppStore((state) => state.playback);
  const userLandmarks = useAppStore((state) => state.userLandmarks);
  const showAutomaticLandmarks = useAppStore((state) => state.showAutomaticLandmarks);
  const nearbyPlacesEnabled = useAppStore((state) => state.nearbyPlacesEnabled);
  const nearbyPlacesLoading = useAppStore((state) => state.nearbyPlacesLoading);
  const nearbyPlacesError = useAppStore((state) => state.nearbyPlacesError);
  const enrichedLandmarks = useAppStore((state) => state.enrichedLandmarks);
  const addLandmark = useAppStore((state) => state.addLandmark);
  const removeLandmark = useAppStore((state) => state.removeLandmark);
  const setShowAutomaticLandmarks = useAppStore((state) => state.setShowAutomaticLandmarks);
  const setNearbyPlacesEnabled = useAppStore((state) => state.setNearbyPlacesEnabled);
  const seekToProgress = useAppStore((state) => state.seekToProgress);
  const { currentPosition } = useComputedJourney();
  const [title, setTitle] = useState(''); const [type, setType] = useState<LandmarkType>('custom'); const [color, setColor] = useState(COLORS[0]);
  const add = () => {
    if (!currentPosition || !title.trim()) return;
    addLandmark({ id: crypto.randomUUID(), type, source: 'user', display: 'highlight', lat: currentPosition.lat, lon: currentPosition.lon, progress: playback.progress, elevation: currentPosition.elevation || undefined, title: title.trim(), importance: 5, color });
    setTitle('');
  };
  return <div className="space-y-3 rounded-lg border border-[var(--evergreen)]/15 bg-[var(--evergreen)]/3 p-3">
    <div className="flex items-center gap-2"><Flag className="h-4 w-4 text-[var(--trail-orange)]" /><p className="text-sm font-medium text-[var(--evergreen)]">Route landmarks</p></div>
    <p className="text-xs text-[var(--evergreen-60)]">Choose the landscape details you want on the replay. Your route marker remains the visual priority.</p>
    <label className="flex items-start justify-between gap-3 rounded-lg bg-[var(--canvas)]/60 px-2.5 py-2"><span><span className="block text-xs font-medium text-[var(--evergreen)]">Route moments</span><span className="block pt-0.5 text-[11px] text-[var(--evergreen-60)]">Highest point, major climb/descent, halfway and finish. Off by default.</span></span><input type="checkbox" checked={showAutomaticLandmarks} onChange={(event) => setShowAutomaticLandmarks(event.target.checked)} /></label>
    <label className="flex items-start justify-between gap-3 rounded-lg bg-[var(--canvas)]/60 px-2.5 py-2"><span><span className="block text-xs font-medium text-[var(--evergreen)]">Nearby named places</span><span className="block pt-0.5 text-[11px] text-[var(--evergreen-60)]">Finds named peaks, passes, lakes, huts and towns near this route using OpenStreetMap.</span></span><input type="checkbox" checked={nearbyPlacesEnabled} onChange={(event) => setNearbyPlacesEnabled(event.target.checked)} /></label>
    {nearbyPlacesLoading && <p className="text-xs text-[var(--evergreen-60)]">Finding named peaks, lakes and towns near this route…</p>}
    {nearbyPlacesError && <p className="text-xs text-red-600">{nearbyPlacesError}</p>}
    {nearbyPlacesEnabled && !nearbyPlacesLoading && !nearbyPlacesError && <p className="text-xs text-[var(--evergreen-60)]">{enrichedLandmarks.length > 0 ? `${enrichedLandmarks.length} named places loaded from OpenStreetMap.` : 'Nearby places load after replay pauses or reaches the end.'}</p>}
    {nearbyPlacesEnabled && <p className="text-[11px] text-[var(--evergreen-60)]">Nearby-place data © <a className="underline hover:text-[var(--trail-orange)]" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, available under ODbL.</p>}
    <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={48} placeholder="Landmark title" className="w-full rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]" />
    <div className="flex gap-2"><select value={type} onChange={(event) => setType(event.target.value as LandmarkType)} className="min-w-0 flex-1 rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-2 py-2 text-sm text-[var(--evergreen)]">{TYPES.map((entry) => <option key={entry} value={entry}>{entry.replace('-', ' ')}</option>)}</select><div className="flex items-center gap-1">{COLORS.map((entry) => <button key={entry} type="button" onClick={() => setColor(entry)} className={`h-5 w-5 rounded-full ${color === entry ? 'ring-2 ring-[var(--evergreen)] ring-offset-1' : ''}`} style={{ backgroundColor: entry }} />)}</div></div>
    <button type="button" onClick={add} disabled={!currentPosition || !title.trim()} className="tr-btn tr-btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Add landmark</button>
    {userLandmarks.length > 0 && <div className="space-y-2 border-t border-[var(--evergreen)]/10 pt-3">{userLandmarks.slice().sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0)).map((entry) => <div key={entry.id} className="flex items-center gap-2 text-sm"><MapPin className="h-3.5 w-3.5" style={{ color: entry.color }} /><span className="min-w-0 flex-1 truncate text-[var(--evergreen)]">{entry.title}</span><button type="button" onClick={() => seekToProgress(entry.progress ?? 0)} aria-label={`Go to ${entry.title}`}><Play className="h-4 w-4" /></button><button type="button" onClick={() => removeLandmark(entry.id)} aria-label={`Delete ${entry.title}`}><Trash2 className="h-4 w-4 text-red-500" /></button></div>)}</div>}
  </div>;
}
