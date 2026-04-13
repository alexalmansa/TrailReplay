import { describe, expect, it } from 'vitest';
import type { TextAnnotation } from '@/types';
import { getTriggeredPlaybackAnnotations } from './playbackAnnotations';

function createAnnotation(id: string, progress: number): TextAnnotation {
  return {
    id,
    progress,
    lat: 41.39,
    lon: 2.17,
    title: `Annotation ${id}`,
    color: '#f3b133',
    displayDuration: 4000,
  };
}

describe('getTriggeredPlaybackAnnotations', () => {
  it('returns annotations crossed between previous and current progress', () => {
    const annotations = [
      createAnnotation('a', 0.2),
      createAnnotation('b', 0.45),
      createAnnotation('c', 0.7),
    ];

    const result = getTriggeredPlaybackAnnotations({
      annotations,
      previousProgress: 0.3,
      currentProgress: 0.5,
      shownAnnotationIds: new Set(),
      queuedAnnotationIds: [],
    });

    expect(result.map((annotation) => annotation.id)).toEqual(['b']);
  });

  it('skips shown and queued annotations', () => {
    const annotations = [
      createAnnotation('a', 0.2),
      createAnnotation('b', 0.21),
      createAnnotation('c', 0.22),
    ];

    const result = getTriggeredPlaybackAnnotations({
      annotations,
      previousProgress: 0.19,
      currentProgress: 0.23,
      shownAnnotationIds: new Set(['a']),
      queuedAnnotationIds: ['b'],
    });

    expect(result.map((annotation) => annotation.id)).toEqual(['c']);
  });

  it('returns annotations in progress order', () => {
    const annotations = [
      createAnnotation('c', 0.32),
      createAnnotation('a', 0.3),
      createAnnotation('b', 0.31),
    ];

    const result = getTriggeredPlaybackAnnotations({
      annotations,
      previousProgress: 0.29,
      currentProgress: 0.33,
      shownAnnotationIds: new Set(),
      queuedAnnotationIds: [],
    });

    expect(result.map((annotation) => annotation.id)).toEqual(['a', 'b', 'c']);
  });
});
