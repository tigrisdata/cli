import { clearAllData } from '@auth/storage.js';
import { failWithError } from '@utils/exit.js';
import { msg, printStart, printSuccess } from '@utils/messages.js';

const context = msg('logout');

export default async function logout(): Promise<void> {
  printStart(context);
  try {
    // Clear all authentication data
    await clearAllData();

    printSuccess(context);
  } catch (error) {
    failWithError(context, error);
  }
}
