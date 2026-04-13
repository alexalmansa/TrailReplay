import type { TextAnnotation } from '@/types';

export const PLAYBACK_ANNOTATION_PROGRESS_EPSILON = 0.005;

export function getTriggeredPlaybackAnnotations(params: {
  annotations: TextAnnotation[];
  previousProgress: number;
  currentProgress: number;
  shownAnnotationIds: ReadonlySet<string>;
  queuedAnnotationIds: readonly string[];
  progressEpsilon?: number;
}) {
  const {
    annotations,
    previousProgress,
    currentProgress,
    shownAnnotationIds,
    queuedAnnotationIds,
    progressEpsilon = PLAYBACK_ANNOTATION_PROGRESS_EPSILON,
  } = params;

  const lowerBound = Math.max(0, previousProgress - progressEpsilon);
  const upperBound = Math.min(1, currentProgress + progressEpsilon);
  const queuedIds = new Set(queuedAnnotationIds);

  return annotations
    .filter((annotation) => (
      !shownAnnotationIds.has(annotation.id)
      && !queuedIds.has(annotation.id)
      && annotation.progress >= lowerBound
      && annotation.progress <= upperBound
    ))
    .sort((a, b) => a.progress - b.progress);
}
