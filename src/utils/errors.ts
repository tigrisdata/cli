/**
 * Error classification and granular exit codes.
 *
 * Exit codes:
 *   0 - Success
 *   1 - General/unknown error
 *   2 - Authentication failure (401, 403, expired credentials)
 *   3 - Resource not found (404, NoSuchBucket, NoSuchKey)
 *   4 - Rate limit exceeded (429, throttling)
 *   5 - Network error (DNS, connection refused, timeout)
 */

import { isJsonMode, jsonError } from './output.js';

export const EXIT = {
  SUCCESS: 0,
  GENERAL: 1,
  AUTH: 2,
  NOT_FOUND: 3,
  RATE_LIMIT: 4,
  NETWORK: 5,
} as const;

export interface ClassifiedError {
  error_code: string;
  exitCode: number;
  suggested_action?: string;
}

/**
 * Classify an error by inspecting its message and metadata
 */
export function classifyError(error: { message: string }): ClassifiedError {
  const msg = (error.message ?? '').toLowerCase();
  const errorRecord = error as Record<string, unknown>;
  const metadata = errorRecord['$metadata'] as
    | { httpStatusCode?: number }
    | undefined;
  const httpStatus =
    metadata?.httpStatusCode ??
    (errorRecord['code'] as number | undefined) ??
    (errorRecord['statusCode'] as number | undefined);

  // Auth failures
  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    msg.includes('access denied') ||
    msg.includes('forbidden') ||
    msg.includes('not authenticated') ||
    msg.includes('invalid credentials') ||
    msg.includes('expired token') ||
    msg.includes('invalidaccesskeyid') ||
    msg.includes('signaturemismatch') ||
    msg.includes('signaturedoesnotmatch')
  ) {
    return {
      error_code: 'auth_failure',
      exitCode: EXIT.AUTH,
      suggested_action: 'Run "tigris login" or check your credentials',
    };
  }

  // Not found
  if (
    httpStatus === 404 ||
    msg.includes('not found') ||
    msg.includes('nosuchbucket') ||
    msg.includes('nosuchkey') ||
    msg.includes('does not exist') ||
    msg.includes('no such')
  ) {
    return {
      error_code: 'not_found',
      exitCode: EXIT.NOT_FOUND,
      suggested_action: 'Verify the resource name and that it exists',
    };
  }

  // Rate limit
  if (
    httpStatus === 429 ||
    msg.includes('rate limit') ||
    msg.includes('throttl') ||
    msg.includes('too many requests') ||
    msg.includes('slow down') ||
    msg.includes('slowdown')
  ) {
    return {
      error_code: 'rate_limit',
      exitCode: EXIT.RATE_LIMIT,
      suggested_action: 'Wait a moment and retry the request',
    };
  }

  // Network errors
  if (
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('epipe') ||
    msg.includes('network') ||
    msg.includes('dns') ||
    msg.includes('socket hang up') ||
    msg.includes('fetch failed')
  ) {
    return {
      error_code: 'network_error',
      exitCode: EXIT.NETWORK,
      suggested_action: 'Check your network connection and try again',
    };
  }

  return {
    error_code: 'unknown_error',
    exitCode: EXIT.GENERAL,
  };
}

/**
 * Handle an error: classify it, emit JSON if in --json mode,
 * otherwise print to stderr, then exit with the appropriate code.
 *
 * Replaces the common pattern: console.error(e.message); process.exit(1);
 */
export function handleError(
  error: { message: string },
  context?: string
): never {
  const classified = classifyError(error);

  if (isJsonMode()) {
    jsonError(classified.error_code, error.message, classified.suggested_action);
  } else {
    if (context) {
      console.error(`${context}: ${error.message}`);
    } else {
      console.error(error.message);
    }
  }

  process.exit(classified.exitCode);
}
