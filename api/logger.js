const LOG_PREFIX = '[TrailReplay API]';
const LOG_LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
};

function resolveLogLevel() {
  const configuredLevel = process.env.TRAILREPLAY_API_LOG_LEVEL;
  if (configuredLevel && configuredLevel in LOG_LEVEL_PRIORITY) {
    return configuredLevel;
  }

  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level) {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[resolveLogLevel()];
}

function buildPrefix(level, scope) {
  return scope ? `${LOG_PREFIX} [${level}] [${scope}]` : `${LOG_PREFIX} [${level}]`;
}

export function createServerLogger(scope) {
  const write = (level, message, meta = {}) => {
    if (!shouldLog(level)) return;

    const consoleMethod = level === 'debug'
      ? console.debug
      : level === 'info'
        ? console.info
        : level === 'warn'
          ? console.warn
          : console.error;

    consoleMethod(buildPrefix(level, scope), message, {
      timestamp: new Date().toISOString(),
      ...meta,
    });
  };

  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
  };
}
