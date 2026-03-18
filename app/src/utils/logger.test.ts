import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger, getLogHistory, log, setLogLevel } from './logger';

describe('logger', () => {
  afterEach(() => {
    setLogLevel('debug');
    window.__TRAILREPLAY_LOG_HISTORY__ = [];
  });

  it('always emits warn and error logs with TrailReplay prefixes', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    setLogLevel('warn');
    log('warn', 'Heads up', { scope: 'tests', value: 1 });
    log('error', 'Failure', { scope: 'tests' });

    expect(warnSpy).toHaveBeenCalledWith(
      '[TrailReplay] [warn] [tests]',
      'Heads up',
      expect.objectContaining({
        sessionId: expect.any(String),
        timestamp: expect.any(String),
        value: 1,
      })
    );
    expect(errorSpy).toHaveBeenCalledWith(
      '[TrailReplay] [error] [tests]',
      'Failure',
      expect.objectContaining({
        sessionId: expect.any(String),
        timestamp: expect.any(String),
      })
    );

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('creates scoped helpers that delegate to the shared logger', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger('export');

    logger.error('Capture failed', { frame: 12 });

    expect(errorSpy).toHaveBeenCalledWith(
      '[TrailReplay] [error] [export]',
      'Capture failed',
      expect.objectContaining({
        sessionId: expect.any(String),
        timestamp: expect.any(String),
        frame: 12,
      })
    );
    errorSpy.mockRestore();
  });

  it('stores a bounded in-memory history for later debugging', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    setLogLevel('info');
    log('info', 'Import started', { scope: 'routes', fileCount: 2 });

    expect(getLogHistory()).toEqual([
      expect.objectContaining({
        level: 'info',
        message: 'Import started',
        scope: 'routes',
        meta: { fileCount: 2 },
      }),
    ]);

    infoSpy.mockRestore();
  });
});
