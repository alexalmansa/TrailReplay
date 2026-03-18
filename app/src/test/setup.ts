import '@testing-library/jest-dom/vitest';
import 'vitest-axe/extend-expect';
import { afterEach, beforeAll, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => {
      return {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        getImageData: vi.fn(),
        putImageData: vi.fn(),
        setTransform: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    }),
  });

  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    value: vi.fn((callback: BlobCallback) => {
      callback(new Blob());
    }),
  });
});

afterEach(() => {
  cleanup();
});
