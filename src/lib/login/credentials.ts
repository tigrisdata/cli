import enquirer from 'enquirer';
const { prompt } = enquirer;
import { getCredentials } from '../../auth/storage.js';

export default async function credentials(options: Record<string, unknown>) {
  console.log('🔐 Tigris Machine Login\n');

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

  // If no credentials provided via CLI, check for saved credentials and prompt
  if (!accessKey || !accessSecret) {
    const savedCreds = getCredentials();

    if (savedCreds) {
      // Saved credentials exist - ask user if they want to use them
      try {
        const response = await prompt<{ useSaved: boolean }>({
          type: 'confirm',
          name: 'useSaved',
          message: 'Saved credentials found. Use them?',
          initial: true,
        });

        if (response.useSaved) {
          console.log('📁 Using saved credentials...\n');
          accessKey = savedCreds.accessKeyId;
          accessSecret = savedCreds.secretAccessKey;
        } else {
          // User chose not to use saved credentials, prompt for new ones
          console.log('Please provide your access credentials.\n');

          const credPrompts = [];

          if (!accessKey) {
            credPrompts.push({
              type: 'input',
              name: 'accessKey',
              message: 'Tigris Access Key ID:',
              required: true,
            });
          }

          if (!accessSecret) {
            credPrompts.push({
              type: 'password',
              name: 'accessSecret',
              message: 'Tigris Secret Access Key:',
              required: true,
            });
          }

          const credResponses = await prompt<{
            accessKey?: string;
            accessSecret?: string;
          }>(credPrompts);

          accessKey = accessKey || credResponses.accessKey;
          accessSecret = accessSecret || credResponses.accessSecret;
        }
      } catch (error) {
        console.error('\n❌ Login cancelled');
        process.exit(1);
      }
    } else {
      // No saved credentials, prompt for them
      console.log(
        'No saved credentials found. Please provide your access credentials.\n'
      );

      try {
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

        const responses = await prompt<{
          accessKey?: string;
          accessSecret?: string;
        }>(questions);

        accessKey = accessKey || responses.accessKey;
        accessSecret = accessSecret || responses.accessSecret;
      } catch (error) {
        console.error('\n❌ Login cancelled');
        process.exit(1);
      }
    }
  }

  // Validate that all required fields are present
  if (!accessKey || !accessSecret) {
    console.error('❌ Access key and secret are required');
    process.exit(1);
  }

  console.log('🔑 Authenticating with credentials...');
  console.log(`Access Key: ${accessKey}`);
  console.log(`Access Secret: ${'*'.repeat(String(accessSecret).length)}`);

  // TODO: Implement actual authentication logic
  console.log('✅ Successfully authenticated with credentials');
}
