import type { PictureAnnotation } from '@/types';

export const PLAYBACK_PICTURE_PROGRESS_EPSILON = 0.005;
export const PLAYBACK_PICTURE_REWIND_TOLERANCE = 0.001;

export function hasPlaybackProgressRewound(
  previousProgress: number,
  currentProgress: number,
  tolerance = PLAYBACK_PICTURE_REWIND_TOLERANCE
) {
  return currentProgress + tolerance < previousProgress;
}

export function getTriggeredPlaybackPictures(params: {
  pictures: PictureAnnotation[];
  previousProgress: number;
  currentProgress: number;
  shownPictureIds: ReadonlySet<string>;
  queuedPictureIds: readonly string[];
  progressEpsilon?: number;
}) {
  const {
    pictures,
    previousProgress,
    currentProgress,
    shownPictureIds,
    queuedPictureIds,
    progressEpsilon = PLAYBACK_PICTURE_PROGRESS_EPSILON,
  } = params;

  const lowerBound = Math.max(0, previousProgress - progressEpsilon);
  const upperBound = Math.min(1, currentProgress + progressEpsilon);
  const queuedIds = new Set(queuedPictureIds);

  return pictures
    .filter((picture) => (
      !shownPictureIds.has(picture.id)
      && !queuedIds.has(picture.id)
      && picture.progress >= lowerBound
      && picture.progress <= upperBound
    ))
    .sort((a, b) => a.progress - b.progress);
}
