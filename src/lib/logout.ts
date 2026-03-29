import { clearAllData } from '@auth/storage.js';
import { exitWithError } from '@utils/exit.js';
import {
  msg,
  printFailure,
  printStart,
  printSuccess,
} from '@utils/messages.js';

const context = msg('logout');

export default async function logout(): Promise<void> {
  printStart(context);
  try {
    // Clear all authentication data
    await clearAllData();

    printSuccess(context);
  } catch (error) {
    if (error instanceof Error) {
      printFailure(context, error.message);
    } else {
      printFailure(context);
    }
    exitWithError(error, context);
  }
}
