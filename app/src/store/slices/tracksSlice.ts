import { createId } from '@/utils/id';
import { getDefaultFollowBehindPreset, trackColors } from '@/store/defaults';
import type { AppState } from '@/store/storeTypes';
import type { AppSliceCreator } from './types';

type TracksSlice = Pick<
  AppState,
  | 'tracks'
  | 'activeTrackId'
  | 'comparisonTracks'
  | 'addTrack'
  | 'removeTrack'
  | 'setActiveTrack'
  | 'updateTrackColor'
  | 'updateTrackName'
  | 'toggleTrackVisibility'
  | 'reorderTracks'
  | 'addComparisonTrack'
  | 'removeComparisonTrack'
  | 'toggleComparisonTrack'
  | 'updateComparisonOffset'
  | 'updateComparisonTrackName'
  | 'updateComparisonColor'
>;

export const createTracksSlice: AppSliceCreator<TracksSlice> = (set) => ({
  tracks: [],
  activeTrackId: null,
  comparisonTracks: [],

  addTrack: (track) =>
    set((state) => {
      const colorIndex = state.tracks.length % trackColors.length;
      const trackColor = track.color || trackColors[colorIndex];
      const trackWithColor = { ...track, color: trackColor, visible: true };
      state.tracks.push(trackWithColor);
      state.exploreMode = false;

      if (!state.activeTrackId) {
        state.activeTrackId = track.id;
        state.settings.trailStyle.trailColor = trackColor;
        state.settings.trailStyle.markerColor = trackColor;
        state.cameraSettings.followBehindPreset = getDefaultFollowBehindPreset(track.totalDistance);
      }

      if (!state.journey) {
        state.journey = {
          id: createId('journey'),
          name: 'My Journey',
          segments: [],
          totalDuration: 0,
          totalDistance: 0,
        };
      }

      state.journeySegments.push({
        id: createId(`segment-${track.id}`),
        type: 'track',
        trackId: track.id,
        duration: 60000,
      });
      state.activePanel = 'journey';
    }),

  removeTrack: (trackId) =>
    set((state) => {
      state.tracks = state.tracks.filter((track) => track.id !== trackId);
      state.journeySegments = state.journeySegments.filter((segment) =>
        segment.type !== 'track' || segment.trackId !== trackId
      );

      if (state.activeTrackId === trackId) {
        state.activeTrackId = state.tracks[0]?.id || null;
      }
    }),

  setActiveTrack: (trackId) =>
    set((state) => {
      state.activeTrackId = trackId;
      const activeTrack = state.tracks.find((track) => track.id === trackId);
      if (activeTrack?.color) {
        const previousTrailColor = state.settings.trailStyle.trailColor;
        state.settings.trailStyle.trailColor = activeTrack.color;
        if (state.settings.trailStyle.markerColor === previousTrailColor) {
          state.settings.trailStyle.markerColor = activeTrack.color;
        }
      }
    }),

  updateTrackColor: (trackId, color) =>
    set((state) => {
      const track = state.tracks.find((entry) => entry.id === trackId);
      if (!track) return;

      track.color = color;
      if (state.activeTrackId === trackId) {
        const previousTrailColor = state.settings.trailStyle.trailColor;
        state.settings.trailStyle.trailColor = color;
        if (state.settings.trailStyle.markerColor === previousTrailColor) {
          state.settings.trailStyle.markerColor = color;
        }
      }
    }),

  updateTrackName: (trackId, name) =>
    set((state) => {
      const track = state.tracks.find((entry) => entry.id === trackId);
      if (track) track.name = name;
    }),

  toggleTrackVisibility: (trackId) =>
    set((state) => {
      const track = state.tracks.find((entry) => entry.id === trackId);
      if (track) track.visible = !track.visible;
    }),

  reorderTracks: (fromIndex, toIndex) =>
    set((state) => {
      const [movedTrack] = state.tracks.splice(fromIndex, 1);
      state.tracks.splice(toIndex, 0, movedTrack);
    }),

  addComparisonTrack: (track) =>
    set((state) => {
      state.comparisonTracks.push(track);
    }),

  removeComparisonTrack: (trackId) =>
    set((state) => {
      state.comparisonTracks = state.comparisonTracks.filter((track) => track.id !== trackId);
    }),

  toggleComparisonTrack: (trackId) =>
    set((state) => {
      const track = state.comparisonTracks.find((entry) => entry.id === trackId);
      if (track) track.visible = !track.visible;
    }),

  updateComparisonOffset: (trackId, offset) =>
    set((state) => {
      const track = state.comparisonTracks.find((entry) => entry.id === trackId);
      if (track) track.offset = offset;
    }),

  updateComparisonTrackName: (trackId, name) =>
    set((state) => {
      const track = state.comparisonTracks.find((entry) => entry.id === trackId);
      if (track) track.name = name;
    }),

  updateComparisonColor: (trackId, color) =>
    set((state) => {
      const track = state.comparisonTracks.find((entry) => entry.id === trackId);
      if (track) track.color = color;
    }),
});
