import enquirer from 'enquirer';
const { prompt } = enquirer;
import { storeCredentials, storeLoginMethod } from '../../auth/storage.js';
import { DEFAULT_STORAGE_ENDPOINT } from '../../constants.js';
import {
  printStart,
  printSuccess,
  printFailure,
  msg,
} from '../../utils/messages.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';
import { handleError } from '../../utils/errors.js';

const context = msg('configure');

export default async function configure(options: Record<string, unknown>) {
  printStart(context);

  let accessKey =
    options['access-key'] ||
    options['accessKey'] ||
    options.key ||
    options.Key ||
    options.accesskey;
  let accessSecret =
    options['access-secret'] ||
    options['accessSecret'] ||
    options.secret ||
    options.Secret ||
    options.accesssecret;
  let endpoint =
    options['endpoint'] || options.e || options.E || options.Endpoint;

  // If credentials are not provided via CLI args, prompt for them
  if (!accessKey || !accessSecret || !endpoint) {
    const questions = [];

    if (!accessKey) {
      questions.push({
        type: 'input',
        name: 'accessKey',
        message: 'Tigris Access Key ID:',
        required: true,
      });
    }

    if (!accessSecret) {
      questions.push({
        type: 'password',
        name: 'accessSecret',
        message: 'Tigris Secret Access Key:',
        required: true,
      });
    }

    if (!endpoint) {
      questions.push({
        type: 'input',
        name: 'endpoint',
        message: 'Tigris Endpoint:',
        required: true,
        initial: DEFAULT_STORAGE_ENDPOINT,
      });
    }

    const responses = await prompt<{
      accessKey?: string;
      accessSecret?: string;
      endpoint?: string;
    }>(questions);

    accessKey = accessKey || responses.accessKey;
    accessSecret = accessSecret || responses.accessSecret;
    endpoint = endpoint || responses.endpoint;
  }

  // Validate that all required fields are present
  if (!accessKey || !accessSecret || !endpoint) {
    handleError({ message: 'All credentials are required' });
  }

  // Store credentials
  try {
    await storeCredentials({
      accessKeyId: accessKey as string,
      secretAccessKey: accessSecret as string,
      endpoint: endpoint as string,
    });

    // Store login method
    await storeLoginMethod('credentials');

    if (isJsonMode()) {
      jsonSuccess({ action: 'configured', endpoint: endpoint as string });
    } else {
      printSuccess(context);
    }
  } catch {
    handleError({ message: 'Failed to save credentials' });
  }
}
