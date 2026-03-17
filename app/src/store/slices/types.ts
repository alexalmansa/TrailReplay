import type { StateCreator } from 'zustand';
import type { AppState } from '@/store/storeTypes';

export type AppSliceCreator<T> = StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  T
>;
