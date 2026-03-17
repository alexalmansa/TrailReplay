import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  createDefaultCameraSettings,
  createDefaultPlayback,
  createDefaultSettings,
  createDefaultVideoExportSettings,
} from '@/store/defaults';
import type { AppState } from '@/store/storeTypes';
import { createJourneySlice } from '@/store/slices/journeySlice';
import { createMediaSlice } from '@/store/slices/mediaSlice';
import { createPlaybackSlice } from '@/store/slices/playbackSlice';
import { createSettingsSlice } from '@/store/slices/settingsSlice';
import { createTracksSlice } from '@/store/slices/tracksSlice';
import { createUiSlice } from '@/store/slices/uiSlice';

export function createAppStore() {
  return create<AppState>()(
    immer((set, get, store) => ({
      ...createTracksSlice(set, get, store),
      ...createJourneySlice(set, get, store),
      ...createMediaSlice(set, get, store),
      ...createPlaybackSlice(set, get, store),
      ...createSettingsSlice(set, get, store),
      ...createUiSlice(set, get, store),

      reset: () =>
        set((state) => {
          state.tracks = [];
          state.activeTrackId = null;
          state.comparisonTracks = [];
          state.journey = null;
          state.journeySegments = [];
          state.pictures = [];
          state.pendingPicturePlacements = [];
          state.videos = [];
          state.iconChanges = [];
          state.textAnnotations = [];
          state.playback = createDefaultPlayback();
          state.cinematicPlayed = false;
          state.animationPhase = 'idle';
          state.settings = createDefaultSettings();
          state.cameraSettings = createDefaultCameraSettings();
          state.videoExportSettings = createDefaultVideoExportSettings();
          state.isExporting = false;
          state.exportProgress = 0;
          state.exportStage = '';
          state.error = null;
          state.selectedPictureId = null;
          state.cameraPosition = null;
          state.exploreMode = false;
          state.activePanel = 'tracks';
        }),
    }))
  );
}
