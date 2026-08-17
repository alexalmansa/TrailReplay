import type { AppState } from '@/store/storeTypes';
import { trackEvent } from '@/utils/analytics';
import { buildReplayArchive } from './buildReplayArchive';

export function slugifyProjectFileName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

export type SaveProjectSource = 'sidebar' | 'feedback_popup_blocked';

const REPLAY_FILE_TYPES: SaveFilePickerAcceptType[] = [
  { description: 'TrailReplay project', accept: { 'application/zip': ['.replay'] } },
];

// Remembered for the lifetime of the page only (module-level, not persisted) so
// repeated saves in the same session silently overwrite the same file instead of
// re-prompting. Lost on reload — the browser gives no way to persist a writable
// handle across sessions without re-requesting permission anyway.
let rememberedHandle: FileSystemFileHandle | null = null;
let rememberedFileName: string | null = null;

function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

async function getWritableHandle(fileName: string): Promise<FileSystemFileHandle | 'cancelled'> {
  if (rememberedHandle && rememberedFileName === fileName) {
    try {
      const permission = await rememberedHandle.queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') return rememberedHandle;
      if (permission === 'prompt' && (await rememberedHandle.requestPermission({ mode: 'readwrite' })) === 'granted') {
        return rememberedHandle;
      }
    } catch {
      // Handle may have gone stale (file moved/deleted) — fall through to a fresh picker.
    }
  }

  try {
    const handle = await window.showSaveFilePicker!({
      suggestedName: fileName,
      types: REPLAY_FILE_TYPES,
    });
    rememberedHandle = handle;
    rememberedFileName = fileName;
    return handle;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    throw error;
  }
}

function triggerAnchorDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadReplayArchive(state: AppState, source: SaveProjectSource): Promise<void> {
  const fileName = `${slugifyProjectFileName(state.journey?.name ?? 'trailreplay-project')}.replay`;
  trackEvent('project_save_started', { save_source: source });

  try {
    // Call the picker before compressing the archive — showSaveFilePicker requires
    // fresh user-activation, which a long-ish async zip step could otherwise consume.
    if (supportsFileSystemAccess()) {
      const handle = await getWritableHandle(fileName);
      if (handle === 'cancelled') {
        trackEvent('project_save_cancelled', { save_source: source });
        return;
      }

      const blob = await buildReplayArchive(state);
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      trackEvent('project_save_completed', {
        save_source: source,
        save_method: 'file_system_access',
        track_count: state.tracks.length,
        picture_count: state.pictures.length,
        video_count: state.videos.length,
      });
      return;
    }

    const blob = await buildReplayArchive(state);
    triggerAnchorDownload(blob, fileName);

    trackEvent('project_save_completed', {
      save_source: source,
      save_method: 'download',
      track_count: state.tracks.length,
      picture_count: state.pictures.length,
      video_count: state.videos.length,
    });
  } catch (error) {
    trackEvent('project_save_failed', { save_source: source });
    throw error;
  }
}
