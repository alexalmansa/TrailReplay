import {
  createDefaultCameraSettings,
  createDefaultSettings,
} from '@/store/defaults';
import type { AppState } from '@/store/storeTypes';
import type { AppSliceCreator } from './types';

type SettingsSlice = Pick<
  AppState,
  | 'settings'
  | 'cameraSettings'
  | 'cameraPosition'
  | 'setSettings'
  | 'setCameraSettings'
  | 'setCameraMode'
  | 'setMapStyle'
  | 'setUnitSystem'
  | 'setTrailStyle'
  | 'setCameraPosition'
>;

export const createSettingsSlice: AppSliceCreator<SettingsSlice> = (set) => ({
  settings: createDefaultSettings(),
  cameraSettings: createDefaultCameraSettings(),
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

  setCameraPosition: (position) =>
    set((state) => {
      state.cameraPosition = position;
    }),
});
