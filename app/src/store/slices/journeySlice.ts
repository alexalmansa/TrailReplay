import { createId } from '@/utils/id';
import type { AppState } from '@/store/storeTypes';
import type { AppSliceCreator } from './types';

type JourneySlice = Pick<
  AppState,
  | 'journey'
  | 'journeySegments'
  | 'cinematicCameraKeyframes'
  | 'createJourney'
  | 'updateJourneyName'
  | 'addJourneySegment'
  | 'removeJourneySegment'
  | 'reorderJourneySegments'
  | 'updateJourneySegmentDuration'
  | 'addTransportSegment'
  | 'clearJourney'
  | 'addCinematicCameraKeyframe'
  | 'updateCinematicCameraKeyframe'
  | 'removeCinematicCameraKeyframe'
>;

export const createJourneySlice: AppSliceCreator<JourneySlice> = (set) => ({
  journey: null,
  journeySegments: [],
  // Cinematic keyframes are journey data, not settings: they reference a
  // segment anchor and are meaningless without the route they were captured
  // on. See CINEMATIC_CAMERA_PLAN.md section 3.4.
  cinematicCameraKeyframes: [],

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

  updateJourneyName: (name) =>
    set((state) => {
      if (state.journey) state.journey.name = name;
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

  addCinematicCameraKeyframe: (keyframe) =>
    set((state) => {
      state.cinematicCameraKeyframes.push(keyframe);
    }),

  updateCinematicCameraKeyframe: (keyframeId, updates) =>
    set((state) => {
      const keyframe = state.cinematicCameraKeyframes.find((entry) => entry.id === keyframeId);
      if (keyframe) Object.assign(keyframe, updates);
    }),

  removeCinematicCameraKeyframe: (keyframeId) =>
    set((state) => {
      state.cinematicCameraKeyframes = state.cinematicCameraKeyframes.filter((entry) => entry.id !== keyframeId);
    }),
});
