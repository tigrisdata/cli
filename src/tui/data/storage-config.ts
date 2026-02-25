import {
  getStorageConfig,
  isAuthenticated,
  type TigrisStorageConfig,
} from '../../auth/s3-client.js';

/**
 * Get storage config for TUI use.
 * Unlike the CLI version, this checks auth first to avoid the
 * auto-login path which calls console.log and corrupts Ink rendering.
 */
export async function fetchStorageConfig(): Promise<TigrisStorageConfig> {
  const authed = await isAuthenticated();
  if (!authed) {
    throw new Error(
      'Not authenticated. Please exit and run "tigris login" or "tigris configure" first.'
    );
  }
  return getStorageConfig();
}
