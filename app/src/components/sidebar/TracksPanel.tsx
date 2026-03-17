import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/store/useAppStore';
import { useGPX } from '@/hooks/useGPX';
import { parseGPX } from '@/utils/gpxParser';
import { useI18n } from '@/i18n/useI18n';
import { handleAsyncError } from '@/utils/errorHandler';
import {
  Upload,
  GitCompareArrows,
} from 'lucide-react';
import { ComparisonTrackItem } from '@/components/sidebar/tracks/ComparisonTrackItem';
import { LanguageSelectorCard, MapControlsNote } from '@/components/sidebar/tracks/LanguageSelectorCard';
import { TrackItem } from '@/components/sidebar/tracks/TrackItem';
import { COMPARISON_COLORS } from '@/components/sidebar/tracks/constants';

export function TracksPanel() {
  const { t } = useI18n();
  const { parseFiles, isParsing } = useGPX();
  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const removeTrack = useAppStore((state) => state.removeTrack);
  const setActiveTrack = useAppStore((state) => state.setActiveTrack);
  const updateTrackColor = useAppStore((state) => state.updateTrackColor);
  const updateTrackName = useAppStore((state) => state.updateTrackName);
  const toggleTrackVisibility = useAppStore((state) => state.toggleTrackVisibility);
  const reorderTracks = useAppStore((state) => state.reorderTracks);
  const settings = useAppStore((state) => state.settings);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const setExploreMode = useAppStore((state) => state.setExploreMode);

  // Comparison track state
  const comparisonTracks = useAppStore((state) => state.comparisonTracks);
  const addComparisonTrack = useAppStore((state) => state.addComparisonTrack);
  const removeComparisonTrack = useAppStore((state) => state.removeComparisonTrack);
  const updateComparisonTrackName = useAppStore((state) => state.updateComparisonTrackName);
  const [showComparison, setShowComparison] = useState(comparisonTracks.length > 0);
  const [isParsingComparison, setIsParsingComparison] = useState(false);
  const comparisonFileRef = useRef<HTMLInputElement>(null);

  const handleComparisonFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.gpx')) return;

    setIsParsingComparison(true);
    try {
      const content = await file.text();
      const track = parseGPX(content, file.name);
      const colorIndex = comparisonTracks.length % COMPARISON_COLORS.length;
      addComparisonTrack({
        id: `comparison-${Date.now()}`,
        name: track.name,
        color: COMPARISON_COLORS[colorIndex],
        track,
        visible: true,
        offset: 0,
      });
    } catch (err) {
      handleAsyncError(err, {
        scope: 'comparison-track-upload',
        fallbackMessage: 'Failed to parse comparison GPX',
      });
    } finally {
      setIsParsingComparison(false);
      if (comparisonFileRef.current) comparisonFileRef.current.value = '';
    }
  }, [addComparisonTrack, comparisonTracks.length]);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const trailFiles = acceptedFiles.filter(
      (file) => file.name.endsWith('.gpx') || file.name.endsWith('.kml') || file.type === 'application/gpx+xml' || file.type === 'application/vnd.google-earth.kml+xml'
    );
    if (trailFiles.length > 0) {
      await parseFiles(trailFiles as unknown as FileList);
    }
  }, [parseFiles]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/gpx+xml': ['.gpx'],
      'application/vnd.google-earth.kml+xml': ['.kml'],
    },
    multiple: true,
  });

  const handleReorder = (fromIndex: number, toIndex: number) => {
    reorderTracks(fromIndex, toIndex);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          tr-dropzone p-6
          ${isDragActive ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 mx-auto mb-3 text-[var(--evergreen-60)]" />
        <p className="text-sm font-medium text-[var(--evergreen)]">
          {isDragActive ? t('tracks.dropActive') : t('tracks.dropTitle')}
        </p>
        <p className="text-xs text-[var(--evergreen-60)] mt-1">
          {t('tracks.dropBrowse')}
        </p>
      </div>
      {/* Loading */}
      {isParsing && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-5 h-5 border-2 border-[var(--trail-orange)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--evergreen)]">{t('tracks.parsing')}</span>
        </div>
      )}
      
      {/* Track List */}
      {tracks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
              {t('tracks.loadedTracks', { count: tracks.length })}
            </h3>
            <span className="text-xs text-[var(--evergreen-60)]">
              {t('tracks.dragReorder')}
            </span>
          </div>
          <div className="space-y-2">
            {tracks.map((track, index) => (
              <TrackItem
                key={track.id}
                track={track}
                index={index}
                isActive={activeTrackId === track.id}
                onActivate={() => setActiveTrack(track.id)}
                onRemove={() => removeTrack(track.id)}
                onToggleVisibility={() => toggleTrackVisibility(track.id)}
                onColorChange={(color) => updateTrackColor(track.id, color)}
                onNameChange={(name) => updateTrackName(track.id, name)}
                onReorder={handleReorder}
                settings={settings}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Comparison Mode */}
      {tracks.length > 0 && (
        <div>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center gap-2 w-full text-left mb-3"
          >
            <GitCompareArrows className="w-4 h-4 text-[var(--evergreen-60)]" />
            <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
              {t('tracks.comparisonTitle')}
            </h3>
            <span className="text-xs text-[var(--evergreen-60)] ml-auto">
              {showComparison ? t('tracks.comparisonToggleOpen') : t('tracks.comparisonToggleClosed')}
            </span>
          </button>

          {showComparison && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--evergreen-60)]">
                {t('tracks.comparisonHint')}
              </p>

              {/* Comparison track list */}
              {comparisonTracks.map((ct) => (
                <ComparisonTrackItem
                  key={ct.id}
                  track={ct}
                  settings={settings}
                  onNameChange={(name) => updateComparisonTrackName(ct.id, name)}
                  onRemove={() => removeComparisonTrack(ct.id)}
                />
              ))}

              {/* Add comparison file */}
              <div>
                <input
                  ref={comparisonFileRef}
                  type="file"
                  accept=".gpx,.kml"
                  onChange={handleComparisonFile}
                  className="hidden"
                />
                <button
                  onClick={() => comparisonFileRef.current?.click()}
                  disabled={isParsingComparison}
                  className="tr-btn tr-btn-secondary w-full text-sm"
                >
                  {isParsingComparison ? t('tracks.parsingComparison') : t('tracks.addComparison')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {tracks.length === 0 && !isParsing && (
        <div className="text-center py-8 text-[var(--evergreen-60)]">
          <p className="text-sm">{t('tracks.emptyTitle')}</p>
          <p className="text-xs mt-1">{t('tracks.emptySubtitle')}</p>
          <button
            onClick={() => {
              setExploreMode(true);
              setSidebarOpen(false);
            }}
            className="tr-btn tr-btn-secondary w-full text-sm mt-4"
          >
            {t('tracks.explore')}
          </button>
        </div>
      )}

      <div className="space-y-3 pt-1">
        <MapControlsNote />
        <LanguageSelectorCard />
      </div>
    </div>
  );
}
