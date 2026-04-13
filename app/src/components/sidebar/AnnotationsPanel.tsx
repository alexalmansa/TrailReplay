import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { ACTIVITY_ICONS, isSvgActivityIcon, renderActivityIcon } from '@/utils/activityIcons';
import { convertElevation } from '@/utils/units';
import { Eye, EyeOff, MapPinned, Play, Plus, Trash2 } from 'lucide-react';

const DEFAULT_ANNOTATION_DURATION = 4000;

const COLOR_PRESETS = [
  { color: '#C1652F', labelKey: 'colors.trailOrange' },
  { color: '#28a745', labelKey: 'colors.green' },
  { color: '#7FB8AD', labelKey: 'colors.teal' },
  { color: '#3B82F6', labelKey: 'colors.blue' },
  { color: '#dc3545', labelKey: 'colors.red' },
  { color: '#8B5CF6', labelKey: 'colors.purple' },
];

// ─── Inline name editor ────────────────────────────────────────────────────
function InlineName({
  name,
  color,
  onSave,
  renameTitle,
}: {
  name: string;
  color: string;
  onSave: (name: string) => void;
  renameTitle: string;
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
      title={renameTitle}
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
  nameLabel,
  colorLabel,
  renameTitle,
  resolveColorLabel,
}: {
  label: string;
  color: string;
  name: string;
  onColorChange: (c: string) => void;
  onNameChange: (n: string) => void;
  nameLabel: string;
  colorLabel: string;
  renameTitle: string;
  resolveColorLabel: (key: string) => string;
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
        <Label className="text-xs text-[var(--evergreen-60)] w-10 flex-shrink-0">{nameLabel}</Label>
        <InlineName name={name} color={color} onSave={onNameChange} renameTitle={renameTitle} />
      </div>

      {/* Color row */}
      <div className="flex items-center gap-3">
        <Label className="text-xs text-[var(--evergreen-60)] w-10 flex-shrink-0">{colorLabel}</Label>
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-2 border-[var(--evergreen)]/20 flex-shrink-0"
        />
        <div className="flex gap-1.5 flex-wrap">
          {COLOR_PRESETS.map(({ color: preset, labelKey }) => (
            <button
              key={preset}
              onClick={() => onColorChange(preset)}
              title={resolveColorLabel(labelKey)}
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
  const { t } = useI18n();
  const settings = useAppStore((state) => state.settings);
  const trailStyle = useAppStore((state) => state.settings.trailStyle);
  const setSettings = useAppStore((state) => state.setSettings);
  const setTrailStyle = useAppStore((state) => state.setTrailStyle);

  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const playback = useAppStore((state) => state.playback);
  const updateTrackColor = useAppStore((state) => state.updateTrackColor);
  const updateTrackIcon = useAppStore((state) => state.updateTrackIcon);
  const updateTrackName = useAppStore((state) => state.updateTrackName);

  const comparisonTracks = useAppStore((state) => state.comparisonTracks);
  const updateComparisonColor = useAppStore((state) => state.updateComparisonColor);
  const updateComparisonTrackName = useAppStore((state) => state.updateComparisonTrackName);
  const textAnnotations = useAppStore((state) => state.textAnnotations);
  const selectedTextAnnotationId = useAppStore((state) => state.selectedTextAnnotationId);
  const addTextAnnotation = useAppStore((state) => state.addTextAnnotation);
  const updateTextAnnotation = useAppStore((state) => state.updateTextAnnotation);
  const removeTextAnnotation = useAppStore((state) => state.removeTextAnnotation);
  const seekToProgress = useAppStore((state) => state.seekToProgress);
  const setSelectedTextAnnotationId = useAppStore((state) => state.setSelectedTextAnnotationId);

  const [showIconPicker, setShowIconPicker] = useState(false);
  const [draftAnnotationLabel, setDraftAnnotationLabel] = useState('NOTE');
  const [draftAnnotationTitle, setDraftAnnotationTitle] = useState('');
  const [draftAnnotationSubtitle, setDraftAnnotationSubtitle] = useState('');

  const { currentPosition } = useComputedJourney();

  const hasMultiple = tracks.length > 1 || comparisonTracks.length > 0;
  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? tracks[0] ?? null;
  const displayedIcon = activeTrack?.activityIcon ?? trailStyle.currentIcon;
  const canAddAnnotation = Boolean(currentPosition);

  // When the active track color changes, also sync trailStyle
  const handleMainColorChange = (trackId: string, color: string) => {
    updateTrackColor(trackId, color);
    if (trackId === activeTrackId) {
      setTrailStyle({ trailColor: color });
    }
  };

  const handleHeartRateToggle = (checked: boolean) => {
    setSettings({ showHeartRate: checked });
    setTrailStyle({ colorMode: checked ? 'heartRate' : 'fixed' });
  };

  const currentIconColor = isSvgActivityIcon(displayedIcon)
    ? trailStyle.markerColor
    : undefined;

  const handleAddAnnotation = () => {
    if (!currentPosition || !draftAnnotationTitle.trim()) return;

    const annotationId = crypto.randomUUID();
    addTextAnnotation({
      id: annotationId,
      progress: playback.progress,
      lat: currentPosition.lat,
      lon: currentPosition.lon,
      label: draftAnnotationLabel.trim() || 'NOTE',
      title: draftAnnotationTitle.trim(),
      subtitle: draftAnnotationSubtitle.trim() || undefined,
      elevation: currentPosition.elevation > 0 ? currentPosition.elevation : undefined,
      displayDuration: DEFAULT_ANNOTATION_DURATION,
    });
    setSelectedTextAnnotationId(annotationId);
    setDraftAnnotationTitle('');
    setDraftAnnotationSubtitle('');
  };

  return (
    <div className="space-y-6">

      {/* ── Track colour & name sections ─────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
          {hasMultiple ? t('annotations.tracksTitle') : t('annotations.trailTitle')}
        </h3>

        {tracks.length === 0 && comparisonTracks.length === 0 && (
          <p className="text-xs text-[var(--evergreen-60)]">{t('annotations.noTracks')}</p>
        )}

        {/* Main tracks */}
        {tracks.map((track, i) => (
          <TrackStyleSection
            key={track.id}
            label={hasMultiple ? t('annotations.trackLabel', { index: i + 1 }) : t('annotations.mainTrack')}
            color={track.color}
            name={track.name}
            onColorChange={(c) => handleMainColorChange(track.id, c)}
            onNameChange={(n) => updateTrackName(track.id, n)}
            nameLabel={t('common.name')}
            colorLabel={t('annotations.trackColor')}
            renameTitle={t('common.clickRename')}
            resolveColorLabel={(key) => t(key)}
          />
        ))}

        {/* Comparison tracks */}
        {comparisonTracks.map((ct, i) => (
          <TrackStyleSection
            key={ct.id}
            label={
              comparisonTracks.length > 1
                ? t('annotations.comparisonNumbered', { index: i + 1 })
                : t('annotations.comparisonSingle')
            }
            color={ct.color}
            name={ct.name}
            onColorChange={(c) => updateComparisonColor(ct.id, c)}
            onNameChange={(n) => updateComparisonTrackName(ct.id, n)}
            nameLabel={t('common.name')}
            colorLabel={t('annotations.trackColor')}
            renameTitle={t('common.clickRename')}
            resolveColorLabel={(key) => t(key)}
          />
        ))}
      </div>

      {/* ── Label visibility ─────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
          {t('annotations.labelsTitle')}
        </h3>
        <div className="flex items-center justify-between">
          <Label className="text-sm text-[var(--evergreen)]">{t('annotations.showOnMap')}</Label>
          <Switch
            checked={trailStyle.showTrackLabels}
            onCheckedChange={(checked) => setTrailStyle({ showTrackLabels: checked })}
          />
        </div>
        {trailStyle.showTrackLabels && (
          <p className="text-xs text-[var(--evergreen-60)]">
            {t('annotations.labelsHint')}
          </p>
        )}
      </div>

      {/* ── Heart rate styling ─────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
          {t('annotations.heartRateTitle')}
        </h3>

        <div className="flex items-center justify-between">
          <Label className="text-sm text-[var(--evergreen)]">{t('settings.showHeartRate')}</Label>
          <Switch
            checked={settings.showHeartRate}
            onCheckedChange={handleHeartRateToggle}
          />
        </div>

        {settings.showHeartRate && (
          <div className="space-y-3 rounded-lg border border-[var(--evergreen)]/15 p-3 bg-[var(--evergreen)]/3">
            <h4 className="text-xs font-bold text-[var(--evergreen)] uppercase tracking-wide">
              {t('settings.heartRateZones')}
            </h4>
            <div className="space-y-3">
              {trailStyle.heartRateZones.map((zone, idx) => (
                <div key={idx} className="bg-[var(--canvas)] p-2 rounded border border-[var(--evergreen)]/10">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="color"
                      value={zone.color}
                      onChange={(e) => {
                        const newZones = [...trailStyle.heartRateZones];
                        newZones[idx].color = e.target.value;
                        setTrailStyle({ heartRateZones: newZones });
                      }}
                      className="w-6 h-6 cursor-pointer rounded border border-[var(--evergreen)]/20"
                    />
                    <span className="text-xs font-semibold text-[var(--evergreen)]">
                      {t('settings.heartRateZone', { index: idx + 1 })}
                    </span>
                    <span className="text-xs text-[var(--evergreen-60)]">{zone.color}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="300"
                      value={zone.min}
                      onChange={(e) => {
                        const newZones = [...trailStyle.heartRateZones];
                        newZones[idx].min = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setTrailStyle({ heartRateZones: newZones });
                      }}
                      className="w-14 px-2 py-1 text-xs bg-[var(--canvas)] border border-[var(--evergreen)]/30 rounded text-[var(--evergreen)] font-medium"
                    />
                    <span className="text-xs text-[var(--evergreen-60)] font-semibold">-</span>
                    <input
                      type="number"
                      min="0"
                      max="300"
                      value={zone.max}
                      onChange={(e) => {
                        const newZones = [...trailStyle.heartRateZones];
                        newZones[idx].max = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setTrailStyle({ heartRateZones: newZones });
                      }}
                      className="w-14 px-2 py-1 text-xs bg-[var(--canvas)] border border-[var(--evergreen)]/30 rounded text-[var(--evergreen)] font-medium"
                    />
                    <span className="text-xs text-[var(--evergreen-60)]">{t('stats.bpm')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Marker settings ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
          {t('annotations.markerTitle')}
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-[var(--evergreen)]">{t('annotations.showMarker')}</Label>
            <Switch
              checked={trailStyle.showMarker}
              onCheckedChange={(checked) => setTrailStyle({ showMarker: checked })}
            />
          </div>

          {trailStyle.showMarker && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-[var(--evergreen)]">{t('annotations.size')}</Label>
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
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-[var(--evergreen)] w-16 flex-shrink-0">
                    {t('annotations.markerColor')}
                  </Label>
                  <input
                    type="color"
                    value={trailStyle.markerColor}
                    onChange={(e) => setTrailStyle({ markerColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border-2 border-[var(--evergreen)]/20 flex-shrink-0"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map(({ color: preset, labelKey }) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTrailStyle({ markerColor: preset })}
                        title={t(labelKey)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          trailStyle.markerColor === preset
                            ? 'border-[var(--evergreen)] scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[var(--evergreen-60)]">
                  {isSvgActivityIcon(displayedIcon)
                    ? t('annotations.markerColorSvgHint')
                    : t('annotations.markerColorEmojiHint')}
                </p>

                <Label className="text-sm text-[var(--evergreen)]">{t('annotations.activityIcon')}</Label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full border-2 border-[var(--evergreen)]/20 flex items-center justify-center"
                    style={{
                      backgroundColor: trailStyle.showCircle ? `${trailStyle.markerColor}40` : 'transparent',
                      borderColor: trailStyle.markerColor,
                    }}
                  >
                    {renderActivityIcon(displayedIcon, { size: 32, color: currentIconColor })}
                  </div>
                  <button
                    onClick={() => setShowIconPicker(true)}
                    className="tr-btn tr-btn-secondary text-sm"
                  >
                    {t('annotations.changeIcon')}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm text-[var(--evergreen)]">{t('annotations.glowCircle')}</Label>
                <Switch
                  checked={trailStyle.showCircle}
                  onCheckedChange={(checked) => setTrailStyle({ showCircle: checked })}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--evergreen)] uppercase tracking-wide">
          {t('annotations.routeAnnotationsTitle')}
        </h3>

        <div className="space-y-3 rounded-lg border border-[var(--evergreen)]/15 p-3 bg-[var(--evergreen)]/3">
          <p className="text-xs text-[var(--evergreen-60)]">
            {t('annotations.routeAnnotationsHint')}
          </p>

          <div className="grid grid-cols-[96px_1fr] gap-2">
            <input
              value={draftAnnotationLabel}
              onChange={(e) => setDraftAnnotationLabel(e.target.value)}
              placeholder={t('annotations.routeAnnotationLabelPlaceholder')}
              className="rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm font-semibold uppercase text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
              maxLength={18}
            />
            <input
              value={draftAnnotationTitle}
              onChange={(e) => setDraftAnnotationTitle(e.target.value)}
              placeholder={t('annotations.routeAnnotationTitlePlaceholder')}
              className="rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
              maxLength={48}
            />
          </div>

          <input
            value={draftAnnotationSubtitle}
            onChange={(e) => setDraftAnnotationSubtitle(e.target.value)}
            placeholder={t('annotations.routeAnnotationSubtitlePlaceholder')}
            className="w-full rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
            maxLength={48}
          />

          <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--evergreen)]/10 bg-[var(--canvas)]/55 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--evergreen)]">
                {canAddAnnotation
                  ? t('annotations.routeAnnotationReady', { percent: (playback.progress * 100).toFixed(0) })
                  : t('annotations.routeAnnotationNoPosition')}
              </p>
              {currentPosition?.elevation ? (
                <p className="text-[11px] text-[var(--evergreen-60)] mt-0.5">
                  {t('annotations.routeAnnotationElevation', {
                    elevation: Math.round(convertElevation(currentPosition.elevation, settings.unitSystem)).toLocaleString(),
                    unit: settings.unitSystem === 'metric' ? 'm' : 'ft',
                  })}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleAddAnnotation}
              disabled={!canAddAnnotation || !draftAnnotationTitle.trim()}
              className="tr-btn tr-btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {t('annotations.addRouteAnnotation')}
            </button>
          </div>
        </div>

        {textAnnotations.length === 0 ? (
          <p className="text-xs text-[var(--evergreen-60)]">{t('annotations.routeAnnotationsEmpty')}</p>
        ) : (
          <div className="space-y-3">
            {textAnnotations
              .slice()
              .sort((a, b) => a.progress - b.progress)
              .map((annotation) => {
                const isSelected = selectedTextAnnotationId === annotation.id;
                const annotationElevation = annotation.elevation !== undefined
                  ? `${Math.round(convertElevation(annotation.elevation, settings.unitSystem)).toLocaleString()} ${settings.unitSystem === 'metric' ? 'm' : 'ft'}`
                  : null;

                return (
                  <div
                    key={annotation.id}
                    className={`space-y-3 rounded-lg border p-3 ${
                      isSelected
                        ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                        : 'border-[var(--evergreen)]/15 bg-[var(--evergreen)]/3'
                    }`}
                  >
                    <div className="grid grid-cols-[96px_1fr] gap-2">
                      <input
                        value={annotation.label}
                        onChange={(e) => updateTextAnnotation(annotation.id, { label: e.target.value })}
                        className="rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm font-semibold uppercase text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
                        maxLength={18}
                      />
                      <input
                        value={annotation.title}
                        onChange={(e) => updateTextAnnotation(annotation.id, { title: e.target.value })}
                        className="rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
                        maxLength={48}
                      />
                    </div>

                    <input
                      value={annotation.subtitle ?? ''}
                      onChange={(e) => updateTextAnnotation(annotation.id, { subtitle: e.target.value || undefined })}
                      placeholder={t('annotations.routeAnnotationSubtitlePlaceholder')}
                      className="w-full rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
                      maxLength={48}
                    />

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--evergreen-60)]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--canvas)]/70 px-2 py-1">
                        <MapPinned className="w-3 h-3" />
                        {t('annotations.routeAnnotationProgress', { percent: (annotation.progress * 100).toFixed(0) })}
                      </span>
                      {annotationElevation && (
                        <span className="rounded-full bg-[var(--canvas)]/70 px-2 py-1">
                          {annotationElevation}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-[1fr_1fr_auto_44px] gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTextAnnotationId(isSelected ? null : annotation.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--evergreen)]/15 bg-[var(--canvas)]/70 px-3 py-2 text-sm text-[var(--evergreen)] hover:bg-[var(--evergreen)]/10"
                      >
                        {isSelected ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {isSelected ? t('annotations.hideRouteAnnotation') : t('annotations.previewRouteAnnotation')}
                      </button>

                      <button
                        type="button"
                        onClick={() => seekToProgress(annotation.progress)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--evergreen)]/15 bg-[var(--canvas)]/70 px-3 py-2 text-sm text-[var(--evergreen)] hover:bg-[var(--evergreen)]/10"
                      >
                        <Play className="w-4 h-4" />
                        {t('annotations.goToAnnotation')}
                      </button>

                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={Math.round(annotation.displayDuration / 1000)}
                        onChange={(e) => {
                          const value = Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1));
                          updateTextAnnotation(annotation.id, { displayDuration: value * 1000 });
                        }}
                        className="rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-2 py-2 text-sm text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
                        title={t('annotations.annotationDuration')}
                      />

                      <button
                        type="button"
                        onClick={() => removeTextAnnotation(annotation.id)}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 hover:bg-red-100"
                        title={t('annotations.removeRouteAnnotation')}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--canvas)] border-2 border-[var(--evergreen)] rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-[var(--evergreen)] mb-4">
              {t('annotations.selectIcon')}
            </h3>
            <div className="grid grid-cols-6 gap-2 mb-6">
              {ACTIVITY_ICONS.map(({ value, labelKey }) => (
                <button
                  key={value}
                  onClick={() => {
                    if (activeTrack) {
                      updateTrackIcon(activeTrack.id, value);
                    } else {
                      setTrailStyle({ currentIcon: value });
                    }
                    setShowIconPicker(false);
                  }}
                  title={t(labelKey)}
                  className={`
                    flex items-center justify-center p-2 rounded-lg border-2 transition-colors
                    ${displayedIcon === value
                      ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                      : 'border-[var(--evergreen)]/20 hover:border-[var(--trail-orange)]/50'
                    }
                  `}
                >
                  {renderActivityIcon(value, {
                    size: 32,
                    color: isSvgActivityIcon(value) ? trailStyle.markerColor : undefined,
                  })}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowIconPicker(false)}
              className="w-full tr-btn tr-btn-secondary"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
