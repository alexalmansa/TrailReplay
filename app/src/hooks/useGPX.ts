import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { parseGPXFiles, parseRouteFiles } from '@/utils/gpxParser';
import { isRecipeFile, parseRecipeFile } from '@/utils/recipe/parseRecipeFile';
import { resolveRecipe } from '@/utils/recipe/resolveRecipe';
import { applyRecipe } from '@/utils/recipe/applyRecipe';
import { RecipeError } from '@/utils/recipe/types';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import { getDistanceBucket, trackEvent } from '@/utils/analytics';
import { isReplayFile, useProjectFile } from '@/hooks/useProjectFile';

export type RouteInputMethod = 'file_picker' | 'dropzone';

export function useGPX() {
  const { t } = useI18n();
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const addTrack = useAppStore((state) => state.addTrack);
  const setError = useAppStore((state) => state.setError);
  const { openProjectFile } = useProjectFile();

  const applyRecipeFiles = useCallback(async (
    recipeFile: File,
    fileArray: File[],
    routeInputMethod: RouteInputMethod,
  ) => {
    setIsParsing(true);
    setParseError(null);
    trackEvent('recipe_import_started', { route_input_method: routeInputMethod });

    try {
      const recipe = await parseRecipeFile(recipeFile);
      const parsed = await parseRouteFiles(fileArray);
      if (parsed.length === 0) {
        throw new RecipeError(
          'Drop the GPX or KML files together with the recipe — it only names them.',
        );
      }

      const resolved = resolveRecipe(
        recipe,
        parsed.map((entry) => entry.track),
        parsed.map((entry) => entry.fileName),
      );
      applyRecipe(recipe, resolved, useAppStore.getState());
      useAppStore.getState().setRecipeReport(resolved.report);

      trackEvent('recipe_import_completed', {
        recipe_track_count: resolved.report.trackCount,
        recipe_landmark_count: resolved.report.landmarks.length,
        recipe_annotation_count: resolved.report.annotations.length,
        recipe_warning_count: resolved.report.warnings.length,
        recipe_stitched: resolved.report.stitched,
      });

      const placed = resolved.report.landmarks.length + resolved.report.annotations.length;
      toast.success(t('recipe.applied', {
        tracks: String(resolved.report.trackCount),
        placed: String(placed),
      }));

      return resolved.tracks;
    } catch (error) {
      console.error('Failed to apply recipe:', error);
      const message = error instanceof RecipeError
        ? error.message
        : t('recipe.errors.failed');
      trackEvent('recipe_import_failed', {
        recipe_error_type: error instanceof RecipeError ? 'recipe' : 'unknown',
      });
      setParseError(message);
      setError(message);
      throw error;
    } finally {
      setIsParsing(false);
    }
  }, [setError, t]);

  const parseFiles = useCallback(async (
    files: FileList | File[] | null,
    routeInputMethod: RouteInputMethod = 'file_picker',
  ) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    // A .replay file is a saved project, not a route — open it instead of parsing GPX/KML.
    const replayFile = fileArray.find(isReplayFile);
    if (replayFile) {
      await openProjectFile(replayFile);
      return undefined;
    }

    // A recipe describes a whole replay in terms of the routes dropped with it.
    const recipeFile = fileArray.find(isRecipeFile);
    if (recipeFile) {
      return applyRecipeFiles(recipeFile, fileArray, routeInputMethod);
    }

    setIsParsing(true);
    setParseError(null);
    trackEvent('route_import_started', {
      route_file_count: fileArray.length,
      route_input_method: routeInputMethod,
    });
    
    try {
      const tracks = await parseGPXFiles(fileArray);
      
      if (tracks.length === 0) {
        throw new Error(t('errors.noValidGpx'));
      }
      
      tracks.forEach((track) => {
        addTrack(track);
      });

      trackEvent('route_import_completed', {
        route_file_count: fileArray.length,
        route_imported_track_count: tracks.length,
        route_import_is_multi_file: fileArray.length > 1,
        route_input_method: routeInputMethod,
        route_total_distance_bucket: getDistanceBucket(
          tracks.reduce((total, track) => total + track.totalDistance, 0),
        ),
        route_has_timestamps: tracks.some((track) =>
          track.points.some((point) => point.time !== null)
        ),
      });
      
      return tracks;
    } catch (error) {
      trackEvent('route_import_failed', {
        route_file_count: fileArray.length,
        route_input_method: routeInputMethod,
        route_error_type: error instanceof Error && error.message === t('errors.noValidGpx')
          ? 'empty_result'
          : 'parse_error',
      });
      const message = error instanceof Error ? error.message : t('errors.parseGpxFailed');
      setParseError(message);
      setError(message);
      throw error;
    } finally {
      setIsParsing(false);
    }
  }, [addTrack, applyRecipeFiles, openProjectFile, setError, t]);

  return {
    parseFiles,
    isParsing,
    parseError,
  };
}
