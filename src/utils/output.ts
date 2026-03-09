/**
 * JSON output envelope and helpers for --json mode.
 * When --json is active, structured data goes to stdout and human messages to stderr.
 */

let jsonMode = false;

export function isJsonMode(): boolean {
  return jsonMode;
}

export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
}

export interface JsonSuccessEnvelope<T = unknown> {
  success: true;
  data: T;
}

export interface JsonErrorEnvelope {
  success: false;
  error: {
    error_code: string;
    message: string;
    suggested_action?: string;
  };
}

/**
 * Write a JSON success envelope to stdout
 */
export function jsonSuccess(data: unknown): void {
  const envelope: JsonSuccessEnvelope = {
    success: true,
    data,
  };
  process.stdout.write(JSON.stringify(envelope, null, 2) + '\n');
}

/**
 * Write a JSON error envelope to stderr
 */
export function jsonError(
  error_code: string,
  message: string,
  suggested_action?: string
): void {
  const envelope: JsonErrorEnvelope = {
    success: false,
    error: {
      error_code,
      message,
      ...(suggested_action ? { suggested_action } : {}),
    },
  };
  process.stderr.write(JSON.stringify(envelope, null, 2) + '\n');
}

/**
 * Convenience helper: emits JSON in --json mode, console.log otherwise
 */
export function output(humanMessage: string, data: unknown): void {
  if (jsonMode) {
    jsonSuccess(data);
  } else {
    console.log(humanMessage);
  }
}
