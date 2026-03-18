import { describe, expect, it, vi } from 'vitest';
import { getErrorMessage, handleAsyncError, reportError } from './errorHandler';

describe('errorHandler', () => {
  it('normalizes error values into safe user messages', () => {
    expect(getErrorMessage(new Error('Boom'))).toBe('Boom');
    expect(getErrorMessage('Failed upload')).toBe('Failed upload');
    expect(getErrorMessage('', 'Fallback')).toBe('Fallback');
    expect(getErrorMessage({ detail: 'unknown' }, 'Fallback')).toBe('Fallback');
  });

  it('reports errors and returns the resolved message', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const message = reportError(new Error('Parser exploded'), {
      scope: 'parser',
      metadata: { file: 'route.gpx' },
    });

    expect(message).toBe('Parser exploded');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('feeds async errors back into optional callbacks', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();

    const message = handleAsyncError('Upload failed', {
      scope: 'photo-upload',
      fallbackMessage: 'Unexpected failure',
      onError,
    });

    expect(message).toBe('Upload failed');
    expect(onError).toHaveBeenCalledWith('Upload failed');
    errorSpy.mockRestore();
  });
});
