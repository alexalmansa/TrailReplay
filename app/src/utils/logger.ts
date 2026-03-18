export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogMeta {
  scope?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  sessionId: string;
  level: Exclude<LogLevel, 'silent'>;
  message: string;
  scope?: string;
  meta?: Omit<LogMeta, 'scope'>;
}

const LOG_PREFIX = '[TrailReplay]';
const LOG_STORAGE_KEY = 'trailreplay:log-level';
const MAX_LOG_HISTORY = 300;
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
};
const sessionId = (() => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
})();

declare global {
  interface Window {
    __TRAILREPLAY_LOG_LEVEL__?: LogLevel;
    __TRAILREPLAY_LOG_HISTORY__?: LogEntry[];
  }
}

function isLogLevel(value: string | null | undefined): value is LogLevel {
  return value === 'debug' || value === 'info' || value === 'warn' || value === 'error' || value === 'silent';
}

function getConfiguredLogLevel(): LogLevel {
  if (typeof window !== 'undefined' && isLogLevel(window.__TRAILREPLAY_LOG_LEVEL__)) {
    return window.__TRAILREPLAY_LOG_LEVEL__;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(LOG_STORAGE_KEY);
      if (isLogLevel(stored)) return stored;
    } catch {
      // Ignore storage access errors.
    }
  }

  const envLevel = import.meta.env.VITE_LOG_LEVEL;
  if (isLogLevel(envLevel)) {
    return envLevel;
  }

  return import.meta.env.DEV ? 'debug' : 'info';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getConfiguredLogLevel()];
}

function buildPrefix(level: LogLevel, scope?: string): string {
  return scope ? `${LOG_PREFIX} [${level}] [${scope}]` : `${LOG_PREFIX} [${level}]`;
}

function pushToLogHistory(entry: LogEntry) {
  if (typeof window === 'undefined') return;

  const currentHistory = window.__TRAILREPLAY_LOG_HISTORY__ ?? [];
  const nextHistory = [...currentHistory, entry].slice(-MAX_LOG_HISTORY);
  window.__TRAILREPLAY_LOG_HISTORY__ = nextHistory;
  window.dispatchEvent(
    new CustomEvent<LogEntry>('trailreplay:log', {
      detail: entry,
    })
  );
}

export function getLogLevel(): LogLevel {
  return getConfiguredLogLevel();
}

export function setLogLevel(level: LogLevel) {
  if (typeof window === 'undefined') return;

  window.__TRAILREPLAY_LOG_LEVEL__ = level;
  try {
    window.localStorage.setItem(LOG_STORAGE_KEY, level);
  } catch {
    // Ignore storage access errors.
  }
}

export function getLogHistory(): LogEntry[] {
  if (typeof window === 'undefined') return [];
  return window.__TRAILREPLAY_LOG_HISTORY__ ?? [];
}

/**
 * Small structured logger used by the app runtime and tests.
 * Debug/info logs stay development-only, while warnings/errors always surface.
 */
export function log(level: LogLevel, message: string, meta?: LogMeta) {
  if (level === 'silent') return;
  if (!shouldLog(level)) return;

  const prefix = buildPrefix(level, meta?.scope);
  const { scope, ...restMeta } = meta ?? {};
  const payload = Object.keys(restMeta).length > 0 ? restMeta : undefined;
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    sessionId,
    level,
    message,
    scope,
    meta: payload,
  };

  pushToLogHistory(entry);

  const consoleMethod = level === 'debug'
    ? console.debug
    : level === 'info'
      ? console.info
      : level === 'warn'
        ? console.warn
        : console.error;

  consoleMethod(prefix, message, {
    sessionId: entry.sessionId,
    timestamp: entry.timestamp,
    ...(payload ?? {}),
  });
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
