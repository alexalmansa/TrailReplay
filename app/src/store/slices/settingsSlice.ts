import {
  createDefaultCameraSettings,
  createDefaultSettings,
  createDefaultVideoExportSettings,
} from '@/store/defaults';
import type { AppState } from '@/store/storeTypes';
import type { AppSliceCreator } from './types';

type SettingsSlice = Pick<
  AppState,
  | 'settings'
  | 'cameraSettings'
  | 'videoExportSettings'
  | 'isExporting'
  | 'exportProgress'
  | 'exportStage'
  | 'cameraPosition'
  | 'setSettings'
  | 'setCameraSettings'
  | 'setCameraMode'
  | 'setMapStyle'
  | 'setUnitSystem'
  | 'setTrailStyle'
  | 'setVideoExportSettings'
  | 'setIsExporting'
  | 'setExportProgress'
  | 'setExportStage'
  | 'setCameraPosition'
>;

export const createSettingsSlice: AppSliceCreator<SettingsSlice> = (set) => ({
  settings: createDefaultSettings(),
  cameraSettings: createDefaultCameraSettings(),
  videoExportSettings: createDefaultVideoExportSettings(),
  isExporting: false,
  exportProgress: 0,
  exportStage: '',
  cameraPosition: null,

  setSettings: (settings) =>
    set((state) => {
      Object.assign(state.settings, settings);
    }),

  setCameraSettings: (settings) =>
    set((state) => {
      Object.assign(state.cameraSettings, settings);
    }),

  setCameraMode: (mode) =>
    set((state) => {
      state.cameraSettings.mode = mode;
      state.settings.cameraMode = mode;
    }),

  setMapStyle: (style) =>
    set((state) => {
      state.settings.mapStyle = style;
    }),

  setUnitSystem: (unit) =>
    set((state) => {
      state.settings.unitSystem = unit;
    }),

  setTrailStyle: (settings) =>
    set((state) => {
      Object.assign(state.settings.trailStyle, settings);
    }),

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

  setCameraPosition: (position) =>
    set((state) => {
      state.cameraPosition = position;
    }),
});
