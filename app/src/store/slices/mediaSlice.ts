import type { AppState } from '@/store/storeTypes';
import type { AppSliceCreator } from './types';

type MediaSlice = Pick<
  AppState,
  | 'pictures'
  | 'pendingPicturePlacements'
  | 'videos'
  | 'iconChanges'
  | 'textAnnotations'
  | 'selectedPictureId'
  | 'addPicture'
  | 'queuePendingPicturePlacement'
  | 'removePendingPicturePlacement'
  | 'clearPendingPicturePlacements'
  | 'removePicture'
  | 'updatePicturePosition'
  | 'updatePictureMetadata'
  | 'updatePictureDuration'
  | 'addVideo'
  | 'removeVideo'
  | 'addIconChange'
  | 'removeIconChange'
  | 'updateIconChangePosition'
  | 'addTextAnnotation'
  | 'updateTextAnnotation'
  | 'removeTextAnnotation'
  | 'setSelectedPictureId'
>;

export const createMediaSlice: AppSliceCreator<MediaSlice> = (set) => ({
  pictures: [],
  pendingPicturePlacements: [],
  videos: [],
  iconChanges: [],
  textAnnotations: [],
  selectedPictureId: null,

  addPicture: (picture) =>
    set((state) => {
      state.pictures.push(picture);
    }),

  queuePendingPicturePlacement: (picture) =>
    set((state) => {
      state.pendingPicturePlacements.push(picture);
    }),

  removePendingPicturePlacement: (pictureId) =>
    set((state) => {
      state.pendingPicturePlacements = state.pendingPicturePlacements.filter((picture) => picture.id !== pictureId);
    }),

  clearPendingPicturePlacements: () =>
    set((state) => {
      state.pendingPicturePlacements = [];
    }),

  removePicture: (pictureId) =>
    set((state) => {
      state.pictures = state.pictures.filter((picture) => picture.id !== pictureId);
      if (state.selectedPictureId === pictureId) {
        state.selectedPictureId = null;
      }
    }),

  updatePicturePosition: (pictureId, progress) =>
    set((state) => {
      const picture = state.pictures.find((entry) => entry.id === pictureId);
      if (!picture) return;

      picture.progress = progress;
      picture.position = progress;
    }),

  updatePictureMetadata: (pictureId, title, description) =>
    set((state) => {
      const picture = state.pictures.find((entry) => entry.id === pictureId);
      if (!picture) return;

      picture.title = title;
      picture.description = description;
    }),

  updatePictureDuration: (pictureId, duration) =>
    set((state) => {
      const picture = state.pictures.find((entry) => entry.id === pictureId);
      if (picture) picture.displayDuration = duration;
    }),

  addVideo: (video) =>
    set((state) => {
      state.videos.push(video);
    }),

  removeVideo: (videoId) =>
    set((state) => {
      state.videos = state.videos.filter((video) => video.id !== videoId);
    }),

  addIconChange: (iconChange) =>
    set((state) => {
      state.iconChanges.push(iconChange);
    }),

  removeIconChange: (iconChangeId) =>
    set((state) => {
      state.iconChanges = state.iconChanges.filter((entry) => entry.id !== iconChangeId);
    }),

  updateIconChangePosition: (iconChangeId, progress) =>
    set((state) => {
      const iconChange = state.iconChanges.find((entry) => entry.id === iconChangeId);
      if (iconChange) iconChange.progress = progress;
    }),

  addTextAnnotation: (annotation) =>
    set((state) => {
      state.textAnnotations.push(annotation);
    }),

  updateTextAnnotation: (annotationId, updates) =>
    set((state) => {
      const annotation = state.textAnnotations.find((entry) => entry.id === annotationId);
      if (!annotation) return;

      Object.assign(annotation, updates);
    }),

  removeTextAnnotation: (annotationId) =>
    set((state) => {
      state.textAnnotations = state.textAnnotations.filter((annotation) => annotation.id !== annotationId);
    }),

  setSelectedPictureId: (pictureId) =>
    set((state) => {
      state.selectedPictureId = pictureId;
    }),
});
