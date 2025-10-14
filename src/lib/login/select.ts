import enquirer from 'enquirer';
const { prompt } = enquirer;
import { ui } from './ui.js';
import credentials from './credentials.js';

/**
 * Main login command - presents interactive selection between user and machine login
 */
export default async function login(options: Record<string, unknown>) {
  console.log('🔐 Tigris Login\n');

  try {
    const response = await prompt<{ loginType: string }>({
      type: 'select',
      name: 'loginType',
      message: 'How would you like to login?',
      choices: [
        { name: 'user', message: 'As a user (OAuth2 flow)', value: 'user' },
        {
          name: 'machine',
          message: 'As a machine (Access Key & Secret)',
          value: 'machine',
        },
      ],
    });

    if (response.loginType === 'user') {
      // Start UI flow
      await ui();
    } else {
      // Start machine/credentials flow with prompting
      await credentials(options);
    }
  } catch (error) {
    console.error('\n❌ Login cancelled');
    process.exit(1);
  }
}
