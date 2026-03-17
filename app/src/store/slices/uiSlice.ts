import { defaultSidebarOpen } from '@/store/defaults';
import type { AppState } from '@/store/storeTypes';
import type { AppSliceCreator } from './types';

type UiSlice = Pick<
  AppState,
  | 'isSidebarOpen'
  | 'exploreMode'
  | 'activePanel'
  | 'isLoading'
  | 'error'
  | 'setSidebarOpen'
  | 'setExploreMode'
  | 'setActivePanel'
  | 'setLoading'
  | 'setError'
>;

export const createUiSlice: AppSliceCreator<UiSlice> = (set) => ({
  isSidebarOpen: defaultSidebarOpen,
  exploreMode: false,
  activePanel: 'tracks',
  isLoading: false,
  error: null,

  setSidebarOpen: (isOpen) =>
    set((state) => {
      state.isSidebarOpen = isOpen;
    }),

  setExploreMode: (enabled) =>
    set((state) => {
      state.exploreMode = enabled;
    }),

  setActivePanel: (panel) =>
    set((state) => {
      state.activePanel = panel;
    }),

  setLoading: (isLoading) =>
    set((state) => {
      state.isLoading = isLoading;
    }),

  setError: (error) =>
    set((state) => {
      state.error = error;
    }),
});
