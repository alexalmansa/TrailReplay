import { AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import type { RecipeResolvedEntry } from '@/utils/recipe/types';

/**
 * What the recipe resolved to, shown once after a drop.
 *
 * A recipe describes intent — "the aid station at km 6.5" — and the app turns
 * that into coordinates. Nobody should have to take that on trust, so every
 * placement is listed with the kilometre and the route it landed on, and the
 * things that will silently look wrong are called out rather than left to be
 * discovered in the finished video.
 */
export function RecipeReportCard() {
  const { t } = useI18n();
  const report = useAppStore((state) => state.recipeReport);
  const setRecipeReport = useAppStore((state) => state.setRecipeReport);

  if (!report) return null;

  const showTrackName = report.trackCount > 1;

  const renderEntry = (entry: RecipeResolvedEntry, index: number) => (
    <li key={`${entry.title}-${index}`} className="recipe-report__entry">
      {/* Two different numbers: the km is along its own route, the seconds are
          of the whole replay. Showing only the first is what made a card in a
          multi-route project look correctly placed when it was not. */}
      <span className="recipe-report__km">{entry.km.toFixed(1)} km</span>
      <span className="recipe-report__at">
        {entry.onScreenFromSeconds !== undefined
          ? `${entry.onScreenFromSeconds.toFixed(0)}–${entry.atSeconds.toFixed(0)}s`
          : `${entry.atSeconds.toFixed(0)}s`}
      </span>
      <span className="recipe-report__title" title={entry.title}>{entry.title}</span>
      {entry.markerOffMeters > 150 && (
        <span className="recipe-report__tag recipe-report__tag--bad">
          {t('recipe.markerAway', {
            distance: entry.markerOffMeters >= 1000
              ? `${(entry.markerOffMeters / 1000).toFixed(1)} km`
              : `${entry.markerOffMeters} m`,
          })}
        </span>
      )}
      {showTrackName && <span className="recipe-report__track">{entry.trackName}</span>}
      {entry.derived && <span className="recipe-report__tag">{t('recipe.derived')}</span>}
      {entry.offRouteMeters !== undefined && entry.offRouteMeters > 50 && (
        <span className="recipe-report__tag">
          {t('recipe.offRoute', { meters: String(entry.offRouteMeters) })}
        </span>
      )}
    </li>
  );

  return (
    <section className="recipe-report">
      <header className="recipe-report__header">
        <h3>{t('recipe.reportTitle')}</h3>
        <button
          type="button"
          onClick={() => setRecipeReport(null)}
          aria-label={t('recipe.dismiss')}
          className="recipe-report__dismiss"
        >
          <X size={14} />
        </button>
      </header>

      <p className="recipe-report__summary">
        {t('recipe.routes', { count: String(report.trackCount) })}
        {' · '}
        {(report.totalDistanceMeters / 1000).toFixed(1)} km
        {' · '}
        {t('recipe.timeHint')}
        {report.trackCount > 1 && (
          <> · {t(report.stitched ? 'recipe.stitched' : 'recipe.alternatives')}</>
        )}
      </p>

      {report.landmarks.length > 0 && (
        <>
          <h4 className="recipe-report__subhead">{t('recipe.pins')}</h4>
          <ul className="recipe-report__list">{report.landmarks.map(renderEntry)}</ul>
        </>
      )}

      {report.annotations.length > 0 && (
        <>
          <h4 className="recipe-report__subhead">{t('recipe.cards')}</h4>
          <ul className="recipe-report__list">{report.annotations.map(renderEntry)}</ul>
        </>
      )}

      {report.warnings.length > 0 && (
        <div className="recipe-report__warnings">
          <h4 className="recipe-report__subhead">
            <AlertTriangle size={13} /> {t('recipe.warnings')}
          </h4>
          <ul>
            {report.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
