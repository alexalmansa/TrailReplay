import type { AppState } from '@/store/storeTypes';
import { trackEvent } from '@/utils/analytics';
import { buildReplayArchive } from './buildReplayArchive';

function slugifyProjectFileName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

export type SaveProjectSource = 'sidebar' | 'feedback_popup_blocked';

export async function downloadReplayArchive(state: AppState, source: SaveProjectSource): Promise<void> {
  trackEvent('project_save_started', { save_source: source });

  try {
    const blob = await buildReplayArchive(state);
    const fileName = `${slugifyProjectFileName(state.journey?.name ?? 'trailreplay-project')}.replay`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);

    trackEvent('project_save_completed', {
      save_source: source,
      track_count: state.tracks.length,
      picture_count: state.pictures.length,
      video_count: state.videos.length,
    });
  } catch (error) {
    trackEvent('project_save_failed', { save_source: source });
    throw error;
  }
}
