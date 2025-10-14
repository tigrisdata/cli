import enquirer from 'enquirer';
const { prompt } = enquirer;
import { homedir } from 'os';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { chmod } from 'fs/promises';

interface CredentialsConfig {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
}

const CONFIG_DIR = join(homedir(), '.tigris');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');

/**
 * Ensure config directory exists with secure permissions
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Store credentials securely
 */
async function storeCredentials(credentials: CredentialsConfig): Promise<void> {
  ensureConfigDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
    mode: 0o600,
  });

  // Ensure file has restrictive permissions
  try {
    await chmod(CREDENTIALS_FILE, 0o600);
  } catch {
    // Ignore chmod errors on Windows
  }
}

export default async function configure(options: Record<string, unknown>) {
  console.log('🔐 Tigris Configuration\n');

  // Debug: log all options to see what's being passed
  // console.log('DEBUG: Options received:', JSON.stringify(options, null, 2));

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
    console.log(
      'Please provide your Tigris credentials. You can find these in your Tigris dashboard.\n'
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

      if (!endpoint) {
        questions.push({
          type: 'input',
          name: 'endpoint',
          message: 'Tigris Endpoint:',
          required: true,
          initial: 'https://t3.storage.dev',
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
    } catch (error) {
      console.error('\n❌ Configuration cancelled');
      process.exit(1);
    }
  }

  // Validate that all required fields are present
  if (!accessKey || !accessSecret || !endpoint) {
    console.error('❌ All credentials are required');
    process.exit(1);
  }

  // Store credentials
  try {
    await storeCredentials({
      accessKeyId: accessKey as string,
      secretAccessKey: accessSecret as string,
      endpoint: endpoint as string,
    });

    console.log('\n✅ Credentials saved successfully!');
    console.log(`📁 Configuration stored at: ${CREDENTIALS_FILE}`);
    console.log(
      '\n💡 You can now use Tigris CLI commands with these credentials.'
    );
  } catch (error) {
    console.error('❌ Failed to save credentials:', error);
    process.exit(1);
  }
}
