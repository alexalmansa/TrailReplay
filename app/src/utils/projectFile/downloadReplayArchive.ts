import type { AppState } from '@/store/storeTypes';
import { buildReplayArchive } from './buildReplayArchive';

function slugifyProjectFileName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

export async function downloadReplayArchive(state: AppState): Promise<void> {
  const blob = await buildReplayArchive(state);
  const fileName = `${slugifyProjectFileName(state.journey?.name ?? 'trailreplay-project')}.replay`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
