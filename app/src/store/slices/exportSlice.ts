import { createDefaultVideoExportSettings } from '@/store/defaults';
import type { AppState } from '@/store/storeTypes';
import type { AppSliceCreator } from './types';

type ExportSlice = Pick<
  AppState,
  | 'videoExportSettings'
  | 'isExporting'
  | 'exportProgress'
  | 'exportStage'
  | 'setVideoExportSettings'
  | 'setIsExporting'
  | 'setExportProgress'
  | 'setExportStage'
>;

export const createExportSlice: AppSliceCreator<ExportSlice> = (set) => ({
  videoExportSettings: createDefaultVideoExportSettings(),
  isExporting: false,
  exportProgress: 0,
  exportStage: '',

  setVideoExportSettings: (settings) =>
    set((state) => {
      Object.assign(state.videoExportSettings, settings);
    }),

  setIsExporting: (isExporting) =>
    set((state) => {
      state.isExporting = isExporting;
      if (isExporting) {
        state.activePanel = 'export';
      }
      if (!isExporting) {
        state.exportProgress = 0;
        state.exportStage = '';
      }
    }),

  setExportProgress: (progress) =>
    set((state) => {
      state.exportProgress = progress;
    }),

  setExportStage: (stage) =>
    set((state) => {
      state.exportStage = stage;
    }),
});
