import { createLogger } from '@/utils/logger';

const logger = createLogger('error-handler');

export interface ErrorContext {
  scope: string;
  fallbackMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Normalizes unknown thrown values into a consistent application-facing message.
 */
export function getErrorMessage(error: unknown, fallbackMessage = 'Unexpected error'): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallbackMessage;
}

/**
 * Reports an exception through the shared logger and returns a user-safe message.
 */
export function reportError(error: unknown, context: ErrorContext): string {
  const message = getErrorMessage(error, context.fallbackMessage);

  logger.error(message, {
    sourceError: error instanceof Error ? error.stack ?? error.message : error,
    ...context.metadata,
    scope: context.scope,
  });

  return message;
}

/**
 * Helper for async flows that need a consistent fallback message, logging,
 * and an optional callback to surface the error to state/UI.
 */
export function handleAsyncError(
  error: unknown,
  context: ErrorContext & { onError?: (message: string) => void }
): string {
  const message = reportError(error, context);
  context.onError?.(message);
  return message;
}
