import { describe, expect, it, vi } from 'vitest';
import { createLogger, log } from './logger';

describe('logger', () => {
  it('always emits warn and error logs with TrailReplay prefixes', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    log('warn', 'Heads up', { scope: 'tests', value: 1 });
    log('error', 'Failure', { scope: 'tests' });

    expect(warnSpy).toHaveBeenCalledWith('[TrailReplay] [warn] [tests]', 'Heads up', { scope: 'tests', value: 1 });
    expect(errorSpy).toHaveBeenCalledWith('[TrailReplay] [error] [tests]', 'Failure', { scope: 'tests' });

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('creates scoped helpers that delegate to the shared logger', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger('export');

    logger.error('Capture failed', { frame: 12 });

    expect(errorSpy).toHaveBeenCalledWith('[TrailReplay] [error] [export]', 'Capture failed', {
      scope: 'export',
      frame: 12,
    });
    errorSpy.mockRestore();
  });
});
