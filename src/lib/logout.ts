import { clearAllData } from '../auth/storage.js';
import {
  printStart,
  printSuccess,
  printFailure,
  msg,
} from '../utils/messages.js';
import { isJsonMode, jsonSuccess } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

const context = msg('logout');

export default async function logout(): Promise<void> {
  printStart(context);
  try {
    // Clear all authentication data
    await clearAllData();

    if (isJsonMode()) {
      jsonSuccess({ action: 'logout' });
    } else {
      printSuccess(context);
    }
  } catch (error) {
    if (error instanceof Error) {
      handleError(error);
    } else {
      handleError({ message: 'Failed to logout' });
    }
  }
}
