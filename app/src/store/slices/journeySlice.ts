import { createId } from '@/utils/id';
import type { AppState } from '@/store/storeTypes';
import type { AppSliceCreator } from './types';

type JourneySlice = Pick<
  AppState,
  | 'journey'
  | 'journeySegments'
  | 'createJourney'
  | 'addJourneySegment'
  | 'removeJourneySegment'
  | 'reorderJourneySegments'
  | 'updateJourneySegmentDuration'
  | 'addTransportSegment'
  | 'clearJourney'
>;

export const createJourneySlice: AppSliceCreator<JourneySlice> = (set) => ({
  journey: null,
  journeySegments: [],

  createJourney: (name) =>
    set((state) => {
      state.journey = {
        id: createId('journey'),
        name,
        segments: [],
        totalDuration: 0,
        totalDistance: 0,
      };
    }),

  addJourneySegment: (segment) =>
    set((state) => {
      state.journeySegments.push(segment);
    }),

  removeJourneySegment: (segmentId) =>
    set((state) => {
      state.journeySegments = state.journeySegments.filter((segment) => segment.id !== segmentId);
    }),

  reorderJourneySegments: (segments) =>
    set((state) => {
      state.journeySegments = segments;
    }),

  updateJourneySegmentDuration: (segmentId, duration) =>
    set((state) => {
      const segment = state.journeySegments.find((entry) => entry.id === segmentId);
      if (segment) segment.duration = duration;
    }),

  addTransportSegment: (from, to, mode) =>
    set((state) => {
      state.journeySegments.push({
        id: createId('transport'),
        type: 'transport',
        mode,
        from,
        to,
        duration: 0,
        distance: 0,
      });
    }),

  clearJourney: () =>
    set((state) => {
      state.journey = null;
      state.journeySegments = [];
    }),
});
