import type { TextAnnotation } from '@/types';

export function getActivePlaybackAnnotationId(params: {
  annotations: TextAnnotation[];
  currentTime: number;
  totalDuration: number;
}) {
  const { annotations, currentTime, totalDuration } = params;

  if (totalDuration <= 0 || annotations.length === 0) {
    return null;
  }

  const sortedAnnotations = [...annotations].sort((a, b) => a.progress - b.progress);

  for (const annotation of sortedAnnotations) {
    const arrivalTime = annotation.progress * totalDuration;
    const leadTime = Math.max(0, annotation.displayDuration);
    const windowStart = Math.max(0, arrivalTime - leadTime);

    if (currentTime >= windowStart && currentTime <= arrivalTime) {
      return annotation.id;
    }
  }

  return null;
}
