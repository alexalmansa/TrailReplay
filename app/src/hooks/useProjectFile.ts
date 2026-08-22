import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import { trackEvent } from '@/utils/analytics';
import { parseReplayArchive } from '@/utils/projectFile/parseReplayArchive';
import { hydrateProject } from '@/utils/projectFile/hydrateProject';
import { hasUnsavedProjectContent } from '@/utils/projectFile/hasUnsavedWork';
import { downloadReplayArchive, type SaveProjectSource } from '@/utils/projectFile/downloadReplayArchive';
import { ReplayArchiveError, type ReplayArchiveErrorCode } from '@/utils/projectFile/validation';

export function isReplayFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.replay');
}

function errorCodeToTranslationKey(code: ReplayArchiveErrorCode): string {
  switch (code) {
    case 'corrupt': return 'projectFile.errors.corrupt';
    case 'unsupported-version': return 'projectFile.errors.unsupportedVersionUnknown';
    case 'missing-asset': return 'projectFile.errors.missingAsset';
    case 'too-large': return 'projectFile.errors.tooLarge';
  }
}

export function useProjectFile() {
  const { t } = useI18n();
  const setError = useAppStore((state) => state.setError);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const saveProject = useCallback(async (source: SaveProjectSource) => {
    setIsSaving(true);
    try {
      await downloadReplayArchive(useAppStore.getState(), source);
    } catch (error) {
      console.error('Failed to save project:', error);
      setError(t('projectFile.errors.corrupt'));
    } finally {
      setIsSaving(false);
    }
  }, [setError, t]);

  const openProjectFile = useCallback(async (file: File) => {
    const currentState = useAppStore.getState();
    if (hasUnsavedProjectContent(currentState) && !window.confirm(t('projectFile.confirmReplace'))) {
      trackEvent('project_open_cancelled', { reason: 'confirm_replace_declined' });
      return;
    }

    setIsOpening(true);
    trackEvent('project_open_started', {});
    try {
      const parsed = await parseReplayArchive(file);
      hydrateProject(parsed, useAppStore.getState());
      trackEvent('project_open_completed', {
        format_version: parsed.manifest.formatVersion,
        track_count: parsed.tracks.length,
        picture_count: parsed.project.pictures.length,
        video_count: parsed.project.videos.length,
      });
      toast.success(t('projectFile.opened'));
    } catch (error) {
      console.error('Failed to open project:', error);
      const key = error instanceof ReplayArchiveError
        ? errorCodeToTranslationKey(error.code)
        : 'projectFile.errors.corrupt';
      trackEvent('project_open_failed', {
        error_code: error instanceof ReplayArchiveError ? error.code : 'unknown',
      });
      setError(t(key));
    } finally {
      setIsOpening(false);
    }
  }, [setError, t]);

  return { saveProject, openProjectFile, isSaving, isOpening };
}
