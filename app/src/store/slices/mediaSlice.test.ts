import { describe, expect, it } from 'vitest';
import { createAppStore } from '@/store/createAppStore';
import type { PictureAnnotation, VideoAnnotation } from '@/types';

function createPlaceholderPicture(overrides: Partial<PictureAnnotation> = {}): PictureAnnotation {
  return {
    id: 'picture-1',
    file: null,
    url: '',
    isPlaceholder: true,
    originalFileName: 'summit.jpg',
    progress: 0.5,
    position: 0.5,
    displayDuration: 5000,
    ...overrides,
  };
}

function createPlaceholderVideo(overrides: Partial<VideoAnnotation> = {}): VideoAnnotation {
  return {
    id: 'video-1',
    file: null,
    url: '',
    isPlaceholder: true,
    originalFileName: 'descent.mp4',
    progress: 0.3,
    ...overrides,
  };
}

describe('mediaSlice relink actions', () => {
  it('relinkPictureFile attaches a file to a placeholder picture and clears isPlaceholder', () => {
    const store = createAppStore();
    store.setState((state) => {
      state.pictures.push(createPlaceholderPicture());
    });

    const file = new File(['image'], 'summit.jpg', { type: 'image/jpeg' });
    store.getState().relinkPictureFile('picture-1', file);

    const picture = store.getState().pictures[0];
    expect(picture.file).toBe(file);
    expect(picture.isPlaceholder).toBe(false);
    expect(picture.url).toMatch(/^blob:|^data:/);
    expect(picture.originalFileName).toBe('summit.jpg');
  });

  it('relinkVideoFile attaches a file to a placeholder video and clears isPlaceholder', () => {
    const store = createAppStore();
    store.setState((state) => {
      state.videos.push(createPlaceholderVideo());
    });

    const file = new File(['video'], 'descent.mp4', { type: 'video/mp4' });
    store.getState().relinkVideoFile('video-1', file);

    const video = store.getState().videos[0];
    expect(video.file).toBe(file);
    expect(video.isPlaceholder).toBe(false);
    expect(video.url).toMatch(/^blob:|^data:/);
  });

  it('is a no-op when the picture/video id does not exist', () => {
    const store = createAppStore();
    store.setState((state) => {
      state.pictures.push(createPlaceholderPicture());
    });

    store.getState().relinkPictureFile('missing-id', new File(['image'], 'x.jpg'));

    expect(store.getState().pictures[0].isPlaceholder).toBe(true);
  });
});
