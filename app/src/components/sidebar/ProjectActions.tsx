import { useRef, useState } from 'react';
import { Save, FolderOpen, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import { buildReplayArchive } from '@/utils/projectFile/buildReplayArchive';
import { parseReplayArchive } from '@/utils/projectFile/parseReplayArchive';
import { hydrateProject } from '@/utils/projectFile/hydrateProject';
import { ReplayArchiveError, type ReplayArchiveErrorCode } from '@/utils/projectFile/validation';

function slugifyProjectFileName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function errorCodeToTranslationKey(code: ReplayArchiveErrorCode): string {
  switch (code) {
    case 'corrupt': return 'projectFile.errors.corrupt';
    case 'unsupported-version': return 'projectFile.errors.unsupportedVersionUnknown';
    case 'missing-asset': return 'projectFile.errors.missingAsset';
    case 'too-large': return 'projectFile.errors.tooLarge';
  }
}

export function ProjectActions() {
  const { t } = useI18n();
  const tracks = useAppStore((state) => state.tracks);
  const pictures = useAppStore((state) => state.pictures);
  const journey = useAppStore((state) => state.journey);
  const isExporting = useAppStore((state) => state.isExporting);
  const setError = useAppStore((state) => state.setError);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const hasContent = tracks.length > 0 || pictures.length > 0 || journey !== null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const blob = await buildReplayArchive(useAppStore.getState());
      const fileName = `${slugifyProjectFileName(journey?.name ?? 'trailreplay-project')}.replay`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to save project:', error);
      setError(t('projectFile.errors.corrupt'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (hasContent && !window.confirm(t('projectFile.confirmReplace'))) {
      return;
    }

    setIsOpening(true);
    try {
      const parsed = await parseReplayArchive(file);
      hydrateProject(parsed, useAppStore.getState());
    } catch (error) {
      console.error('Failed to open project:', error);
      const key = error instanceof ReplayArchiveError
        ? errorCodeToTranslationKey(error.code)
        : 'projectFile.errors.corrupt';
      setError(t(key));
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="mb-3 grid grid-cols-2 gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".replay"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={isExporting || isSaving || tracks.length === 0}
        className="tr-btn tr-btn-secondary flex items-center justify-center gap-1.5 text-sm disabled:opacity-45 disabled:cursor-not-allowed"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {t('sidebar.saveProject')}
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isExporting || isOpening}
        className="tr-btn tr-btn-secondary flex items-center justify-center gap-1.5 text-sm disabled:opacity-45 disabled:cursor-not-allowed"
      >
        {isOpening ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
        {t('sidebar.openProject')}
      </button>
    </div>
  );
}
