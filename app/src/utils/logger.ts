export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMeta {
  scope?: string;
  [key: string]: unknown;
}

const LOG_PREFIX = '[TrailReplay]';

function shouldLog(level: LogLevel): boolean {
  if (level === 'error' || level === 'warn') return true;
  return import.meta.env.DEV;
}

function buildPrefix(level: LogLevel, scope?: string): string {
  return scope ? `${LOG_PREFIX} [${level}] [${scope}]` : `${LOG_PREFIX} [${level}]`;
}

/**
 * Small structured logger used by the app runtime and tests.
 * Debug/info logs stay development-only, while warnings/errors always surface.
 */
export function log(level: LogLevel, message: string, meta?: LogMeta) {
  if (!shouldLog(level)) return;

  const prefix = buildPrefix(level, meta?.scope);
  const payload = meta && Object.keys(meta).length > 0 ? meta : undefined;

  if (level === 'debug' || level === 'info') {
    console[level](prefix, message, payload ?? '');
    return;
  }

  console[level](prefix, message, payload ?? '');
}

/**
 * Creates a scoped logger so feature modules can emit consistent structured
 * messages without repeating their identifier on every call.
 */
export function createLogger(scope: string) {
  return {
    debug: (message: string, meta?: Omit<LogMeta, 'scope'>) => log('debug', message, { scope, ...meta }),
    info: (message: string, meta?: Omit<LogMeta, 'scope'>) => log('info', message, { scope, ...meta }),
    warn: (message: string, meta?: Omit<LogMeta, 'scope'>) => log('warn', message, { scope, ...meta }),
    error: (message: string, meta?: Omit<LogMeta, 'scope'>) => log('error', message, { scope, ...meta }),
  };
}
